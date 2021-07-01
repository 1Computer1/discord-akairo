const { ArgumentMatches, ArgumentTypes } = require('../../../util/Constants');
const Flag = require('../Flag');
const { choice, intoCallable, isPromise } = require('../../../util/Util');

/**
 * Represents an argument for a command.
 * @param {Command} command - Command of the argument.
 * @param {ArgumentOptions} options - Options for the argument.
 */
class Argument {
    constructor(command, {
        match = ArgumentMatches.PHRASE,
        type = ArgumentTypes.STRING,
        flag = null,
        multipleFlags = false,
        index = null,
        unordered = false,
        limit = Infinity,
        prompt = null,
        default: defaultValue = null,
        otherwise = null,
        modifyOtherwise = null
    } = {}) {
        /**
         * The command this argument belongs to.
         * @type {Command}
         */
        this.command = command;

        /**
         * The method to match text.
         * @type {ArgumentMatch}
         */
        this.match = match;

        /**
         * The type to cast to or a function to use to cast.
         * @type {ArgumentType|ArgumentTypeCaster}
         */
        this.type = typeof type === 'function' ? type.bind(this) : type;

        /**
         * The string(s) to use for flag or option match.
         * @type {?string|string[]}
         */
        this.flag = flag;

        /**
         * Whether to process multiple option flags instead of just the first.
         * @type {boolean}
         */
        this.multipleFlags = multipleFlags;

        /**
         * The index to start from.
         * @type {?number}
         */
        this.index = index;

        /**
         * Whether or not the argument is unordered.
         * @type {boolean|number|number[]}
         */
        this.unordered = unordered;

        /**
         * The amount of phrases to match for rest, separate, content, or text match.
         * @type {number}
         */
        this.limit = limit;

        /**
         * The prompt options.
         * @type {?ArgumentPromptOptions}
         */
        this.prompt = prompt;

        /**
         * The default value of the argument or a function supplying the default value.
         * @type {DefaultValueSupplier|any}
         */
        this.default = typeof defaultValue === 'function' ? defaultValue.bind(this) : defaultValue;

        /**
         * The content or function supplying the content sent when argument parsing fails.
         * @type {?string|MessageOptions|MessageAdditions|OtherwiseContentSupplier}
         */
        this.otherwise = typeof otherwise === 'function' ? otherwise.bind(this) : otherwise;

        /**
         * Function to modify otherwise content.
         * @type {?OtherwiseContentModifier}
         */
        this.modifyOtherwise = modifyOtherwise;
    }

    /**
     * The client.
     * @type {AkairoClient}
     */
    get client() {
        return this.command.client;
    }

    /**
     * The command handler.
     * @type {CommandHandler}
     */
    get handler() {
        return this.command.handler;
    }

    /**
     * Processes the type casting and prompting of the argument for a phrase.
     * @param {Message} message - The message that called the command.
     * @param {string} phrase - The phrase to process.
     * @returns {Promise<Flag|any>}
     */
    async process(message, phrase) {
        const commandDefs = this.command.argumentDefaults;
        const handlerDefs = this.handler.argumentDefaults;
        const optional = choice(
            this.prompt && this.prompt.optional,
            commandDefs.prompt && commandDefs.prompt.optional,
            handlerDefs.prompt && handlerDefs.prompt.optional
        );

        const doOtherwise = async failure => {
            const otherwise = choice(
                this.otherwise,
                commandDefs.otherwise,
                handlerDefs.otherwise
            );

            const modifyOtherwise = choice(
                this.modifyOtherwise,
                commandDefs.modifyOtherwise,
                handlerDefs.modifyOtherwise
            );

            let text = await intoCallable(otherwise).call(this, message, { phrase, failure });
            if (Array.isArray(text)) {
                text = text.join('\n');
            }

            if (modifyOtherwise) {
                text = await modifyOtherwise.call(this, message, text, { phrase, failure });
                if (Array.isArray(text)) {
                    text = text.join('\n');
                }
            }

            if (text) {
                const sent = await message.channel.send(text);
                if (message.util) message.util.addMessage(sent);
            }

            return Flag.cancel();
        };

        if (!phrase && optional) {
            if (this.otherwise != null) {
                return doOtherwise(null);
            }

            return intoCallable(this.default)(message, { phrase, failure: null });
        }

        const res = await this.cast(message, phrase);
        if (Argument.isFailure(res)) {
            if (this.otherwise != null) {
                return doOtherwise(res);
            }

            if (this.prompt != null) {
                return this.collect(message, phrase, res);
            }

            return this.default == null
                ? res
                : intoCallable(this.default)(message, { phrase, failure: res });
        }

        return res;
    }

