const path = require('path');
const EventEmitter = require('events');
const rread = require('readdir-recursive');
const Command = require('./Command');
const Inhibitor = require('./Inhibitor');

class CommandHandler extends EventEmitter {
    /**
     * Creates a new CommandHandler.
     * @param {Framework} framework The Akairo framework.
     */
    constructor(framework){
        super();

        /**
         * The Akairo framework.
         * @type {Framework}
         */
        this.framework = framework;

        /**
         * Directory to commands.
         * @type {string}
         */
        this.commandDirectory = path.resolve(this.framework.options.commandDirectory);

        /**
         * Directory to inhibitors.
         * @type {string}
         */
        this.inhibitorDirectory = path.resolve(this.framework.options.inhibitorDirectory);

        /**
         * Commands loaded, mapped by ID to Command.
         * @type {Map.<string, Command>}
         */
        this.commands = new Map();

        /**
         * Inhibitors loaded, mapped by ID to Inhibitor.
         * @type {Map.<string, Inhibitor>}
         */
        this.inhibitors = new Map();

        let cmdPaths = rread.fileSync(this.commandDirectory);
        cmdPaths.forEach(filepath => {
            this.loadCommand(filepath);
        });

        let inhibPaths = rread.fileSync(this.inhibitorDirectory);
        inhibPaths.forEach(filepath => {
            this.loadInhibitor(filepath);
        });
    }

    /**
     * Loads a Command.
     * @param {string} filepath Path to file.
     */
    loadCommand(filepath){
        let command = require(filepath);

        if (!(command instanceof Command)) return;
        if (this.commands.has(command.id)) throw new Error(`Command ${command.id} already loaded.`);

        command.filepath = filepath;
        command.framework = this.framework;
        command.commandHandler = this;

        this.commands.set(command.id, command);
    }

    /**
     * Adds a Command.
     * @param {string} filename Filename to lookup in the directory.
     */
    addCommand(filename){
        let files = rread.fileSync(this.commandDirectory);
        let filepath = files.find(file => file.endsWith(`${filename}`));

        if (!filepath){
            throw new Error(`File ${filename} not found.`);
        }

        this.loadCommand(filepath);
    }

    /**
     * Reloads a Command.
     * @param {string} id ID of the Command.
     */
    reloadCommand(id){
        let oldCommand = this.commands.get(id);
        if (!oldCommand) throw new Error(`Command ${id} does not exist.`);

        let filepath = oldCommand.filepath;

        delete require.cache[require.resolve(oldCommand.filepath)];
        this.commands.delete(oldCommand.id);
        
        this.loadCommand(filepath);
    }

    /**
     * Finds a command by alias.
     * @param {string} name Alias to find with.
     */
    findCommand(name){
        return Array.from(this.commands.values()).find(command => command.aliases.includes(name.toLowerCase()));
    }

    /**
     * Loads an Inhibitor.
     * @param {string} filepath Path to file.
     */
    loadInhibitor(filepath){
        let inhibitor = require(filepath);

        if (!(inhibitor instanceof Inhibitor)) return;
        if (this.inhibitors.has(inhibitor.id)) throw new Error(`Inhibitor ${inhibitor.id} already loaded.`);

        inhibitor.filepath = filepath;
        inhibitor.framework = this.framework;
        inhibitor.commandHandler = this;

        this.inhibitors.set(inhibitor.id, inhibitor);
    }

    /**
     * Adds an Inhibitor.
     * @param {string} filename Filename to lookup in the directory.
     */
    addInhibitor(filename){
        let files = rread.fileSync(this.inhibitorDirectory);
        let filepath = files.find(file => file.endsWith(`${filename}`));

        if (!filepath){
            throw new Error(`File ${filename} not found.`);
        }

        this.loadInhibitor(filepath);
    }

    /**
     * Reloads an Inhibitor.
     * @param {string} id ID of the Inhibitor.
     */
    reloadInhibitor(id){
        let oldInhibitor = this.inhibitors.get(id);
        if (!oldInhibitor) throw new Error(`Inhibitor ${id} does not exist.`);

        let filepath = oldInhibitor.filepath;

        delete require.cache[require.resolve(oldInhibitor.filepath)];
        this.inhibitors.delete(oldInhibitor.id);
        
        this.loadInhibitor(filepath);
    }

