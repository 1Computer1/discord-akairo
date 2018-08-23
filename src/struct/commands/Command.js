const AkairoError = require('../../util/AkairoError');
const AkairoModule = require('../AkairoModule');
const ArgumentParser = require('./arguments/ArgumentParser');
const ContentParser = require('./arguments/ContentParser');

/** @extends AkairoModule */
class Command extends AkairoModule {
    /**
     * Creates a new command.
     * @param {string} id - Command ID.
     * @param {CommandOptions} [options={}] - Options for the command.
     */
    constructor(id, options = {}) {
        super(id, { category: options.category });

        const {
            aliases = [],
            args = this.args || [],
            quoted = true,
            separator,
            channel = null,
            ownerOnly = false,
            editable = true,
            typing = false,
            cooldown = null,
            ratelimit = 1,
            defaultPrompt = {},
            description = '',
            prefix = this.prefix,
            clientPermissions = this.clientPermissions,
            userPermissions = this.userPermissions,
            regex = this.regex,
            condition = this.condition || (() => false),
            before = this.before || (() => undefined),
            ignoreCooldown,
            ignorePermissions
        } = options;

        /**
         * Command names.
         * @type {string[]}
         */
        this.aliases = aliases;

        /**
         * The content parser.
         * @type {ContentParser}
         */
        this.parser = null;
        if (typeof args !== 'function') {
            const flags = ArgumentParser.getFlags(args);
            this.parser = new ContentParser({
                flagWords: flags.flagWords,
                optionFlagWords: flags.optionFlagWords,
                quoted,
                separator
            });
        }

        /**
         * The argument parser.
         * @type {ArgumentParser|ArgumentProvider}
         */
        this.args = typeof args === 'function' ? args.bind(this) : new ArgumentParser(this, this.parser, args);

        /**
         * Usable only in this channel type.
         * @type {?string}
         */
        this.channel = channel;

        /**
         * Usable only by the client owner.
         * @type {boolean}
         */
        this.ownerOnly = Boolean(ownerOnly);

        /**
         * Whether or not this command can be ran by an edit.
         * @type {boolean}
         */
        this.editable = Boolean(editable);

        /**
         * Whether or not to type during command execution.
         * @type {boolean}
         */
        this.typing = Boolean(typing);

        /**
         * Cooldown in milliseconds.
         * @type {?number}
         */
        this.cooldown = cooldown;

        /**
         * Uses allowed before cooldown.
         * @type {number}
         */
        this.ratelimit = ratelimit;

        /**
         * Default prompt options.
         * @type {ArgumentPromptOptions}
         */
        this.defaultPrompt = defaultPrompt;

        /**
         * Description of the command.
         * @type {string}
         */
        this.description = Array.isArray(description) ? description.join('\n') : description;

        /**
         * Command prefix overwrite.
         * @type {?string|string[]|PrefixSupplier}
         */
        this.prefix = typeof prefix === 'function' ? prefix.bind(this) : prefix;

        /**
         * Permissions required to run command by the client.
         * @type {PermissionResolvable|PermissionResolvable[]|MissingPermissionSupplier}
         */
        this.clientPermissions = typeof clientPermissions === 'function' ? clientPermissions.bind(this) : clientPermissions;

        /**
         * Permissions required to run command by the user.
         * @type {PermissionResolvable|PermissionResolvable[]|MissingPermissionSupplier}
         */
        this.userPermissions = typeof userPermissions === 'function' ? userPermissions.bind(this) : userPermissions;

        /**
         * The regex trigger for this command.
         * @type {RegExp|TriggerFunction}
         */
        this.regex = typeof regex === 'function' ? regex.bind(this) : regex;

        /**
         * Checks if the command should be ran by using an arbitrary condition.
         * @method
         * @param {Message} message - Message being handled.
         * @returns {boolean}
         */
        this.condition = condition.bind(this);

        /**
         * Runs before argument parsing and execution.
         * @method
         * @param {Message} message - Message being handled.
         * @returns {any}
         */
        this.before = before.bind(this);

        /**
         * ID of user(s) to ignore cooldown or a function to ignore.
         * @type {?Snowflake|Snowflake[]|IgnoreCheckPredicate}
         */
        this.ignoreCooldown = typeof ignoreCooldown === 'function' ? ignoreCooldown.bind(this) : ignoreCooldown;

        /**
         * ID of user(s) to ignore `userPermissions` checks or a function to ignore.
         * @type {?Snowflake|Snowflake[]|IgnoreCheckPredicate}
         */
        this.ignorePermissions = typeof ignorePermissions === 'function' ? ignorePermissions.bind(this) : ignorePermissions;

        /**
         * The ID of this command.
         * @name Command#id
         * @type {string}
         */

        /**
         * The command handler.
         * @name Command#handler
         * @type {CommandHandler}
         */
    }