    /**
     * Casts a phrase to this argument's type.
     * @param {Message} message - Message that called the command.
     * @param {string} phrase - Phrase to process.
     * @returns {Promise<any>}
     */
    cast(message, phrase) {
        return Argument.cast(this.type, this.handler.resolver, message, phrase);
    }

    /**
     * Collects input from the user by prompting.
     * @param {Message} message - Message to prompt.
     * @param {string} [commandInput] - Previous input from command if there was one.
     * @param {any} [parsedInput] - Previous parsed input from command if there was one.
     * @returns {Promise<Flag|any>}
     */
    async collect(message, commandInput = '', parsedInput = null) {
        const promptOptions = {};
        Object.assign(promptOptions, this.handler.argumentDefaults.prompt);
        Object.assign(promptOptions, this.command.argumentDefaults.prompt);
        Object.assign(promptOptions, this.prompt || {});

        const isInfinite = promptOptions.infinite || (this.match === ArgumentMatches.SEPARATE && !commandInput);
        const additionalRetry = Number(Boolean(commandInput));
        const values = isInfinite ? [] : null;

        const getText = async (promptType, prompter, retryCount, inputMessage, inputPhrase, inputParsed) => {
            let text = await intoCallable(prompter).call(this, message, {
                retries: retryCount,
                infinite: isInfinite,
                message: inputMessage,
                phrase: inputPhrase,
                failure: inputParsed
            });

            if (Array.isArray(text)) {
                text = text.join('\n');
            }

            const modifier = {
                start: promptOptions.modifyStart,
                retry: promptOptions.modifyRetry,
                timeout: promptOptions.modifyTimeout,
                ended: promptOptions.modifyEnded,
                cancel: promptOptions.modifyCancel
            }[promptType];

            if (modifier) {
                text = await modifier.call(this, message, text, {
                    retries: retryCount,
                    infinite: isInfinite,
                    message: inputMessage,
                    phrase: inputPhrase,
                    failure: inputParsed
                });

                if (Array.isArray(text)) {
                    text = text.join('\n');
                }
            }

            return text;
        };

        // eslint-disable-next-line complexity
        const promptOne = async (prevMessage, prevInput, prevParsed, retryCount) => {
            let sentStart;
            // This is either a retry prompt, the start of a non-infinite, or the start of an infinite.
            if (retryCount !== 1 || !isInfinite || !values.length) {
                const promptType = retryCount === 1 ? 'start' : 'retry';
                const prompter = retryCount === 1 ? promptOptions.start : promptOptions.retry;
                const startText = await getText(promptType, prompter, retryCount, prevMessage, prevInput, prevParsed);

                if (startText) {
                    sentStart = await (message.util || message.channel).send(startText);
                    if (message.util) {
                        message.util.setEditable(false);
                        message.util.setLastResponse(sentStart);
                        message.util.addMessage(sentStart);
                    }
                }
            }

            let input;
            try {
                input = (await message.channel.awaitMessages({
                    filter: m => m.author.id === message.author.id,
                    max: 1,
                    time: promptOptions.time,
                    errors: ['time']
                })).first();

                if (message.util) message.util.addMessage(input);
            } catch (err) {
                const timeoutText = await getText('timeout', promptOptions.timeout, retryCount, prevMessage, prevInput, '');
                if (timeoutText) {
                    const sentTimeout = await message.channel.send(timeoutText);
                    if (message.util) message.util.addMessage(sentTimeout);
                }

                return Flag.cancel();
            }

            if (promptOptions.breakout) {
                const looksLike = await this.handler.parseCommand(input);
                if (looksLike && looksLike.command) return Flag.retry(input);
            }

            if (input.content.toLowerCase() === promptOptions.cancelWord.toLowerCase()) {
                const cancelText = await getText('cancel', promptOptions.cancel, retryCount, input, input.content, 'cancel');
                if (cancelText) {
                    const sentCancel = await message.channel.send(cancelText);
                    if (message.util) message.util.addMessage(sentCancel);
                }

                return Flag.cancel();
            }

            if (isInfinite && input.content.toLowerCase() === promptOptions.stopWord.toLowerCase()) {
                if (!values.length) return promptOne(input, input.content, null, retryCount + 1);
                return values;
            }

            const parsedValue = await this.cast(input, input.content);
            if (Argument.isFailure(parsedValue)) {
                if (retryCount <= promptOptions.retries) {
                    return promptOne(input, input.content, parsedValue, retryCount + 1);
                }

                const endedText = await getText('ended', promptOptions.ended, retryCount, input, input.content, 'stop');
                if (endedText) {
                    const sentEnded = await message.channel.send(endedText);
                    if (message.util) message.util.addMessage(sentEnded);
                }

                return Flag.cancel();
            }

            if (isInfinite) {
                values.push(parsedValue);
                const limit = promptOptions.limit;
                if (values.length < limit) return promptOne(message, input.content, parsedValue, 1);

                return values;
            }

            return parsedValue;
        };

        this.handler.addPrompt(message.channel, message.author);
        const returnValue = await promptOne(message, commandInput, parsedInput, 1 + additionalRetry);
        if (this.handler.commandUtil) {
            message.util.setEditable(false);
        }

        this.handler.removePrompt(message.channel, message.author);
        return returnValue;
    }

