const { Collection, MessageAttachment, MessageEmbed, Permissions } = require('discord.js');

/**
 * Client utilities to help with common tasks.
 * @param {AkairoClient} client - The client.
 */
class ClientUtil {
    constructor(client) {
        /**
         * The Akairo client.
         * @type {AkairoClient}
         */
        this.client = client;
    }

    /**
     * Resolves a user from a string, such as an ID, a name, or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, User>} users - Collection of users to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {User}
     */
    resolveUser(text, users, caseSensitive = false, wholeWord = false) {
        return users.get(text) || users.find(user => this.checkUser(text, user, caseSensitive, wholeWord));
    }

    /**
     * Resolves multiple users from a string, such as an ID, a name, or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, User>} users - Collection of users to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Collection<Snowflake, User>}
     */
    resolveUsers(text, users, caseSensitive = false, wholeWord = false) {
        return users.filter(user => this.checkUser(text, user, caseSensitive, wholeWord));
    }

    /**
     * Checks if a string could be referring to a user.
     * @param {string} text - Text to check.
     * @param {User} user - User to check.
     * @param {boolean} [caseSensitive=false] - Makes checking by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes checking by name match full word only.
     * @returns {boolean}
     */
    checkUser(text, user, caseSensitive = false, wholeWord = false) {
        if (user.id === text) return true;

        const reg = /<@!?(\d{17,19})>/;
        const match = text.match(reg);

        if (match && user.id === match[1]) return true;

        text = caseSensitive ? text : text.toLowerCase();
        const username = caseSensitive ? user.username : user.username.toLowerCase();
        const discrim = user.discriminator;

        if (!wholeWord) {
            return username.includes(text)
            || (username.includes(text.split('#')[0]) && discrim.includes(text.split('#')[1]));
        }

        return username === text
        || (username === text.split('#')[0] && discrim === text.split('#')[1]);
    }

    /**
     * Resolves a member from a string, such as an ID, a name, or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, GuildMember>} members - Collection of members to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {GuildMember}
     */
    resolveMember(text, members, caseSensitive = false, wholeWord = false) {
        return members.get(text) || members.find(member => this.checkMember(text, member, caseSensitive, wholeWord));
    }

    /**
     * Resolves multiple members from a string, such as an ID, a name, or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, GuildMember>} members - Collection of members to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Collection<Snowflake, GuildMember>}
     */
    resolveMembers(text, members, caseSensitive = false, wholeWord = false) {
        return members.filter(member => this.checkMember(text, member, caseSensitive, wholeWord));
    }

    /**
     * Checks if a string could be referring to a member.
     * @param {string} text - Text to check.
     * @param {GuildMember} member - Member to check.
     * @param {boolean} [caseSensitive=false] - Makes checking by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes checking by name match full word only.
     * @returns {boolean}
     */
    checkMember(text, member, caseSensitive = false, wholeWord = false) {
        if (member.id === text) return true;

        const reg = /<@!?(\d{17,19})>/;
        const match = text.match(reg);

        if (match && member.id === match[1]) return true;

        text = caseSensitive ? text : text.toLowerCase();
        const username = caseSensitive ? member.user.username : member.user.username.toLowerCase();
        const displayName = caseSensitive ? member.displayName : member.displayName.toLowerCase();
        const discrim = member.user.discriminator;

        if (!wholeWord) {
            return displayName.includes(text)
            || username.includes(text)
            || ((username.includes(text.split('#')[0]) || displayName.includes(text.split('#')[0])) && discrim.includes(text.split('#')[1]));
        }

        return displayName === text
        || username === text
        || ((username === text.split('#')[0] || displayName === text.split('#')[0]) && discrim === text.split('#')[1]);
    }

    /**
     * Resolves a channel from a string, such as an ID, a name, or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, Channel>} channels - Collection of channels to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Channel}
     */
    resolveChannel(text, channels, caseSensitive = false, wholeWord = false) {
        return channels.get(text) || channels.find(channel => this.checkChannel(text, channel, caseSensitive, wholeWord));
    }

