const { ArgumentTypes, TimeUnits } = require('../../../util/Constants');
const { Collection } = require('discord.js');
const { URL } = require('url');

/**
 * Type resolver for command arguments.
 * The types are documented under ArgumentType.
 * @param {CommandHandler} handler - The command handler.
 */
class TypeResolver {
    constructor(handler) {
        /**
         * The Akairo client.
         * @type {AkairoClient}
         */
        this.client = handler.client;

        /**
         * The command handler.
         * @type {CommandHandler}
         */
        this.commandHandler = handler;

        /**
         * The inhibitor handler.
         * @type {InhibitorHandler}
         */
        this.inhibitorHandler = null;

        /**
         * The listener handler.
         * @type {ListenerHandler}
         */
        this.listenerHandler = null;

        /**
         * Collection of types.
         * @type {Collection<string, ArgumentTypeCaster>}
         */
        this.types = new Collection();

        this.addBuiltInTypes();
    }

    /**
     * Adds built-in types.
     * @returns {void}
     */
    addBuiltInTypes() {
        const builtins = {
            [ArgumentTypes.STRING]: (message, phrase) => {
                return phrase || null;
            },

            [ArgumentTypes.LOWERCASE]: (message, phrase) => {
                return phrase ? phrase.toLowerCase() : null;
            },

            [ArgumentTypes.UPPERCASE]: (message, phrase) => {
                return phrase ? phrase.toUpperCase() : null;
            },

            [ArgumentTypes.CHAR_CODES]: (message, phrase) => {
                if (!phrase) return null;
                const codes = [];
                for (const char of phrase) codes.push(char.charCodeAt(0));
                return codes;
            },

            [ArgumentTypes.NUMBER]: (message, phrase) => {
                if (!phrase || isNaN(phrase)) return null;
                return parseFloat(phrase);
            },

            [ArgumentTypes.INTEGER]: (message, phrase) => {
                if (!phrase || isNaN(phrase)) return null;
                return parseInt(phrase);
            },

            [ArgumentTypes.BIGINT]: (message, phrase) => {
                if (!phrase || isNaN(phrase)) return null;
                return BigInt(phrase); // eslint-disable-line no-undef, new-cap
            },

            // Just for fun.
            [ArgumentTypes.EMOJINT]: (message, phrase) => {
                if (!phrase) return null;
                const n = phrase.replace(/0⃣|1⃣|2⃣|3⃣|4⃣|5⃣|6⃣|7⃣|8⃣|9⃣|🔟/g, m => {
                    return ['0⃣', '1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟'].indexOf(m);
                });

                if (isNaN(n)) return null;
                return parseInt(n);
            },

            [ArgumentTypes.URL]: (message, phrase) => {
                if (!phrase) return null;
                if (/^<.+>$/.test(phrase)) phrase = phrase.slice(1, -1);

                try {
                    return new URL(phrase);
                } catch (err) {
                    return null;
                }
            },

            [ArgumentTypes.DATE]: (message, phrase) => {
                if (!phrase) return null;
                const timestamp = Date.parse(phrase);
                if (isNaN(timestamp)) return null;
                return new Date(timestamp);
            },

            [ArgumentTypes.COLOR]: (message, phrase) => {
                if (!phrase) return null;

                const color = parseInt(phrase.replace('#', ''), 16);
                if (color < 0 || color > 0xFFFFFF || isNaN(color)) {
                    return null;
                }

                return color;
            },

            [ArgumentTypes.TIMESPAN]: (message, phrase) => {
                if (!phrase) return null;

                const regexString = Object.entries(TimeUnits).map(([name, { label }]) => String.raw`(?:(?<${name}>-?(?:\d+)?\.?\d+) *${label})?`).join('\\s*');
                const match = new RegExp(`^${regexString}$`, 'i').exec(phrase);
                if (!match) return null;

                let milliseconds = 0;
                for (const key in match.groups) {
                    const value = Number(match.groups[key] || 0);
                    milliseconds += value * TimeUnits[key].value;
                }

                return milliseconds;
            },

            [ArgumentTypes.USER]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveUser(phrase, this.client.users.cache);
            },

            [ArgumentTypes.USERS]: (message, phrase) => {
                if (!phrase) return null;
                const users = this.client.util.resolveUsers(phrase, this.client.users.cache);
                return users.size ? users : null;
            },

            [ArgumentTypes.MEMBER]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveMember(phrase, message.guild.members.cache);
            },

            [ArgumentTypes.MEMBERS]: (message, phrase) => {
                if (!phrase) return null;
                const members = this.client.util.resolveMembers(phrase, message.guild.members.cache);
                return members.size ? members : null;
            },

