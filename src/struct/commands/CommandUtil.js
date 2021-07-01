const { Collection } = require('discord.js');

/**
 * Command utilities.
 * @param {CommandHandler} handler - The command handler.
 * @param {Message} message - Message that triggered the command.
 */
class CommandUtil {
    constructor(handler, message) {
        /**
         * The command handler.
         * @type {CommandHandler}
         */
        this.handler = handler;

        /**
         * Message that triggered the command.
         * @type {Message}
         */
        this.message = message;

        /**
         * The parsed components.
         * @type {?ParsedComponentData}
         */
        this.parsed = null;

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

        if (this.handler.storeMessages) {
            /**
             * Messages stored from prompts and prompt replies.
             * @type {Collection<Snowflake, Message>}
             */
            this.messages = new Collection();
        } else {
            this.messages = null;
        }
    }

    /**
     * Sets the last repsonse.
     * @param {Message|Message[]} message - Message to set.
     * @returns {Message}
     */
    setLastResponse(message) {
        if (Array.isArray(message)) {
            this.lastResponse = message.slice(-1)[0];
        } else {
            this.lastResponse = message;
        }

        return this.lastResponse;
    }

    /**
     * Adds client prompt or user reply to messages.
     * @param {Message|Message[]} message - Message to add.
     * @returns {Message|Message[]}
     */
    addMessage(message) {
        if (this.handler.storeMessages) {
            if (Array.isArray(message)) {
                for (const msg of message) {
                    this.messages.set(msg.id, msg);
                }
            } else {
                this.messages.set(message.id, message);
            }
        }

        return message;
    }

    /**
     * Changes if the message should be edited.
     * @param {boolean} state - Change to editable or not.
     * @returns {CommandUtil}
     */
    setEditable(state) {
        this.shouldEdit = Boolean(state);
        return this;
    }

    /**
     * Sends a response or edits an old response if available.
     * @param {string|MessageOptions} [options={}] - Options to use.
     * @returns {Promise<Message|Message[]>}
     */
    async send(options) {
        const transformedOptions = this.constructor.transformOptions(options);
        const hasFiles = transformedOptions.files && transformedOptions.files.length > 0;
        if (this.shouldEdit && (this.command ? this.command.editable : true) && !hasFiles && !this.lastResponse.deleted && !this.lastResponse.attachments.size) {
            return this.lastResponse.edit(transformedOptions);
        }

        const sent = await this.message.channel.send(transformedOptions);
        const lastSent = this.setLastResponse(sent);
        this.setEditable(!lastSent.attachments.size);
        return sent;
    }

    /**
     * Sends a response, overwriting the last response.
     * @param {string|MessageOptions} [options={}] - Options to use.
     * @returns {Promise<Message|Message[]>}
     */
    async sendNew(options) {
        const sent = await this.message.channel.send(this.constructor.transformOptions(options));
        const lastSent = this.setLastResponse(sent);
        this.setEditable(!lastSent.attachments.size);
        return sent;
    }

    /**
     * Sends a response replying to the user's message.
     * @param {string|MessageOptions} [options={}] - Options to use.
     * @returns {Promise<Message|Message[]>}
     */
    reply(options) {
        return this.send({
            reply: { messageReference: this.message, failIfNotExists: false },
            ...this.constructor.transformOptions(options)
        });
    }

    /**
     * Edits the last response.
     * @param {string|MessageEditOptions} [options={}] - Options to use.
     * @returns {Promise<Message>}
     */
    edit(options) {
        return this.lastResponse.edit(options);
    }

    /**
     * Transform options for sending.
     * @param {string|MessageOptions} [options={}] - Options to use.
     * @returns {MessageOptions}
     */
    static transformOptions(options) {
        const transformedOptions = typeof options === 'string' ? { content: options } : { ...options };
        if (!transformedOptions.content) transformedOptions.content = null;
        if (!transformedOptions.embeds) transformedOptions.embeds = [];
        return transformedOptions;
    }
}

module.exports = CommandUtil;

/**
 * Extra properties applied to the Discord.js message object.
 * @typedef {Object} MessageExtensions
 * @prop {?CommandUtil} util - Utilities for command responding.
 * Available on all messages after 'all' inhibitors and built-in inhibitors (bot, client).
 * Not all properties of the util are available, depending on the input.
 */