    /**
     * Resolves multiple channels from a string, such as an ID, a name, or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, Channel>} channels - Collection of channels to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Collection<Snowflake, Channel>}
     */
    resolveChannels(text, channels, caseSensitive = false, wholeWord = false) {
        return channels.filter(channel => this.checkChannel(text, channel, caseSensitive, wholeWord));
    }

    /**
     * Checks if a string could be referring to a channel.
     * @param {string} text - Text to check.
     * @param {Channel} channel - Channel to check.
     * @param {boolean} [caseSensitive=false] - Makes checking by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes checking by name match full word only.
     * @returns {boolean}
     */
    checkChannel(text, channel, caseSensitive = false, wholeWord = false) {
        if (channel.id === text) return true;

        const reg = /<#(\d{17,19})>/;
        const match = text.match(reg);

        if (match && channel.id === match[1]) return true;

        text = caseSensitive ? text : text.toLowerCase();
        const name = caseSensitive ? channel.name : channel.name.toLowerCase();

        if (!wholeWord) {
            return name.includes(text)
            || name.includes(text.replace(/^#/, ''));
        }

        return name === text
        || name === text.replace(/^#/, '');
    }

    /**
     * Resolves a role from a string, such as an ID, a name, or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, Role>} roles - Collection of roles to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Role}
     */
    resolveRole(text, roles, caseSensitive = false, wholeWord = false) {
        return roles.get(text) || roles.find(role => this.checkRole(text, role, caseSensitive, wholeWord));
    }

    /**
     * Resolves multiple roles from a string, such as an ID, a name, or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, Role>} roles - Collection of roles to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Collection<Snowflake, Role>}
     */
    resolveRoles(text, roles, caseSensitive = false, wholeWord = false) {
        return roles.filter(role => this.checkRole(text, role, caseSensitive, wholeWord));
    }

    /**
     * Checks if a string could be referring to a role.
     * @param {string} text - Text to check.
     * @param {Role} role - Role to check.
     * @param {boolean} [caseSensitive=false] - Makes checking by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes checking by name match full word only.
     * @returns {boolean}
     */
    checkRole(text, role, caseSensitive = false, wholeWord = false) {
        if (role.id === text) return true;

        const reg = /<@&(\d{17,19})>/;
        const match = text.match(reg);

        if (match && role.id === match[1]) return true;

        text = caseSensitive ? text : text.toLowerCase();
        const name = caseSensitive ? role.name : role.name.toLowerCase();

        if (!wholeWord) {
            return name.includes(text)
            || name.includes(text.replace(/^@/, ''));
        }

        return name === text
        || name === text.replace(/^@/, '');
    }

    /**
     * Resolves a custom emoji from a string, such as a name or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, Emoji>} emojis - Collection of emojis to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Emoji}
     */
    resolveEmoji(text, emojis, caseSensitive = false, wholeWord = false) {
        return emojis.get(text) || emojis.find(emoji => this.checkEmoji(text, emoji, caseSensitive, wholeWord));
    }

    /**
     * Resolves multiple custom emojis from a string, such as a name or a mention.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, Emoji>} emojis - Collection of emojis to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Collection<Snowflake, Emoji>}
     */
    resolveEmojis(text, emojis, caseSensitive = false, wholeWord = false) {
        return emojis.filter(emoji => this.checkEmoji(text, emoji, caseSensitive, wholeWord));
    }

    /**
     * Checks if a string could be referring to a emoji.
     * @param {string} text - Text to check.
     * @param {Emoji} emoji - Emoji to check.
     * @param {boolean} [caseSensitive=false] - Makes checking by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes checking by name match full word only.
     * @returns {boolean}
     */
    checkEmoji(text, emoji, caseSensitive = false, wholeWord = false) {
        if (emoji.id === text) return true;

        const reg = /<a?:[a-zA-Z0-9_]+:(\d{17,19})>/;
        const match = text.match(reg);

        if (match && emoji.id === match[1]) return true;

        text = caseSensitive ? text : text.toLowerCase();
        const name = caseSensitive ? emoji.name : emoji.name.toLowerCase();

        if (!wholeWord) {
            return name.includes(text)
            || name.includes(text.replace(/:/, ''));
        }

        return name === text
        || name === text.replace(/:/, '');
    }

    /**
     * Resolves a guild from a string, such as an ID or a name.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, Guild>} guilds - Collection of guilds to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Guild}
     */
    resolveGuild(text, guilds, caseSensitive = false, wholeWord = false) {
        return guilds.get(text) || guilds.find(guild => this.checkGuild(text, guild, caseSensitive, wholeWord));
    }

    /**
     * Resolves multiple guilds from a string, such as an ID or a name.
     * @param {string} text - Text to resolve.
     * @param {Collection<Snowflake, Guild>} guilds - Collection of guilds to find in.
     * @param {boolean} [caseSensitive=false] - Makes finding by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes finding by name match full word only.
     * @returns {Collection<Snowflake, Guild>}
     */
    resolveGuilds(text, guilds, caseSensitive = false, wholeWord = false) {
        return guilds.filter(guild => this.checkGuild(text, guild, caseSensitive, wholeWord));
    }

    /**
     * Checks if a string could be referring to a guild.
     * @param {string} text - Text to check.
     * @param {Guild} guild - Guild to check.
     * @param {boolean} [caseSensitive=false] - Makes checking by name case sensitive.
     * @param {boolean} [wholeWord=false] - Makes checking by name match full word only.
     * @returns {boolean}
     */
    checkGuild(text, guild, caseSensitive = false, wholeWord = false) {
        if (guild.id === text) return true;

        text = caseSensitive ? text : text.toLowerCase();
        const name = caseSensitive ? guild.name : guild.name.toLowerCase();

        if (!wholeWord) return name.includes(text);
        return name === text;
    }

    /**
     * Array of permission names.
     * @returns {string[]}
     */
    permissionNames() {
        return Object.keys(Permissions.FLAGS);
    }

    /**
     * Resolves a permission number and returns an array of permission names.
     * @param {number} number - The permissions number.
     * @returns {string[]}
     */
    resolvePermissionNumber(number) {
        const resolved = [];

        for (const key of Object.keys(Permissions.FLAGS)) {
            if (number & Permissions.FLAGS[key]) resolved.push(key);
        }

        return resolved;
    }

    /**
     * Compares two member objects presences and checks if they stopped or started a stream or not.
     * Returns `0`, `1`, or `2` for no change, stopped, or started.
     * @param {GuildMember} oldMember - The old member.
     * @param {GuildMember} newMember - The new member.
     * @returns {number}
     */
    compareStreaming(oldMember, newMember) {
        const s1 = oldMember.presence.activity && oldMember.presence.activity.type === 'STREAMING';
        const s2 = newMember.presence.activity && newMember.presence.activity.type === 'STREAMING';
        if (s1 === s2) return 0;
        if (s1) return 1;
        if (s2) return 2;
        return 0;
    }

    /**
     * Combination of `<Client>.users.fetch()` and `<Guild>.members.fetch()`.
     * @param {Guild} guild - Guild to fetch in.
     * @param {string} id - ID of the user.
     * @param {boolean} cache - Whether or not to add to cache.
     * @returns {Promise<GuildMember>}
     */
    async fetchMember(guild, id, cache) {
        const user = await this.client.users.fetch(id, cache);
        return guild.members.fetch(user, cache);
    }

    /**
     * Makes a MessageEmbed.
     * @param {Object} [data] - Embed data.
     * @returns {MessageEmbed}
     */
    embed(data) {
        return new MessageEmbed(data);
    }

    /**
     * Makes a MessageAttachment.
     * @param {BufferResolvable|Stream} file - The file.
     * @param {string} [name] - The filename.
     * @returns {MessageAttachment}
     */
    attachment(file, name) {
        return new MessageAttachment(file, name);
    }

    /**
     * Makes a Collection.
     * @param {Iterable} [iterable] - Entries to fill with.
     * @returns {Collection}
     */
    collection(iterable) {
        return new Collection(iterable);
    }
}

module.exports = ClientUtil;
