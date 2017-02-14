const { Client } = require('discord.js');
const CommandHandler = require('./CommandHandler');
const InhibitorHandler = require('./InhibitorHandler');
const ListenerHandler = require('./ListenerHandler');
const ClientUtil = require('../utils/ClientUtil');

/**
 * Options used to determine how the framework behaves.
 * @typedef {Object} AkairoOptions
 * @prop {string|string[]} [ownerID=''] - Discord ID of the client owner(s).
 * @prop {boolean} [selfbot=false] - Marks this bot as a selfbot.
 * @prop {string} [commandDirectory] - Directory to commands.
 * @prop {string|string[]|function} [prefix='!'] - Default command prefix(es) or function <code>(message => {})</code> returning prefix(es).
 * @prop {boolean|function} [allowMention=true] - Allow mentions to the client user as a prefix or function <code>(message => {})</code> that returns true or false.
 * @prop {string} [inhibitorDirectory] - Directory to inhibitors.
 * @prop {boolean} [preInhibitors=false] - Disables the built-in pre-message inhibitors.
 * @prop {boolean} [postInhibitors=false] - Disables the built-in post-message inhibitors.
 * @prop {string} [listenerDirectory] - Directory to listeners.
 * @prop {Object} [emitters={}] - Emitters to load onto the listener handler.
 */

class AkairoClient extends Client {
    /**
     * The Akairo framework client.<br/>Creates the handlers and sets them up.
     * @param {AkairoOptions} [options={}] - Options to use for the framework.
     * @param {ClientOptions} [clientOptions] - Options for Discord JS client.<br/>If not specified, the previous options parameter is used instead.
     */
    constructor(options = {}, clientOptions){
        super(clientOptions || options);

        /**
         * The ID of the owner.
         * @type {string}
         */
        this.ownerID = options.ownerID;

        /**
         * Whether or not this is a selfbot.
         * @type {boolean}
         */
        this.selfbot = !!options.selfbot;

        /**
         * Utility methods.
         * @name AkairoClient#util
         * @type {ClientUtil}
         */
        Object.defineProperty(this, 'util', {
            value: new ClientUtil(this)
        });

        if (options.commandDirectory){
            /**
             * The command handler.
             * @readonly
             * @name AkairoClient#commandHandler
             * @type {CommandHandler}
             */
            Object.defineProperty(this, 'commandHandler', {
                value: new CommandHandler(this, options)
            });
        }

        if (options.inhibitorDirectory){
            /**
             * The inhibitor handler.
             * @readonly
             * @name AkairoClient#inhibitorHandler
             * @type {InhibitorHandler}
             */
            Object.defineProperty(this, 'inhibitorHandler', {
                value: new InhibitorHandler(this, options)
            });
        }

        if (options.listenerDirectory){
            /**
             * The listener handler.
             * @readonly
             * @name AkairoClient#listenerHandler
             * @type {ListenerHandler}
             */
            Object.defineProperty(this, 'listenerHandler', {
                value: new ListenerHandler(this, options)
            });
        }

        /**
         * Databases added.
         * @type {Object}
         */
        this.databases = {};
    }

    /**
     * Adds a database that will be initialized once ready.
     * @param {string} name - Name of database.
     * @param {SQLiteHandler} database - The database.
     */
    addDatabase(name, database){
        Object.defineProperty(this.databases, name, {
            value: database
        });
    }

    /**
     * Logins the client, creates message listener, and init databases.<br/>Resolves once client is ready.
     * @param {string} token - Client token.
     * @returns {Promise}
     */
    login(token){
        return new Promise((resolve, reject) => {
            super.login(token).catch(reject);
            this.once('ready', () => {
                const promises = Object.keys(this.databases).map(key => {
                    const ids = this.databases[key].init(this);
                    this.databases[key].load(ids);
                });

                Promise.all(promises).then(() => resolve()).catch(reject);
            });

            if (this.commandHandler) this.on('message', m => {
                this.commandHandler.handle(m).catch(console.error);
            });
        });
    }
}

module.exports = AkairoClient;