            [ArgumentTypes.RELEVANT]: (message, phrase) => {
                if (!phrase) return null;

                const person = message.channel.type === 'GUILD_TEXT'
                    ? this.client.util.resolveMember(phrase, message.guild.members.cache)
                    : message.channel.type === 'DM'
                        ? this.client.util.resolveUser(phrase, new Collection([
                            [message.channel.recipient.id, message.channel.recipient],
                            [this.client.user.id, this.client.user]
                        ]))
                        : this.client.util.resolveUser(phrase, new Collection([
                            [this.client.user.id, this.client.user]
                        ]).concat(message.channel.recipients));

                if (!person) return null;
                if (message.channel.type === 'GUILD_TEXT') return person.user;
                return person;
            },

            [ArgumentTypes.RELEVANTS]: (message, phrase) => {
                if (!phrase) return null;

                const persons = message.channel.type === 'GUILD_TEXT'
                    ? this.client.util.resolveMembers(phrase, message.guild.members.cache)
                    : message.channel.type === 'DM'
                        ? this.client.util.resolveUsers(phrase, new Collection([
                            [message.channel.recipient.id, message.channel.recipient],
                            [this.client.user.id, this.client.user]
                        ]))
                        : this.client.util.resolveUsers(phrase, new Collection([
                            [this.client.user.id, this.client.user]
                        ]).concat(message.channel.recipients));

                if (!persons.size) return null;

                if (message.channel.type === 'GUILD_TEXT') {
                    return persons.map(member => member.user);
                }

                return persons;
            },