    /**
     * Executes the command.
     * @abstract
     * @param {Message} message - Message that triggered the command.
     * @param {Object} args - Evaluated arguments.
     * @returns {any}
     */
    exec() {
        throw new AkairoError('NOT_IMPLEMENTED', this.constructor.name, 'exec');
    }

    /**
     * Parses content using the command's argument options.
     * @param {Message} message - Message to use.
     * @param {string} content - String to parse.
     * @returns {Promise<Object|ParsingFlag>}
     */
    parse(message, content) {
        if (typeof this.args === 'function') {
            const res = this.args(message, content);
            return Promise.resolve(res);
        }

        return this.args.parse(message, content);
    }

    /**
     * Reloads the command.
     * @method
     * @name Command#reload
     * @returns {Command}
     */

    /**
     * Removes the command.
     * @method
     * @name Command#remove
     * @returns {Command}
     */
}

module.exports = Command;

/**
 * Options to use for command execution behavior.
 * Also includes properties from AkairoModuleOptions.
 * @typedef {AkairoModuleOptions} CommandOptions
 * @prop {string[]} [aliases=[]] - Command names.
 * @prop {Array<ArgumentOptions|Control>|ArgumentProvider} [args=[]] - Argument options to use.
 * @prop {boolean} [quoted=true] - Whether or not to consider quotes.
 * @prop {string} [separator] - Custom separator for argument input.
 * @prop {string} [channel] - Restricts channel to either 'guild' or 'dm'.
 * @prop {boolean} [ownerOnly=false] - Whether or not to allow client owner(s) only.
 * @prop {boolean} [typing=false] - Whether or not to type in channel during execution.
 * @prop {boolean} [editable=true] - Whether or not message edits will run this command.
 * @prop {number} [cooldown] - The command cooldown in milliseconds.
 * @prop {number} [ratelimit=1] - Amount of command uses allowed until cooldown.
 * @prop {string|string[]|PrefixSupplier} [prefix] - The prefix(es) to overwrite the global one for this command.
 * @prop {PermissionResolvable|PermissionResolvable[]|MissingPermissionSupplier} [userPermissions] - Permissions required by the user to run this command.
 * @prop {PermissionResolvable|PermissionResolvable[]|MissingPermissionSupplier} [clientPermissions] - Permissions required by the client to run this command.
 * @prop {RegExp|RegexSupplier} [regex] - A regex to match in messages that are not directly commands.
 * The args object will have `match` and `matches` properties.
 * @prop {ExecutionPredicate} [condition] - Whether or not to run on messages that are not directly commands.
 * @prop {BeforeAction} [before] - Function to run before argument parsing and execution.
 * @prop {Snowflake|Snowflake[]|IgnoreCheckPredicate} [ignoreCooldown] - ID of user(s) to ignore cooldown or a function to ignore.
 * @prop {Snowflake|Snowflake[]|IgnoreCheckPredicate} [ignorePermissions] - ID of user(s) to ignore `userPermissions` checks or a function to ignore.
 * @prop {ArgumentPromptOptions} [defaultPrompt={}] - The default prompt options.
 * @prop {StringResolvable} [description=''] - Description of the command.
 */

/**
 * A function to replace Akairo's argument handler.
 * @typedef {Function} ArgumentProvider
 * @param {Message} message - Message that triggered the command.
 * @param {string} content - The content of the message.
 * @returns {any}
 */

/**
 * A function to run before argument parsing and execution.
 * @typedef {Function} BeforeAction
 * @param {Message} message - Message that triggered the command.
 * @returns {any}
 */

/**
 * A function used to check if the command should run arbitrarily.
 * @typedef {Function} ExecutionPredicate
 * @param {Message} message - Message to check.
 * @returns {boolean}
 */

/**
 * A function used to check if a message has permissions for the command.
 * A non-null return value signifies the reason for missing permissions.
 * @typedef {Function} MissingPermissionSupplier
 * @param {Message} message - Message that triggered the command.
 * @returns {any}
 */

/**
 * A function used to return a regular expression.
 * @typedef {Function} RegexSupplier
 * @param {Message} message - Message to get regex for.
 * @returns {RegExp}
 */
