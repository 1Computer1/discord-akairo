const AkairoHandler = require('./AkairoHandler');
const Command = require('./Command');
const TypeResolver = require('../util/TypeResolver');
const { CommandHandlerEvents, BuiltInReasons } = require('../util/Constants');
const { Collection } = require('discord.js');

/** @extends AkairoHandler */
class CommandHandler extends AkairoHandler {
    /**
     * Loads commands and handles messages.
     * @param {AkairoClient} client - The Akairo client.
     * @param {Object} options - Options from client.
     */
    constructor(client, options = {}) {
        super(client, options.commandDirectory, Command);

        /**
         * The type resolver.
         * @type {TypeResolver}
         */
        this.resolver = new TypeResolver(client);

        /**
         * Whether or not to block others, if a selfbot.
         * @type {boolean}
         */
        this.blockNotSelf = !(options.blockNotSelf === false);

        /**
         * Whether or not to block self, if not a selfbot.
         * @type {boolean}
         */
        this.blockClient = !(options.blockClient === false);

        /**
         * Whether or not to block bots.
         * @type {boolean}
         */
        this.blockBots = !(options.blockBots === false);

        /**
         * Whether or not edits are handled.
         * @type {boolean}
         */
        this.handleEdits = !!options.handleEdits;

        /**
         * Whether or not fetchMember is used on each message author from a guild.
         * @type {boolean}
         */
        this.fetchMembers = !!options.fetchMember;

        /**
         * Collection of cooldowns.
         * @type {Collection<string, Object>}
         */
        this.cooldowns = new Collection();

        /**
         * Collection of sets of ongoing argument prompts.
         * @type {Collection<string, Set>}
         */
        this.prompts = new Collection();

        /**
         * Default prompt options.
         * @type {PromptOptions}
         */
        this.defaultPrompt = Object.assign({
            start: function start(m) {
                return `${m.author}, what ${this.type} would you like to use?\n${this.description || ''}`;
            },
            retry: function retry(m) {
                return `${m.author}, you need to input a valid ${this.type}!`;
            },
            timeout: 'time ran out for command.',
            ended: 'retries limit reached for command.\nCommand has been cancelled.',
            cancel: 'command has been cancelled.',
            retries: 1,
            time: 30000,
            cancelWord: 'cancel',
            stopWord: 'stop',
            optional: false,
            infinite: false
        }, options.defaultPrompt || {});

        /**
         * Default cooldown for commands.
         * @type {number}
         */
        this.defaultCooldown = options.defaultCooldown || 0;

        /**
         * Gets the prefix.
         * @method
         * @param {Message} message - Message being handled.
         * @returns {string}
         */
        this.prefix = typeof options.prefix === 'function' ? options.prefix : () => options.prefix;

        /**
         * Gets if mentions are allowed for prefixing.
         * @method
         * @param {Message} message - Message being handled.
         * @returns {boolean}
         */
        this.allowMention = typeof options.allowMention === 'function' ? options.allowMention : () => options.allowMention;

        /**
         * Directory to commands.
         * @readonly
         * @name CommandHandler#directory
         * @type {string}
         */

        /**
         * Commands loaded, mapped by ID to Command.
         * @name CommandHandler#modules
         * @type {Collection<string, Command>}
         */
    }

    /**
     * Reads modules and loads them.
     * @private
     * @returns {void}
     */
    _read() {
        /**
         * Collecion of command aliases.
         * @type {Collection<string, string>}
         */
        this.aliases = new Collection();

        /**
         * Set of prefix overwrites.
         * @type {Set<string|string[]|Function>}
         */
        this.prefixes = new Set();

        super._read();
    }

    /**
     * Registers a module.
     * @private
     * @param {Command} command - Module to use.
     * @param {string} [filepath] - Filepath of module.
     * @returns {void}
     */
    _apply(command, filepath) {
        super._apply(command, filepath);
        this._addAliases(command);
    }

    /**
     * Deregisters a module.
     * @private
     * @param {Command} command - Module to use.
     * @returns {void}
     */
    _unapply(command) {
        this._removeAliases(command);
        super._unapply(command);
    }

    /**
     * Adds aliases of a command.
     * @private
     * @param {Command} command - Command to use.
     * @returns {void}
     */
    _addAliases(command) {
        for (const alias of command.aliases) {
            const conflict = this.aliases.get(alias.toLowerCase());
            if (conflict) throw new Error(`Alias ${alias} of ${command.id} already exists on ${conflict}.`);

            this.aliases.set(alias.toLowerCase(), command.id);
        }

        if (command.prefix != null) this.prefixes.add(command.prefix);
    }