    /**
     * Casts a phrase to the specified type.
     * @param {ArgumentType|ArgumentTypeCaster} type - Type to use.
     * @param {TypeResolver} resolver - Type resolver to use.
     * @param {Message} message - Message that called the command.
     * @param {string} phrase - Phrase to process.
     * @returns {Promise<any>}
     */
    static async cast(type, resolver, message, phrase) {
        if (Array.isArray(type)) {
            for (const entry of type) {
                if (Array.isArray(entry)) {
                    if (entry.some(t => t.toLowerCase() === phrase.toLowerCase())) {
                        return entry[0];
                    }
                } else if (entry.toLowerCase() === phrase.toLowerCase()) {
                    return entry;
                }
            }

            return null;
        }

        if (typeof type === 'function') {
            let res = type(message, phrase);
            if (isPromise(res)) res = await res;
            return res;
        }

        if (type instanceof RegExp) {
            const match = phrase.match(type);
            if (!match) return null;

            const matches = [];

            if (type.global) {
                let matched;

                while ((matched = type.exec(phrase)) != null) {
                    matches.push(matched);
                }
            }

            return { match, matches };
        }

        if (resolver.type(type)) {
            let res = resolver.type(type).call(this, message, phrase);
            if (isPromise(res)) res = await res;
            return res;
        }

        return phrase || null;
    }

    /* eslint-disable no-invalid-this */
    /**
     * Creates a type from multiple types (union type).
     * The first type that resolves to a non-void value is used.
     * @param {...ArgumentType|ArgumentTypeCaster} types - Types to use.
     * @returns {ArgumentTypeCaster}
     */
    static union(...types) {
        return async function typeFn(message, phrase) {
            for (let entry of types) {
                if (typeof entry === 'function') entry = entry.bind(this);
                const res = await Argument.cast(entry, this.handler.resolver, message, phrase);
                if (!Argument.isFailure(res)) return res;
            }

            return null;
        };
    }

    /**
     * Creates a type from multiple types (product type).
     * Only inputs where each type resolves with a non-void value are valid.
     * @param {...ArgumentType|ArgumentTypeCaster} types - Types to use.
     * @returns {ArgumentTypeCaster}
     */
    static product(...types) {
        return async function typeFn(message, phrase) {
            const results = [];
            for (let entry of types) {
                if (typeof entry === 'function') entry = entry.bind(this);
                const res = await Argument.cast(entry, this.handler.resolver, message, phrase);
                if (Argument.isFailure(res)) return res;
                results.push(res);
            }

            return results;
        };
    }

