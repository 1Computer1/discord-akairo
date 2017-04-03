/**
 * Extra properties applied to the Discord.js message object.
 * @typedef {Object} Message
 * @prop {?CommandUtil} util - Utilities for command responding.
 * Only available in command-related functions as a parameter.
 * Not available in regex/conditional commands as those can be ran at the same time.
 */

class CommandUtil {
    /**
     * Command utilies.
     * @param {AkairoClient} client - The Akairo client.
     * @param {Message} message - Message that triggered the command.
     * @param {Command} command - Command triggered.
     * @param {string} prefix - Prefix used to trigger.
     * @param {string} alias - Alias used to trigger.
     */
    constructor(client, message, command, prefix, alias) {
        /**
         * The Akairo client.
         * @readonly
         * @name CommandUtil#client
         * @type {AkairoClient}
         */
        Object.defineProperties(this, {
            client: {
                value: client
            }
        });

        /**
         * Message that triggered the command.
         * @type {Message}
         */
        this.message = message;

        /**
         * Command used.
         * @type {Command}
         */
        this.command = command;

        /**
         * The prefix used.
         * @type {string}
         */
        this.prefix = prefix;

        /**
         * The alias used.
         * @type {string}
         */
        this.alias = alias;

        /**
         * Whether or not the last response should be edited.
         * @type {boolean}
         */
        this.shouldEdit = false;

         /**
          * The last response sent.
          * @type {?Message}
         */
        this.lastResponse = null;
    }

    /**
     * Sets the last repsonse.
     * @param {Message|Message[]} message - Message to set.
     * @returns {void}
     */
    setLastResponse(message) {
        if (!this.handler.handleEdits || !this.command.editable) return;

        if (Array.isArray(message)) {
            this.lastResponse = message.slice(-1)[0];
        } else {
            this.lastResponse = message;
        }
    }

    /**
     * Sends a response or edits an old response if available.
     * @param {string|MessageOptions} content - Content to send.
     * @param {MessageOptions} [options] - Options to use.
     * @returns {Promise<Message|Message[]>}
     */
    send(content, options) {
        [content, options] = this.constructor.swapOptions(content, options);

        if (this.shouldEdit && (this.command ? this.command.editable : true) && (!options.file || this.lastResponse.attachments.size)) {
            return this.lastResponse.edit(content, options);
        }

        return this.message.channel.send(content, options).then(sent => {
            if (options.file) return sent;
            if (this.lastResponse && this.lastResponse.attachments.size) return sent;

            this.shouldEdit = true;
            this.setLastResponse(sent);
            return sent;
        });
    }

    /**
     * Sends a response with a mention concantenated to it.
     * @param {string|MessageOptions} content - Content to send.
     * @param {MessageOptions} [options] - Options to use.
     * @returns {Promise<Message|Message[]>}
     */
    reply(content, options) {
        if (this.message.channel.type !== 'dm') content = `${this.message.author}, ${content}`;
        return this.send(content, options);
    }

    /**
     * Swaps and cleans up content and options.
     * @param {string|MessageOptions} content - Content to send.
     * @param {MessageOptions} [options] - Options to use.
     * @returns {Array}
     */
    static swapOptions(content, options) {
        if (!options && typeof content === 'object' && !(content instanceof Array)) {
            options = content;
            content = '';
        } else if (!options) {
            options = {};
        }

        if (!options.embed) options.embed = null;
        return [content, options];
    }
}

module.exports = CommandUtil;