    /**
     * Removes aliases of a command.
     * @private
     * @param {Command} command - Command to use.
     * @returns {void}
     */
    _removeAliases(command) {
        for (const alias of command.aliases) this.aliases.delete(alias.toLowerCase());
        if (command.prefix != null) this.prefixes.delete(command.prefix);
    }

    /**
     * Finds a command by alias.
     * @param {string} name - Alias to find with.
     * @returns {Command}
     */
    findCommand(name) {
        return this.modules.get(this.aliases.get(name.toLowerCase()));
    }

    /**
     * Adds an ongoing prompt in order to prevent command usage in the channel.
     * @param {Message} message - Message to use.
     * @returns {void}
     */
    addPrompt(message) {
        let channels = this.prompts.get(message.author.id);
        if (!channels) this.prompts.set(message.author.id, new Set());
        channels = this.prompts.get(message.author.id);

        channels.add(message.channel.id);
    }

    /**
     * Removes an ongoing prompt.
     * @param {Message} message - Message to use.
     * @returns {void}
     */
    removePrompt(message) {
        const channels = this.prompts.get(message.author.id);
        if (!channels) return;

        channels.delete(message.channel.id);

        if (!channels.size) this.prompts.delete(message.author.id);
    }

    /**
     * Checks if there is an ongoing prompt.
     * @param {Message} message - Message to use.
     * @returns {boolean}
     */
    hasPrompt(message) {
        const channels = this.prompts.get(message.author.id);
        if (!channels) return false;

        return channels.has(message.channel.id);
    }

    /**
     * Handles a message.
     * @param {Message} message - Message to handle.
     * @param {boolean} edited - Whether or not the message was edited.
     * @returns {Promise<void>}
     */
    handle(message, edited) {
        const allTest = this.client.inhibitorHandler
        ? this.client.inhibitorHandler.test('all', message)
        : Promise.resolve();

        return allTest.then(() => {
            if (this.blockNotSelf && message.author.id !== this.client.user.id && this.client.selfbot) {
                this.emit(CommandHandlerEvents.MESSAGE_BLOCKED, message, BuiltInReasons.NOT_SELF);
                return undefined;
            }

            if (this.blockClient && message.author.id === this.client.user.id && !this.client.selfbot) {
                this.emit(CommandHandlerEvents.MESSAGE_BLOCKED, message, BuiltInReasons.CLIENT);
                return undefined;
            }

            if (this.blockBots && message.author.bot) {
                this.emit(CommandHandlerEvents.MESSAGE_BLOCKED, message, BuiltInReasons.BOT);
                return undefined;
            }

            const preTest = this.client.inhibitorHandler
            ? this.client.inhibitorHandler.test('pre', message)
            : Promise.resolve();

            return preTest.then(() => {
                if (this.hasPrompt(message)) {
                    this.emit(CommandHandlerEvents.IN_PROMPT, message);
                    return undefined;
                }

                const parsed = this._parseCommand(message, edited);
                if (!parsed) return this._handleTriggers(message, edited);

                const { command, content } = parsed;

                if (!command.enabled) {
                    this.emit(CommandHandlerEvents.COMMAND_DISABLED, message, command);
                    return undefined;
                }

                if (edited && !command.editable) return undefined;

                if (command.ownerOnly) {
                    const notOwner = Array.isArray(this.client.ownerID)
                    ? !this.client.ownerID.includes(message.author.id)
                    : message.author.id !== this.client.ownerID;

                    if (notOwner) {
                        this.emit(CommandHandlerEvents.COMMAND_BLOCKED, message, command, BuiltInReasons.OWNER);
                        return undefined;
                    }
                }

                if (command.channelRestriction === 'guild' && !message.guild) {
                    this.emit(CommandHandlerEvents.COMMAND_BLOCKED, message, command, BuiltInReasons.GUILD);
                    return undefined;
                }

                if (command.channelRestriction === 'dm' && message.guild) {
                    this.emit(CommandHandlerEvents.COMMAND_BLOCKED, message, command, BuiltInReasons.DM);
                    return undefined;
                }

                const postTest = this.client.inhibitorHandler
                ? this.client.inhibitorHandler.test('post', message, command)
                : Promise.resolve();

                return postTest.then(() => {
                    const onCooldown = this._handleCooldowns(message, command);
                    if (onCooldown) return undefined;

                    const fetch = this.fetchMembers
                    ? message.guild
                    ? message.guild.fetchMember(message.author)
                    : Promise.resolve()
                    : Promise.resolve();

                    return fetch.then(member => {
                        if (member) message.member = member;
                        return command.parse(content, message);
                    }).then(args => {
                        if (command.typing) message.channel.startTyping();
                        this.emit(CommandHandlerEvents.COMMAND_STARTED, message, command, edited);
                        return Promise.resolve(command.exec(message, args, edited));
                    }).then(() => {
                        this.emit(CommandHandlerEvents.COMMAND_FINISHED, message, command, edited);
                        if (command.typing) message.channel.stopTyping();
                    });
                }).catch(reason => {
                    if (command.typing) message.channel.stopTyping();

                    if (reason == null) return;
                    if (reason instanceof Error) {
                        this._handleError(reason, message, command);
                        return;
                    }

                    this.emit(CommandHandlerEvents.COMMAND_BLOCKED, message, command, reason);
                });
            });
        }).catch(reason => {
            if (reason == null) return;
            if (reason instanceof Error) {
                this._handleError(reason, message);
                return;
            }

            this.emit(CommandHandlerEvents.MESSAGE_BLOCKED, message, reason);
        });
    }