    /**
     * Creates a type with extra validation.
     * If the predicate is not true, the value is considered invalid.
     * @param {ArgumentType|ArgumentTypeCaster} type - The type to use.
     * @param {ParsedValuePredicate} predicate - The predicate function.
     * @returns {ArgumentTypeCaster}
     */
    static validate(type, predicate) {
        return async function typeFn(message, phrase) {
            if (typeof type === 'function') type = type.bind(this);
            const res = await Argument.cast(type, this.handler.resolver, message, phrase);
            if (Argument.isFailure(res)) return res;
            if (!predicate.call(this, message, phrase, res)) return null;
            return res;
        };
    }

    /**
     * Creates a type where the parsed value must be within a range.
     * @param {ArgumentType|ArgumentTypeCaster} type - The type to use.
     * @param {number} min - Minimum value.
     * @param {number} max - Maximum value.
     * @param {boolean} [inclusive=false] - Whether or not to be inclusive on the upper bound.
     * @returns {ArgumentTypeCaster}
     */
    static range(type, min, max, inclusive = false) {
        return Argument.validate(type, (msg, p, x) => {
            /* eslint-disable-next-line valid-typeof */
            const o = typeof x === 'number' || typeof x === 'bigint'
                ? x
                : x.length != null
                    ? x.length
                    : x.size != null
                        ? x.size
                        : x;

            return o >= min && (inclusive ? o <= max : o < max);
        });
    }

    /**
     * Creates a type that is the left-to-right composition of the given types.
     * If any of the types fails, the entire composition fails.
     * @param {...ArgumentType|ArgumentTypeCaster} types - Types to use.
     * @returns {ArgumentTypeCaster}
     */
    static compose(...types) {
        return async function typeFn(message, phrase) {
            let acc = phrase;
            for (let entry of types) {
                if (typeof entry === 'function') entry = entry.bind(this);
                acc = await Argument.cast(entry, this.handler.resolver, message, acc);
                if (Argument.isFailure(acc)) return acc;
            }

            return acc;
        };
    }

    /**
     * Creates a type that is the left-to-right composition of the given types.
     * If any of the types fails, the composition still continues with the failure passed on.
     * @param {...ArgumentType|ArgumentTypeCaster} types - Types to use.
     * @returns {ArgumentTypeCaster}
     */
    static composeWithFailure(...types) {
        return async function typeFn(message, phrase) {
            let acc = phrase;
            for (let entry of types) {
                if (typeof entry === 'function') entry = entry.bind(this);
                acc = await Argument.cast(entry, this.handler.resolver, message, acc);
            }

            return acc;
        };
    }

    /**
     * Creates a type that parses as normal but also carries the original input.
     * Result is in an object `{ input, value }` and wrapped in `Flag.fail` when failed.
     * @param {ArgumentType|ArgumentTypeCaster} type - The type to use.
     * @returns {ArgumentTypeCaster}
     */
    static withInput(type) {
        return async function typeFn(message, phrase) {
            if (typeof type === 'function') type = type.bind(this);
            const res = await Argument.cast(type, this.handler.resolver, message, phrase);
            if (Argument.isFailure(res)) {
                return Flag.fail({ input: phrase, value: res });
            }

            return { input: phrase, value: res };
        };
    }

    /**
     * Creates a type that parses as normal but also tags it with some data.
     * Result is in an object `{ tag, value }` and wrapped in `Flag.fail` when failed.
     * @param {ArgumentType|ArgumentTypeCaster} type - The type to use.
     * @param {any} [tag] - Tag to add.
     * Defaults to the `type` argument, so useful if it is a string.
     * @returns {ArgumentTypeCaster}
     */
    static tagged(type, tag = type) {
        async function typeFn(message, phrase) {
            if (typeof type === 'function') type = type.bind(this);
            const res = await Argument.cast(type, this.handler.resolver, message, phrase);
            if (Argument.isFailure(res)) {
                return Flag.fail({ tag, value: res });
            }

            return { tag, value: res };
        }

        return typeof this === 'undefined' ? typeFn : typeFn.bind(this);
    }

    /**
     * Creates a type that parses as normal but also tags it with some data and carries the original input.
     * Result is in an object `{ tag, input, value }` and wrapped in `Flag.fail` when failed.
     * @param {ArgumentType|ArgumentTypeCaster} type - The type to use.
     * @param {any} [tag] - Tag to add.
     * Defaults to the `type` argument, so useful if it is a string.
     * @returns {ArgumentTypeCaster}
     */
    static taggedWithInput(type, tag = type) {
        return async function typeFn(message, phrase) {
            if (typeof type === 'function') type = type.bind(this);
            const res = await Argument.cast(type, this.handler.resolver, message, phrase);
            if (Argument.isFailure(res)) {
                return Flag.fail({ tag, input: phrase, value: res });
            }

            return { tag, input: phrase, value: res };
        };
    }