            [ArgumentTypes.CHANNEL]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveChannel(phrase, message.guild.channels.cache);
            },

            [ArgumentTypes.CHANNELS]: (message, phrase) => {
                if (!phrase) return null;
                const channels = this.client.util.resolveChannels(phrase, message.guild.channels.cache);
                return channels.size ? channels : null;
            },

            [ArgumentTypes.TEXT_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;

                const channel = this.client.util.resolveChannel(phrase, message.guild.channels.cache);
                if (!channel || channel.type !== 'GUILD_TEXT') return null;

                return channel;
            },

            [ArgumentTypes.TEXT_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;

                const channels = this.client.util.resolveChannels(phrase, message.guild.channels.cache);
                if (!channels.size) return null;

                const textChannels = channels.filter(c => c.type === 'GUILD_TEXT');
                return textChannels.size ? textChannels : null;
            },

            [ArgumentTypes.VOICE_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;

                const channel = this.client.util.resolveChannel(phrase, message.guild.channels.cache);
                if (!channel || channel.type !== 'GUILD_VOICE') return null;

                return channel;
            },

            [ArgumentTypes.VOICE_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;

                const channels = this.client.util.resolveChannels(phrase, message.guild.channels.cache);
                if (!channels.size) return null;

                const voiceChannels = channels.filter(c => c.type === 'GUILD_VOICE');
                return voiceChannels.size ? voiceChannels : null;
            },

            [ArgumentTypes.CATEGORY_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;

                const channel = this.client.util.resolveChannel(phrase, message.guild.channels.cache);
                if (!channel || channel.type !== 'GUILD_CATEGORY') return null;

                return channel;
            },

            [ArgumentTypes.CATEGORY_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;

                const channels = this.client.util.resolveChannels(phrase, message.guild.channels.cache);
                if (!channels.size) return null;

                const categoryChannels = channels.filter(c => c.type === 'GUILD_CATEGORY');
                return categoryChannels.size ? categoryChannels : null;
            },

            [ArgumentTypes.NEWS_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;

                const channel = this.client.util.resolveChannel(phrase, message.guild.channels.cache);
                if (!channel || channel.type !== 'GUILD_NEWS') return null;

                return channel;
            },

            [ArgumentTypes.NEWS_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;

                const channels = this.client.util.resolveChannels(phrase, message.guild.channels.cache);
                if (!channels.size) return null;

                const newsChannels = channels.filter(c => c.type === 'GUILD_NEWS');
                return newsChannels.size ? newsChannels : null;
            },

            [ArgumentTypes.STORE_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;

                const channel = this.client.util.resolveChannel(phrase, message.guild.channels.cache);
                if (!channel || channel.type !== 'GUILD_STORE') return null;

                return channel;
            },

            [ArgumentTypes.STORE_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;

                const channels = this.client.util.resolveChannels(phrase, message.guild.channels.cache);
                if (!channels.size) return null;

                const storeChannels = channels.filter(c => c.type === 'GUILD_STORE');
                return storeChannels.size ? storeChannels : null;
            },

            [ArgumentTypes.ROLE]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveRole(phrase, message.guild.roles.cache);
            },

            [ArgumentTypes.ROLES]: (message, phrase) => {
                if (!phrase) return null;
                const roles = this.client.util.resolveRoles(phrase, message.guild.roles.cache);
                return roles.size ? roles : null;
            },

            [ArgumentTypes.EMOJI]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveEmoji(phrase, message.guild.emojis.cache);
            },

            [ArgumentTypes.EMOJIS]: (message, phrase) => {
                if (!phrase) return null;
                const emojis = this.client.util.resolveEmojis(phrase, message.guild.emojis.cache);
                return emojis.size ? emojis : null;
            },

            [ArgumentTypes.GUILD]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveGuild(phrase, this.client.guilds.cache);
            },

            [ArgumentTypes.GUILDS]: (message, phrase) => {
                if (!phrase) return null;
                const guilds = this.client.util.resolveGuilds(phrase, this.client.guilds.cache);
                return guilds.size ? guilds : null;
            },

            [ArgumentTypes.MESSAGE]: (message, phrase) => {
                if (!phrase) return null;
                return message.channel.messages.fetch(phrase).catch(() => null);
            },

            [ArgumentTypes.GUILD_MESSAGE]: async (message, phrase) => {
                if (!phrase) return null;
                for (const channel of message.guild.channels.cache.values()) {
                    if (channel.type !== 'GUILD_TEXT') continue;
                    try {
                        return await channel.messages.fetch(phrase);
                    } catch (err) {
                        if (/^Invalid Form Body/.test(err.message)) return null;
                    }
                }

                return null;
            },

            [ArgumentTypes.RELEVANT_MESSAGE]: async (message, phrase) => {
                if (!phrase) return null;
                const hereMsg = await message.channel.messages.fetch(phrase).catch(() => null);
                if (hereMsg) {
                    return hereMsg;
                }

                if (message.guild) {
                    for (const channel of message.guild.channels.cache.values()) {
                        if (channel.type !== 'GUILD_TEXT') continue;
                        try {
                            return await channel.messages.fetch(phrase);
                        } catch (err) {
                            if (/^Invalid Form Body/.test(err.message)) return null;
                        }
                    }
                }

                return null;
            },

            [ArgumentTypes.INVITE]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.fetchInvite(phrase).catch(() => null);
            },

            [ArgumentTypes.USER_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const id = phrase.match(/<@!?(\d{17,19})>/);
                if (!id) return null;
                return this.client.users.cache.get(id[1]) || null;
            },

            [ArgumentTypes.MEMBER_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const id = phrase.match(/<@!?(\d{17,19})>/);
                if (!id) return null;
                return message.guild.members.cache.get(id[1]) || null;
            },

            [ArgumentTypes.CHANNEL_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const id = phrase.match(/<#(\d{17,19})>/);
                if (!id) return null;
                return message.guild.channels.cache.get(id[1]) || null;
            },

            [ArgumentTypes.ROLE_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const id = phrase.match(/<@&(\d{17,19})>/);
                if (!id) return null;
                return message.guild.roles.cache.get(id[1]) || null;
            },

            [ArgumentTypes.EMOJI_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const id = phrase.match(/<a?:[a-zA-Z0-9_]+:(\d{17,19})>/);
                if (!id) return null;
                return message.guild.emojis.cache.get(id[1]) || null;
            },

            [ArgumentTypes.COMMAND_ALIAS]: (message, phrase) => {
                if (!phrase) return null;
                return this.commandHandler.findCommand(phrase) || null;
            },

            [ArgumentTypes.COMMAND]: (message, phrase) => {
                if (!phrase) return null;
                return this.commandHandler.modules.get(phrase) || null;
            },

            [ArgumentTypes.INHIBITOR]: (message, phrase) => {
                if (!phrase) return null;
                return this.inhibitorHandler.modules.get(phrase) || null;
            },

            [ArgumentTypes.LISTENER]: (message, phrase) => {
                if (!phrase) return null;
                return this.listenerHandler.modules.get(phrase) || null;
            }
        };

        for (const [key, value] of Object.entries(builtins)) {
            this.types.set(key, value);
        }
    }

    /**
     * Gets the resolver function for a type.
     * @param {string} name - Name of type.
     * @returns {ArgumentTypeCaster}
     */
    type(name) {
        return this.types.get(name);
    }

    /**
     * Adds a new type.
     * @param {string} name - Name of the type.
     * @param {ArgumentTypeCaster} fn - Function that casts the type.
     * @returns {TypeResolver}
     */
    addType(name, fn) {
        this.types.set(name, fn);
        return this;
    }

    /**
     * Adds multiple new types.
     * @param {Object} types  - Object with keys as the type name and values as the cast function.
     * @returns {TypeResolver}
     */
    addTypes(types) {
        for (const [key, value] of Object.entries(types)) {
            this.addType(key, value);
        }

        return this;
    }
}

module.exports = TypeResolver;
