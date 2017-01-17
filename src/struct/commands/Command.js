/**
 * An argument in a command.
 * @typedef {Object} Argument
 * @prop {string} id - ID of the argument.
 * @prop {string} [match='word'] - Method to match argument: 'word', 'prefix', 'flag', 'text', or 'content'. Word matches by the order of the words inputted. Prefix and flag ignores order and uses the value after the prefix (if prefix) or true/false (if flag). Text and content retrieves everything after the command, with the difference being that text ignores prefixes. Note that if the command's split type is plain or quote, text will also not have extra whitespace.
 * @prop {(string|string[]|function)} [type='string'] - Attempts to cast input to this type: 'string', 'number', 'integer', or 'dynamic'. String does not care about type. Number and integer attempts to parse the input to a number or an integer and if it is NaN, it will use the default value. Dynamic defaults to a string, but will parse to number if it is not NaN. An array can be used to only allow those inputs (case-insensitive strings). A function can be used to verify a word however you like.
 * @prop {(string|string[])} [prefix] - Ignores word order and uses a word that starts with/matches this prefix (or multiple prefixes if array). Applicable to 'prefix' and 'flag' only.
 * @prop {number} [index] - Word to start from. Applicable to 'word', 'text', or 'content' only. When using with word, this will offset all word arguments after it by 1 unless the index property is also specified for them.
 * @prop {(string|number)} [defaultValue=''] - Default value if a word is not inputted.
 * @prop {string} [description=''] - A description of the argument.
 * @prop {string} [formatted] - A formatted string for the argument, automatically made if not defined.
 */

/**
 * Options to use for command execution behavior.
 * @typedef {Object} CommandOptions
 * @prop {string} [category=''] - Command category for organization purposes.
 * @prop {string} [description=''] - Description of the command.
 * @prop {boolean} [ownerOnly=false] - Allow client owner only.
 * @prop {string} [channelRestriction='none'] - Restricts channel: 'guild' or 'dm'.
 * @prop {string} [split='plain'] - Method to divide text into words: 'plain', 'split', or 'quoted'. Plain splits by space and ignores extra whitespace between words, while split is just split(' '). Quoted does the same as plain, but counts text in double quotes as one word.
 */

class Command {
    /**
     * Creates a new Command.
     * @param {string} id - Command ID.
     * @param {string[]} aliases - Names to call the command with.
     * @param {Argument[]} args - Arguments for the command.
     * @param {function} exec - Function called when command is ran. (message, args)
     * @param {CommandOptions} options - Options for the command.
     */
    constructor(id, aliases = [], args = [], exec, options = {}){
        /**
         * ID of the Command.
         * @type {string}
         */
        this.id = id;

        /**
         * Command names.
         * @type {string[]}
         */
        this.aliases = aliases;

        /**
         * Arguments for the command.
         * @type {Argument[]}
         */
        this.args = args;
        this.args.forEach(arg => {
            if (arg.match === undefined) arg.match = 'word';
            if (arg.type === undefined) arg.type = 'string';
            if (arg.defaultValue === undefined) arg.defaultValue = '';
            if (arg.description === undefined) arg.description = '';
            if (arg.formatted === undefined){
                let res = arg.id;

                if (arg.match === 'flag'){
                    res = arg.prefix;
                } else
                if (arg.match === 'prefix'){
                    res = `${arg.prefix}${arg.id}`;
                } else
                if (arg.match === 'text' || arg.match === 'content'){
                    res = `${arg.id}...`;
                }

                if (arg.defaultValue) res = `[${res}]`;
                arg.formatted = res;
            }
        });

        /**
         * Function called for command.
         * @type {function}
         */
        this.exec = exec;

        /**
         * CommandOptions.
         * @type {CommandOptions}
         */
        this.options = options;
        if (this.options.category === undefined) this.options.category = '';
        if (this.options.description === undefined) this.options.description = '';
        if (this.options.ownerOnly === undefined) this.options.ownerOnly = false;
        if (this.options.channelRestriction === undefined) this.options.channelRestriction = 'none';
        if (this.options.split === undefined) this.options.split = 'plain';

        /**
         * Path to Command file.
         * @readonly
         * @type {string}
         */
        this.filepath = null;

        /**
         * The Akairo framework.
         * @readonly
         * @type {Framework}
         */
        this.framework = null;

        /** 
         * The Discord.js client. 
         * @readonly
         * @type {Client}
         */
        this.client = null;

        /**
         * The command handler.
         * @readonly
         * @type {CommandHandler}
         */
        this.commandHandler = null;
    }