    /**
     * Creates a type from multiple types (union type).
     * The first type that resolves to a non-void value is used.
     * Each type will also be tagged using `tagged` with themselves.
     * @param {...ArgumentType|ArgumentTypeCaster} types - Types to use.
     * @returns {ArgumentTypeCaster}
     */
    static taggedUnion(...types) {
        return async function typeFn(message, phrase) {
            for (let entry of types) {
                entry = Argument.tagged.bind(this)(entry);
                const res = await Argument.cast(entry, this.handler.resolver, message, phrase);
                if (!Argument.isFailure(res)) return res;
            }

            return null;
        };
    }
    /* eslint-enable no-invalid-this */

    /**
     * Checks if something is null, undefined, or a fail flag.
     * @param {any} value - Value to check.
     * @returns {boolean}
     */
    static isFailure(value) {
        return value == null || Flag.is(value, 'fail');
    }
}

module.exports = Argument;

/**
 * Options for how an argument parses text.
 * @typedef {Object} ArgumentOptions
 * @prop {string} id - ID of the argument for use in the args object.
 * This does nothing inside an ArgumentGenerator.
 * @prop {ArgumentMatch} [match='phrase'] - Method to match text.
 * @prop {ArgumentType|ArgumentTypeCaster} [type='string'] - Type to cast to.
 * @prop {string|string[]} [flag] - The string(s) to use as the flag for flag or option match.
 * @prop {boolean} [multipleFlags=false] - Whether or not to have flags process multiple inputs.
 * For option flags, this works like the separate match; the limit option will also work here.
 * For flags, this will count the number of occurrences.
 * @prop {number} [index] - Index of phrase to start from.
 * Applicable to phrase, text, content, rest, or separate match only.
 * Ignored when used with the unordered option.
 * @prop {boolean|number|number[]} [unordered=false] - Marks the argument as unordered.
 * Each phrase is evaluated in order until one matches (no input at all means no evaluation).
 * Passing in a number forces evaluation from that index onwards.
 * Passing in an array of numbers forces evaluation on those indices only.
 * If there is a match, that index is considered used and future unordered args will not check that index again.
 * If there is no match, then the prompting or default value is used.
 * Applicable to phrase match only.
 * @prop {number} [limit=Infinity] - Amount of phrases to match when matching more than one.
 * Applicable to text, content, rest, or separate match only.
 * @prop {DefaultValueSupplier|any} [default=null] - Default value if no input or did not cast correctly.
 * If using a flag match, setting the default value to a non-void value inverses the result.
 * @prop {string|MessageOptions|MessageAdditions|OtherwiseContentSupplier} [otherwise] - Text sent if argument parsing fails.
 * This overrides the `default` option and all prompt options.
 * @prop {OtherwiseContentModifier} [modifyOtherwise] - Function to modify otherwise content.
 * @prop {ArgumentPromptOptions} [prompt] - Prompt options for when user does not provide input.
 */

/**
 * Data passed to argument prompt functions.
 * @typedef {Object} ArgumentPromptData
 * @prop {number} retries - Amount of retries so far.
 * @prop {boolean} infinite - Whether the prompt is infinite or not.
 * @prop {Message} message - The message that caused the prompt.
 * @prop {string} phrase - The input phrase that caused the prompt if there was one, otherwise an empty string.
 * @param {void|Flag} failure - The value that failed if there was one, otherwise null.
 */