    /**
     * Handles a Message.
     * @param {Discord.Message} message Message to handle.
     * @param {string} prefix Prefix for command.
     * @param {boolean} allowMention Allow mentions to the client user as a prefix.
     */
    handle(message, prefix, allowMention){
        let start;

        if (message.content.startsWith(prefix)){
            start = prefix;
        } else
        if (allowMention && new RegExp(`^<@!?${this.framework.client.user.id}>`).test(message.content)){
            start = message.content.match(new RegExp(`^<@!?${this.framework.client.user.id}>`))[0];
        } else {
            return this.emit('commandPrefixInvalid', message);
        }

        let firstWord = message.content.replace(start, '').search(/\S/) + start.length;
        let name = message.content.slice(firstWord).split(' ')[0];
        let command = this.findCommand(name);

        if (!command) return this.emit('commandInvalid', message);

        if (message.author.id !== this.framework.client.user.id && this.framework.options.selfbot){
            return this.emit('commandBlocked', message, command, 'notSelf');
        }

        if (message.author.id === this.framework.client.user.id && !this.framework.options.selfbot){
            return this.emit('commandBlocked', message, command, 'client');
        }

        if (message.author.bot){
            return this.emit('commandBlocked', message, command, 'bot');
        }

        if (command.options.ownerOnly && message.author.id !== this.framework.options.ownerID){
            return this.emit('commandBlocked', message, command, 'owner');
        }

        if (command.options.channelRestriction === 'guild' && !message.guild){
            return this.emit('commandBlocked', message, command, 'guild');
        }

        if (command.options.channelRestriction === 'dm' && message.guild){
            return this.emit('commandBlocked', message, command, 'dm');
        }

        let results = [];

        this.inhibitors.forEach(inhibitor => {
            let inhibited = inhibitor.exec(message, command);

            if (inhibited instanceof Promise){
                return results.push(inhibited.catch(() => { throw inhibitor.reason; }));
            }

            if (!inhibited){
                return results.push(Promise.resolve());
            }

            results.push(Promise.reject(inhibitor.reason));
        });

        Promise.all(results).then(() => {
            let text = message.content.slice(message.content.indexOf(name) + name.length + 1);
            let words = [];

            const argSplit = {
                plain: text.match(/([^\s]+)/g),
                quoted: text.match(/"(.*?)"|("+?)|([^\s]+)/g)
            };
            
            words = argSplit[command.options.split] || argSplit.plain || [];

            let args = {};

            let wordArgs = command.args.filter(arg => !arg.parse || arg.parse === 'word');
            let prefixArgs = command.args.filter(arg => arg.parse === 'prefix' || arg.parse === 'flag');
            let textArgs = command.args.filter(arg => arg.parse === 'text');

            let prefixes = prefixArgs.map(arg => arg.prefix);
            let noPrefixWords = words.filter(w => !prefixes.some(p => w.startsWith(p)));

            wordArgs.forEach((arg, i) => {
                let word = noPrefixWords[i];
                if (!word) return args[arg.id] = arg.defaultValue;

                if (command.options.split === 'quoted' && /^".*"$/.test(word)) word = word.slice(1, -1);

                if ((arg.type === 'dynamic' || arg.type === 'number') && !isNaN(word)) word = parseInt(word);
                if (arg.type === 'number' && isNaN(word)) word = arg.defaultValue;

                args[arg.id] = word;
            });

            prefixArgs.forEach(arg => {
                if (arg.parse === 'flag'){
                    let word = words.find(w => w === arg.prefix);
                    return args[arg.id] = !!word;
                }

                let word = words.find(w => w.startsWith(arg.prefix));
                if (!word) return args[arg.id] = arg.defaultValue;

                word = word.replace(arg.prefix, '');

                if ((arg.type === 'dynamic' || arg.type === 'number') && !isNaN(word)) word = parseInt(word);
                if (arg.type === 'number' && isNaN(word)) word = arg.defaultValue;

                args[arg.id] = word;
            });

            textArgs.forEach(arg => {
                args[arg.id] = noPrefixWords.join(' ') || arg.defaultValue;
            });

            this.emit('commandStarted', message, command);
            let end = Promise.resolve(command.exec(message, args, text));

            end.then(() => {
                this.emit('commandFinished', message, command);
            }).catch(err => {
                this.emit('commandFinished', message, command);
                throw err;
            });
        }).catch(reason => {
            if (reason instanceof Error) throw reason;
            this.emit('commandBlocked', message, command, reason);
        });
    }
}

module.exports = CommandHandler;

/**
 * @event CommandHandler#commandPrefixInvalid
 * Emitted when a message does not start with the prefix.
 * @param {Discord.Message} message Message sent.
 */

/**
 * @event CommandHandler#commandInvalid
 * Emitted when a message does not match a command.
 * @param {Discord.Message} message Message sent.
 */

/**
 * @event CommandHandler#commandBlocked
 * Emitted when a command is blocked by an inhibitor.
 * @param {Discord.Message} message Message sent.
 * @param {Command} command Command blocked.
 * @param {string} reason Reason for the block.
 */

/**
 * @event CommandHandler#commandStarted
 * Emitted when a command starts execution.
 * @param {Discord.Message} message Message sent.
 * @param {Command} command Command executed.
 */

/**
 * @event CommandHandler#commandFinished
 * Emitted when a command finishes execution.
 * @param {Discord.Message} message Message sent.
 * @param {Command} command Command executed.
 */