    /**
     * Reloads the Command.
     */
    reload(){
        this.commandHandler.reloadCommand(this.id);
    }

    /**
     * Removes the Command. It can be readded with the command handler.
     */
    remove(){
        this.commandHandler.removeCommand(this.id);
    }

    /**
     * Parses text based on this Command's args.
     * @param {string} content - String to parse.
     * @returns {Object}
     */
    parse(content){
        let words = [];
        const argSplit = {
            plain: content.match(/[^\s]+/g),
            split: content.split(' '),
            quoted: content.match(/".*?"|[^\s"]+|"/g)
        };
        
        words = argSplit[this.options.split] || [];

        let args = {};

        let wordArgs = this.args.filter(arg => arg.match === 'word');
        let prefixArgs = this.args.filter(arg => arg.match === 'prefix');
        let flagArgs = this.args.filter(arg => arg.match === 'flag');
        let textArgs = this.args.filter(arg => arg.match === 'text');
        let contentArgs = this.args.filter(arg => arg.match === 'content');

        let prefixes = [];
        [...prefixArgs, ...flagArgs].forEach(arg => {
            Array.isArray(arg.prefix) ? prefixes.push(...arg.prefix) : prefixes.push(arg.prefix);
        });

        let noPrefixWords = words.filter(w => !prefixes.some(p => w.startsWith(p))); 

        wordArgs.forEach((arg, i) => {
            let word = noPrefixWords[arg.index !== undefined ? arg.index : i];
            if (!word) return args[arg.id] = arg.defaultValue;

            if (this.options.split === 'quoted' && /^".*"$/.test(word)) word = word.slice(1, -1);

            if (isNaN(word) && (arg.type === 'number' || arg.type === 'integer')){
                word = arg.defaultValue;
            } else
            if (arg.type === 'dynamic' || arg.type === 'number'){
                word = parseFloat(word);
            } else
            if (arg.type === 'integer'){
                word = parseInt(word);
            } else
            if (Array.isArray(arg.type)){
                if (!arg.type.some(t => t.toLowerCase() === word.toLowerCase())){
                    word = arg.defaultValue;
                } else {
                    word = word.toLowerCase();
                }
            } else 
            if (typeof arg.type === 'function'){
                if (!arg.type(word)) word = arg.defaultValue;
            }

            args[arg.id] = word;
        });

        words.reverse();

        prefixArgs.forEach(arg => {
            let word = words.find(w => Array.isArray(arg.prefix) ? arg.prefix.some(p => w.startsWith(p)) : w.startsWith(arg.prefix));
            if (!word) return args[arg.id] = arg.defaultValue;

            word = word.replace(prefixes.find(p => word.startsWith(p)), '');

            if (isNaN(word) && (arg.type === 'number' || arg.type === 'integer')){
                word = arg.defaultValue;
            } else
            if (arg.type === 'dynamic' || arg.type === 'number'){
                word = parseFloat(word);
            } else
            if (arg.type === 'integer'){
                word = parseInt(word);
            } else
            if (Array.isArray(arg.type)){
                if (!arg.type.some(t => t.toLowerCase() === word.toLowerCase())){
                    word = arg.defaultValue;
                } else {
                    word = word.toLowerCase();
                }
            } else 
            if (typeof arg.type === 'function'){
                if (!arg.type(word)) word = arg.defaultValue;
            }

            args[arg.id] = word;
        });

        flagArgs.forEach(arg => {    
            let word = words.find(w => Array.isArray(arg.prefix) ? arg.prefix.some(p => w === p) : w === arg.prefix);
            return args[arg.id] = !!word;
        });

        textArgs.forEach(arg => {
            args[arg.id] = noPrefixWords.slice(arg.index).join(' ') || arg.defaultValue;
        });

        contentArgs.forEach(arg => {
            args[arg.id] = content.split(' ').slice(arg.index).join(' ') || arg.defaultValue;
        });

        return args;
    }

    /**
     * Returns the ID.
     * @returns {string}
     */
    toString(){
        return this.id;
    }
}

module.exports = Command;