/**
 * A prompt to run if the user did not input the argument correctly.
 * Can only be used if there is not a default value (unless optional is true).
 * @typedef {Object} ArgumentPromptOptions
 * @prop {number} [retries=1] - Amount of retries allowed.
 * @prop {number} [time=30000] - Time to wait for input.
 * @prop {string} [cancelWord='cancel'] - Word to use for cancelling the command.
 * @prop {string} [stopWord='stop'] - Word to use for ending infinite prompts.
 * @prop {boolean} [optional=false] - Prompts only when argument is provided but was not of the right type.
 * @prop {boolean} [infinite=false] - Prompts forever until the stop word, cancel word, time limit, or retry limit.
 * Note that the retry count resets back to one on each valid entry.
 * The final evaluated argument will be an array of the inputs.
 * @prop {number} [limit=Infinity] - Amount of inputs allowed for an infinite prompt before finishing.
 * @prop {boolean} [breakout=true] - Whenever an input matches the format of a command, this option controls whether or not to cancel this command and run that command.
 * The command to be run may be the same command or some other command.
 * @prop {string|MessageOptions|MessageAdditions|PromptContentSupplier} [start] - Text sent on start of prompt.
 * @prop {string|MessageOptions|MessageAdditions|PromptContentSupplier} [retry] - Text sent on a retry (failure to cast type).
 * @prop {string|MessageOptions|MessageAdditions|PromptContentSupplier} [timeout] - Text sent on collector time out.
 * @prop {string|MessageOptions|MessageAdditions|PromptContentSupplier} [ended] - Text sent on amount of tries reaching the max.
 * @prop {string|MessageOptions|MessageAdditions|PromptContentSupplier} [cancel] - Text sent on cancellation of command.
 * @prop {PromptContentModifier} [modifyStart] - Function to modify start prompts.
 * @prop {PromptContentModifier} [modifyRetry] - Function to modify retry prompts.
 * @prop {PromptContentModifier} [modifyTimeout] - Function to modify timeout messages.
 * @prop {PromptContentModifier} [modifyEnded] - Function to modify out of tries messages.
 * @prop {PromptContentModifier} [modifyCancel] - Function to modify cancel messages.
 */

/**
 * The method to match arguments from text.
 * - `phrase` matches by the order of the phrases inputted.
 * It ignores phrases that matches a flag.
 * - `flag` matches phrases that are the same as its flag.
 * The evaluated argument is either true or false.
 * - `option` matches phrases that starts with the flag.
 * The phrase after the flag is the evaluated argument.
 * - `rest` matches the rest of the phrases.
 * It ignores phrases that matches a flag.
 * It preserves the original whitespace between phrases and the quotes around phrases.
 * - `separate` matches the rest of the phrases and processes each individually.
 * It ignores phrases that matches a flag.
 * - `text` matches the entire text, except for the command.
 * It ignores phrases that matches a flag.
 * It preserves the original whitespace between phrases and the quotes around phrases.
 * - `content` matches the entire text as it was inputted, except for the command.
 * It preserves the original whitespace between phrases and the quotes around phrases.
 * - `restContent` matches the rest of the text as it was inputted.
 * It preserves the original whitespace between phrases and the quotes around phrases.
 * - `none` matches nothing at all and an empty string will be used for type operations.
 * @typedef {string} ArgumentMatch
 */

/**
 * The type that the argument should be cast to.
 * - `string` does not cast to any type.
 * - `lowercase` makes the input lowercase.
 * - `uppercase` makes the input uppercase.
 * - `charCodes` transforms the input to an array of char codes.
 * - `number` casts to a number.
 * - `integer` casts to an integer.
 * - `bigint` casts to a big integer.
 * - `url` casts to an `URL` object.
 * - `date` casts to a `Date` object.
 * - `color` casts a hex code to an integer.
 * - `commandAlias` tries to resolve to a command from an alias.
 * - `command` matches the ID of a command.
 * - `inhibitor` matches the ID of an inhibitor.
 * - `listener` matches the ID of a listener.
 *
 * Possible Discord-related types.
 * These types can be plural (add an 's' to the end) and a collection of matching objects will be used.
 * - `user` tries to resolve to a user.
 * - `member` tries to resolve to a member.
 * - `relevant` tries to resolve to a relevant user, works in both guilds and DMs.
 * - `channel` tries to resolve to a channel.
 * - `textChannel` tries to resolve to a text channel.
 * - `voiceChannel` tries to resolve to a voice channel.
 * - `role` tries to resolve to a role.
 * - `emoji` tries to resolve to a custom emoji.
 * - `guild` tries to resolve to a guild.
 *
 * Other Discord-related types:
 * - `message` tries to fetch a message from an ID within the channel.
 * - `guildMessage` tries to fetch a message from an ID within the guild.
 * - `relevantMessage` is a combination of the above, works in both guilds and DMs.
 * - `invite` tries to fetch an invite object from a link.
 * - `userMention` matches a mention of a user.
 * - `memberMention` matches a mention of a guild member.
 * - `channelMention` matches a mention of a channel.
 * - `roleMention` matches a mention of a role.
 * - `emojiMention` matches a mention of an emoji.
 *
 * An array of strings can be used to restrict input to only those strings, case insensitive.
 * The array can also contain an inner array of strings, for aliases.
 * If so, the first entry of the array will be used as the final argument.
 *
 * A regular expression can also be used.
 * The evaluated argument will be an object containing the `match` and `matches` if global.
 * @typedef {string|string[]} ArgumentType
 */

