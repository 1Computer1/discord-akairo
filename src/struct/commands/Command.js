/**
 * An argument in a command.
 * @typedef {Object} Argument
 * @prop {string} id - ID of the argument.
 * @prop {string} [parse='word'] - Method to parse argument: 'word', 'prefix', 'flag', 'text', or 'content'. Word parses by the order of the words inputted. Prefix and flag ignores order and uses the value after the prefix (if prefix) or true/false (if flag). Text and content retrieves everything after the command, with the difference being that text ignores prefixes. Note that if the command's split type is plain or quote, text will also not have extra whitespace.
 * @prop {string} [type='string'] - Attempts to cast input to this type: 'string', 'number', or 'dynamic'. String does not care about type. Number attempts to parse the input to a number and if it is NaN, it will use the default value. Dynamic defaults to a string, but will parse to number if it is not NaN. 
 * @prop {string} [prefix] - Ignores word order and uses a word that starts with/matches this prefix. Applicable to 'prefix' and 'flag' only.
 * @prop {number} [index] - Word to start from. Applicable to 'word', 'text', or 'content' only. When using with word, this will offset all word arguments after it by 1, so you will have to include an index property for those.
 * @prop {(string|number)} [defaultValue=''] - Default value if a word is not inputted.
 */

/**
 * Options to use for command execution behavior.
 * @typedef {Object} CommandOptions
 * @prop {string} [category=''] - Command category for organization purposes.
 * @prop {boolean} [ownerOnly=false] - Allow client owner only.
 * @prop {string} [channelRestriction='none'] - Restricts channel: 'guild' or 'dm'.
 * @prop {string} [split='plain'] - Method to divide text into words: 'plain', 'plainW', 'quoted' or 'quotedW'. Plain splits by space and ignores extra whitespace between words. Quoted does the same, but counts text in double quotes as one word. The W (whitespace) variant of each does not ignore extra whitespace.
 */

class Command {
    /**
     * Creates a new Command.
     * @param {string} id - Command ID.
     * @param {Array.<string>} aliases - Names to call the command with.
     * @param {Array.<Argument>} args - Arguments for the command.
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
         * @type {Array.<string>}
         */
        this.aliases = aliases;

        /**
         * Arguments for the command.
         * @type {Array.<Argument>}
         */
        this.args = args;
        this.args.forEach(arg => {
            if (arg.parse === undefined) arg.parse = 'word';
            if (arg.type === undefined) arg.type = 'string';
            if (arg.defaultValue === undefined) arg.defaultValue = '';
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
        if (this.options.ownerOnly === undefined) this.options.ownerOnly = false;
        if (this.options.channelRestriction === undefined) this.options.channelRestriction = 'none';
        if (this.options.split === undefined) this.options.split = 'plain';

        /**
         * Path to Command file.
         * @type {string}
         */
        this.filepath = null;

        /**
         * The Akairo framework.
         * @type {Framework}
         */
        this.framework = null;

        /**
         * The command handler.
         * @type {CommandHandler}
         */
        this.commandHandler = null;
    }

    /**
     * Gets an example of the command using all arguments or one text argument.
     * @type {string}
     */
    get example(){
        if (this.args.length === 1 && (this.args[0].parse === 'text' || this.args[0].parse === 'content')){
            return `${this.aliases[0]} ${this.args[0].id}`;
        }

        let args = this.args.filter(arg => arg.parse !== 'text' && arg.parse !== 'content').map(arg => {
            if (arg.parse === 'flag') return arg.prefix;
            if (arg.parse === 'prefix') return `${arg.prefix}${arg.id}`;
            return arg.id;
        });

        return `${this.aliases[0]} ${args.join(' ')}`;
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
            plainW: content.match(/[^\s]+|\s/g),
            quoted: content.match(/".*?"|[^\s"]+|"/g),
            quotedW: content.match(/".*?"|[^\s"]+|"|\s/g)
        };
        
        words = argSplit[this.options.split] || [];

        let args = {};

        let wordArgs = this.args.filter(arg => arg.parse === 'word');
        let prefixArgs = this.args.filter(arg => arg.parse === 'prefix');
        let flagArgs = this.args.filter(arg => arg.parse === 'flag');
        let textArgs = this.args.filter(arg => arg.parse === 'text');
        let contentArgs = this.args.filter(arg => arg.parse === 'content');

        let prefixes = prefixArgs.map(arg => arg.prefix);
        let noPrefixWords = words.filter(w => !prefixes.some(p => w.startsWith(p)));

        wordArgs.forEach((arg, i) => {
            let word = noPrefixWords[arg.index !== undefined ? arg.index : i];
            if (!word) return args[arg.id] = arg.defaultValue;

            if (this.options.split === 'quoted' && /^".*"$/.test(word)) word = word.slice(1, -1);

            if ((arg.type === 'dynamic' || arg.type === 'number') && !isNaN(word)) word = new Number(word);
            if (arg.type === 'number' && isNaN(word)) word = arg.defaultValue;

            args[arg.id] = word;
        });

        words.reverse();

        prefixArgs.forEach(arg => {
            let word = words.find(w => w.startsWith(arg.prefix));
            if (!word) return args[arg.id] = arg.defaultValue;

            word = word.replace(arg.prefix, '');

            if ((arg.type === 'dynamic' || arg.type === 'number') && !isNaN(word)) word = new Number(word);
            if (arg.type === 'number' && isNaN(word)) word = arg.defaultValue;

            args[arg.id] = word;
        });

        flagArgs.forEach(arg => {    
            let word = words.find(w => w === arg.prefix);
            return args[arg.id] = !!word;
        });

        textArgs.forEach(arg => {
            let text = noPrefixWords.slice(arg.index);

            if (this.options.split.endsWith('W')){
                text = text.join('');
            } else {
                text = text.join(' ');
            }

            args[arg.id] = text || arg.defaultValue;
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