    /**
     * Parses the command and its argument list.
     * @private
     * @param {Message} message - Message that called the command.
     * @returns {Object}
     */
    _parseCommand(message) {
        let prefix = this.prefix(message);

        if (this.allowMention(message)) {
            prefix = Array.isArray(prefix)
            ? [`<@${this.client.user.id}>`, `<@!${this.client.user.id}>`, ...prefix]
            : [`<@${this.client.user.id}>`, `<@!${this.client.user.id}>`, prefix];
        }

        let start;
        let overwrote;

        if (Array.isArray(prefix)) {
            const match = prefix.find(p => {
                return message.content.toLowerCase().startsWith(p.toLowerCase());
            });

            start = match;
        } else
        if (message.content.toLowerCase().startsWith(prefix.toLowerCase())) {
            start = prefix;
        }

        for (const ovPrefix of this.prefixes.keys()) {
            const commandPrefix = typeof ovPrefix === 'function' ? ovPrefix.call(this, message) : ovPrefix;

            if (Array.isArray(commandPrefix)) {
                const match = commandPrefix.find(p => {
                    return message.content.toLowerCase().startsWith(p.toLowerCase());
                });

                if (match) {
                    overwrote = { start };
                    start = match;
                    break;
                }

                continue;
            }

            if (message.content.toLowerCase().startsWith(commandPrefix.toLowerCase())) {
                overwrote = { start };
                start = commandPrefix;
                break;
            }
        }

        if (start == null) return null;

        const startRegex = new RegExp(start.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'), 'i'); // eslint-disable-line no-useless-escape
        const firstWord = message.content.replace(startRegex, '').search(/\S/) + start.length;
        const name = message.content.slice(firstWord).split(/\s{1,}|\n{1,}/)[0];
        const command = this.findCommand(name);

        if (!command) return null;
        if (overwrote == null && command.prefix != null) return null;

        if (overwrote != null) {
            if (command.prefix == null) {
                if (overwrote.start !== start) return null;
            } else {
                const commandPrefix = typeof command.prefix === 'function' ? command.prefix.call(this, message) : command.prefix;

                if (Array.isArray(commandPrefix)) {
                    if (!commandPrefix.some(p => p.toLowerCase() === start.toLowerCase())) {
                        return null;
                    }
                } else
                if (commandPrefix.toLowerCase() !== start.toLowerCase()) {
                    return null;
                }
            }
        }

        const content = message.content.slice(message.content.indexOf(name) + name.length + 1);
        return { command, content };
    }

    /**
     * Handles cooldowns and checks if a user is under cooldown.
     * @private
     * @param {Message} message - Message that called the command.
     * @param {Command} command - Command to cooldown.
     * @returns {boolean}
     */
    _handleCooldowns(message, command) {
        if (!command.cooldown) return false;

        const id = message.author.id;
        if (!this.cooldowns.has(id)) this.cooldowns.set(id, {});

        const time = command.cooldown || this.defaultCooldown;
        const endTime = message.createdTimestamp + time;

        if (!this.cooldowns.get(id)[command.id]) {
            this.cooldowns.get(id)[command.id] = {
                timer: this.client.setTimeout(() => {
                    this.client.clearTimeout(this.cooldowns.get(id)[command.id].timer);
                    this.cooldowns.get(id)[command.id] = null;

                    if (!Object.keys(this.cooldowns.get(id)).length) {
                        this.cooldowns.delete(id);
                    }
                }, time),
                end: endTime,
                uses: 0
            };
        }

        const entry = this.cooldowns.get(id)[command.id];

        if (entry.uses >= command.ratelimit) {
            const end = this.cooldowns.get(message.author.id)[command.id].end;
            const diff = end - message.createdTimestamp;

            this.emit(CommandHandlerEvents.COMMAND_COOLDOWN, message, command, diff);
            return true;
        }

        entry.uses++;
        return false;
    }

    /**
     * Handles regex and conditional commands.
     * @private
     * @param {Message} message - Message to handle.
     * @param {boolean} edited - Whether or not the message was edited.
     * @returns {Promise<void>}
     */
    _handleTriggers(message, edited) {
        const matchedCommands = [];

        for (const command of this.modules.values()) {
            if ((edited ? command.editable : true) && command.enabled) {
                const regex = command.trigger(message);
                if (regex) matchedCommands.push({ command, regex });
            }
        }

        const triggered = [];

        for (const entry of matchedCommands) {
            const match = message.content.match(entry.regex);
            if (!match) continue;

            const groups = [];

            if (entry.regex.global) {
                let group;

                while ((group = entry.regex.exec(message.content)) != null) {
                    groups.push(group);
                }
            }

            triggered.push({ command: entry.command, match, groups });
        }

        return Promise.all(triggered.map(entry => {
            const postTest = this.client.inhibitorHandler
            ? this.client.inhibitorHandler.test('post', message, entry.command)
            : Promise.resolve();

            return postTest.then(() => {
                const onCooldown = this._handleCooldowns(message, entry.command);
                if (onCooldown) return undefined;

                const fetch = this.fetchMembers
                ? message.guild
                ? message.guild.fetchMember(message.author)
                : Promise.resolve()
                : Promise.resolve();

                return fetch.then(member => {
                    if (member) message.member = member;
                    if (entry.command.typing) message.channel.startTyping();

                    this.emit(CommandHandlerEvents.COMMAND_STARTED, message, entry.command);
                    return Promise.resolve(entry.command.exec(message, entry.match, entry.groups, edited));
                }).then(() => {
                    this.emit(CommandHandlerEvents.COMMAND_FINISHED, message, entry.command);
                    if (entry.command.typing) message.channel.stopTyping();
                });
            }).catch(reason => {
                if (entry.command.typing) message.channel.stopTyping();

                if (reason == null) return;
                if (reason instanceof Error) {
                    this._handleError(reason, message, entry.command);
                    return;
                }

                this.emit(CommandHandlerEvents.COMMAND_BLOCKED, message, entry.command, reason);
            });
        })).then(() => {
            const trueCommands = this.modules.filter(command => (edited ? command.editable : true) && command.enabled && command.condition(message));

            if (!trueCommands.size) {
                this.emit(CommandHandlerEvents.MESSAGE_INVALID, message);
                return undefined;
            }

            return Promise.all(trueCommands.map(command => {
                const postTest = this.client.inhibitorHandler
                ? this.client.inhibitorHandler.test('post', message, command)
                : Promise.resolve();

                return postTest.then(() => {
                    const onCooldown = this._handleCooldowns(message, command);
                    if (onCooldown) return undefined;

                    const fetch = this.fetchMembers
                    ? message.guild
                    ? message.guild.fetchMember(message.author)
                    : Promise.resolve()
                    : Promise.resolve();

                    return fetch.then(member => {
                        if (member) message.member = member;
                        if (command.typing) message.channel.startTyping();

                        this.emit(CommandHandlerEvents.COMMAND_STARTED, message, command);
                        return Promise.resolve(command.exec(message, edited));
                    }).then(() => {
                        this.emit(CommandHandlerEvents.COMMAND_FINISHED, message, command);
                        if (command.typing) message.channel.stopTyping();
                    });
                }).catch(reason => {
                    if (command.typing) message.channel.stopTyping();

                    if (reason == null) return;
                    if (reason instanceof Error) {
                        this._handleError(reason, message, command);
                        return;
                    }

                    this.emit(CommandHandlerEvents.COMMAND_BLOCKED, message, command, reason);
                });
            }));
        });
    }

    /**
     * Handles errors from the handling.
     * @private
     * @param {Error} err - The error.
     * @param {Message} message - Message that called the command.
     * @param {Command} [command] - Command that errored.
     * @returns {void}
     */
    _handleError(err, message, command) {
        if (this.listenerCount(CommandHandlerEvents.ERROR)) {
            this.emit(CommandHandlerEvents.ERROR, err, message, command);
            return;
        }

        throw err;
    }

    /**
     * Loads a command.
     * @method
     * @name CommandHandler#load
     * @param {string|Command} thing - Module or path to module.
     * @returns {Command}
     */

    /**
     * Adds a command.
     * @method
     * @name CommandHandler#add
     * @param {string} filename - Filename to lookup in the directory.
     * <br>A .js extension is assumed.
     * @returns {Command}
     */

    /**
     * Removes a command.
     * @method
     * @name CommandHandler#remove
     * @param {string} id - ID of the command.
     * @returns {Command}
     */

    /**
     * Reloads a command.
     * @method
     * @name CommandHandler#reload
     * @param {string} id - ID of the command.
     * @returns {Command}
     */

    /**
     * Reloads all commands.
     * @method
     * @name CommandHandler#reloadAll
     * @returns {CommandHandler}
     */
}

module.exports = CommandHandler;

/**
 * Emitted when a message is blocked by a pre-message inhibitor.
 * <br>The built-in inhibitors are 'notSelf' (for selfbots), 'client', and 'bot'.
 * @event CommandHandler#messageBlocked
 * @param {Message} message - Message sent.
 * @param {string} reason - Reason for the block.
 */

/**
 * Emitted when a message does not start with the prefix or match a command.
 * @event CommandHandler#messageInvalid
 * @param {Message} message - Message sent.
 */

/**
 * Emitted when a command is found disabled.
 * @event CommandHandler#commandDisabled
 * @param {Message} message - Message sent.
 * @param {Command} command - Command found.
 */

/**
 * Emitted when a command is blocked by a post-message inhibitor.
 * <br>The built-in inhibitors are 'owner', 'guild', and 'dm'.
 * @event CommandHandler#commandBlocked
 * @param {Message} message - Message sent.
 * @param {Command} command - Command blocked.
 * @param {string} reason - Reason for the block.
 */

/**
 * Emitted when a command is found on cooldown.
 * @event CommandHandler#commandCooldown
 * @param {Message} message - Message sent.
 * @param {Command} command - Command blocked.
 * @param {number} remaining - Remaining time in milliseconds for cooldown.
 */

/**
 * Emitted when a command starts execution.
 * @event CommandHandler#commandStarted
 * @param {Message} message - Message sent.
 * @param {Command} command - Command executed.
 * @param {boolean} edited - Whether or not the command came from an edited message.
 */

/**
 * Emitted when a command finishes execution.
 * @event CommandHandler#commandFinished
 * @param {Message} message - Message sent.
 * @param {Command} command - Command executed.
 * @param {boolean} edited - Whether or not the command came from an edited message.
 */

/**
 * Emitted when a user is in a command argument prompt.
 * <br>Used to prevent usage of commands during a prompt.
 * @event CommandHandler#inPrompt
 * @param {Message} message - Message sent.
 */

/**
 * Emitted when a command or inhibitor errors.
 * @event CommandHandler#error
 * @param {Error} error - The error.
 * @param {Message} message - Message sent.
 * @param {?Command} command - Command executed.
 */

/**
 * Emitted when a command is loaded.
 * @event CommandHandler#load
 * @param {Command} command - Module loaded.
 */

/**
 * Emitted when a command is added.
 * @event CommandHandler#add
 * @param {Command} command - Command added.
 */

/**
 * Emitted when a command is removed.
 * @event CommandHandler#remove
 * @param {Command} command - Command removed.
 */

/**
 * Emitted when a command is reloaded.
 * @event CommandHandler#reload
 * @param {Command} command - Command reloaded.
 */

/**
 * Emitted when a command is enabled.
 * @event CommandHandler#enable
 * @param {Command} command - Command enabled.
 */

/**
 * Emitted when a command is disabled.
 * @event CommandHandler#disable
 * @param {Command} command - Command disabled.
 */