/**
 * A function for processing user input to use as an argument.
 * A void return value will use the default value for the argument or start a prompt.
 * Any other truthy return value will be used as the evaluated argument.
 * If returning a Promise, the resolved value will go through the above steps.
 * @typedef {Function} ArgumentTypeCaster
 * @param {Message} message - Message that triggered the command.
 * @param {string} phrase - The user input.
 * @returns {any}
 */

/**
 * A function for processing some value to use as an argument.
 * This is mainly used in composing argument types.
 * @typedef {Function} ArgumentTypeCaster
 * @param {Message} message - Message that triggered the command.
 * @param {any} value - Some value.
 * @returns {any}
 */

/**
 * Data passed to functions that run when things failed.
 * @typedef {Object} FailureData
 * @prop {string} phrase - The input phrase that failed if there was one, otherwise an empty string.
 * @param {void|Flag} failure - The value that failed if there was one, otherwise null.
 */

/**
 * Defaults for argument options.
 * @typedef {Object} DefaultArgumentOptions
 * @prop {ArgumentPromptOptions} [prompt] - Default prompt options.
 * @prop {string|MessageOptions|MessageAdditions|OtherwiseContentSupplier} [otherwise] - Default text sent if argument parsing fails.
 * @prop {OtherwiseContentModifier} [modifyOtherwise] - Function to modify otherwise content.
 */

/**
 * Function get the default value of the argument.
 * @typedef {Function} DefaultValueSupplier
 * @param {Message} message - Message that triggered the command.
 * @param {FailureData} data - Miscellaneous data.
 * @returns {any}
 */

/**
 * A function for validating parsed arguments.
 * @typedef {Function} ParsedValuePredicate
 * @param {Message} message - Message that triggered the command.
 * @param {string} phrase - The user input.
 * @param {any} value - The parsed value.
 * @returns {boolean}
 */

/**
 * A function modifying a prompt text.
 * @typedef {Function} OtherwiseContentModifier
 * @param {Message} message - Message that triggered the command.
 * @param {string|MessageEmbed|MessageAttachment|MessageAttachment[]|MessageOptions} text - Text to modify.
 * @param {FailureData} data - Miscellaneous data.
 * @returns {string|MessageOptions|MessageAdditions|Promise<string|MessageOptions|MessageAdditions>}
 */

/**
 * A function returning the content if argument parsing fails.
 * @typedef {Function} OtherwiseContentSupplier
 * @param {Message} message - Message that triggered the command.
 * @param {FailureData} data - Miscellaneous data.
 * @returns {string|MessageOptions|MessageAdditions|Promise<string|MessageOptions|MessageAdditions>}
 */

/**
 * A function modifying a prompt text.
 * @typedef {Function} PromptContentModifier
 * @param {Message} message - Message that triggered the command.
 * @param {string|MessageEmbed|MessageAttachment|MessageAttachment[]|MessageOptions} text - Text from the prompt to modify.
 * @param {ArgumentPromptData} data - Miscellaneous data.
 * @returns {string|MessageOptions|MessageAdditions|Promise<string|MessageOptions|MessageAdditions>}
 */

/**
 * A function returning text for the prompt.
 * @typedef {Function} PromptContentSupplier
 * @param {Message} message - Message that triggered the command.
 * @param {ArgumentPromptData} data - Miscellaneous data.
 * @returns {string|MessageOptions|MessageAdditions|Promise<string|MessageOptions|MessageAdditions>}
 */
