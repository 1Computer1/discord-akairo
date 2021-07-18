const { ArgumentMatches } = require('../../util/Constants');

/*
 * Grammar:
 *
 * Arguments
 *  = (Argument (WS? Argument)*)? EOF
 *
 * Argument
 *  = Flag
 *  | Phrase
 *
 * Flag
 *  = FlagWord
 *  | OptionFlagWord WS? Phrase?
 *
 * Phrase
 *  = Quote (Word | WS)* Quote?
 *  | OpenQuote (Word | OpenQuote | Quote | WS)* EndQuote?
 *  | EndQuote
 *  | Word
 *
 * FlagWord = Given
 * OptionFlagWord = Given
 * Quote = "
 * OpenQuote = “
 * EndQuote = ”
 * Word = /^\S+/ (and not in FlagWord or OptionFlagWord)
 * WS = /^\s+/
 * EOF = /^$/
 *
 * With a separator:
 *
 * Arguments
 *  = (Argument (WS? Separator WS? Argument)*)? EOF
 *
 * Argument
 *  = Flag
 *  | Phrase
 *
 * Flag
 *  = FlagWord
 *  | OptionFlagWord WS? Phrase?
 *
 * Phrase
 *  = Word (WS Word)*
 *
 * FlagWord = Given
 * OptionFlagWord = Given
 * Separator = Given
 * Word = /^\S+/ (and not in FlagWord or OptionFlagWord or equal to Separator)
 * WS = /^\s+/
 * EOF = /^$/
 */

const Quotes = Object.freeze({
    Normal: '"',
    Open: '“',
    End: '”'
});

const TokenTypes = Object.freeze({
    FlagWord: 'FlagWord',
    OptionFlagWord: 'OptionFlagWord',
    OpenQuote: 'OpenQuote',
    Quote: 'Quote',
    EndQuote: 'EndQuote',
    Separator: 'Separator',
    WS: 'WS',
    Word: 'Word',
    EOF: 'EOF'
});

const ResultTypes = Object.freeze({
    Flag: 'Flag',
    OptionFlag: 'OptionFlag',
    Phrase: 'Phrase'
});

class Tokenizer {
    constructor(content, {
        flagWords = [],
        optionFlagWords = [],
        quoted = true,
        separator
    } = {}) {
        this.content = content;
        this.flagWords = flagWords;
        this.optionFlagWords = optionFlagWords;
        this.quoted = quoted;
        this.separator = separator;
        this.position = 0;
        // 0 -> Default, 1 -> Quotes (""), 2 -> Special Quotes (“”)
        this.state = 0;
        this.tokens = [];
    }

    startsWith(str) {
        return this.content.slice(this.position, this.position + str.length).toLowerCase() === str.toLowerCase();
    }

    match(regex) {
        return this.content.slice(this.position).match(regex);
    }

    slice(from, to) {
        return this.content.slice(this.position + from, this.position + to);
    }

    addToken(type, value = '') {
        this.tokens.push({ type, value });
    }

    advance(n) {
        this.position += n;
    }

    choice(...actions) {
        for (const action of actions) {
            if (action.call(this)) {
                return;
            }
        }
    }

    tokenize() {
        while (this.position < this.content.length) {
            this.runOne();
        }

        this.addToken(TokenTypes.EOF);
        return this.tokens;
    }

    runOne() {
        this.choice(
            this.runWhitespace,
            this.runFlags,
            this.runOptionFlags,
            this.runQuote,
            this.runOpenQuote,
            this.runEndQuote,
            this.runSeparator,
            this.runWord
        );
    }

    runFlags() {
        if (this.state === 0) {
            for (const word of this.flagWords) {
                if (this.startsWith(word)) {
                    this.addToken(TokenTypes.FlagWord, this.slice(0, word.length));
                    this.advance(word.length);
                    return true;
                }
            }
        }

        return false;
    }

    runOptionFlags() {
        if (this.state === 0) {
            for (const word of this.optionFlagWords) {
                if (this.startsWith(word)) {
                    this.addToken(TokenTypes.OptionFlagWord, this.slice(0, word.length));
                    this.advance(word.length);
                    return true;
                }
            }
        }

        return false;
    }

    runQuote() {
        if (this.separator == null && this.quoted && this.startsWith(Quotes.Normal)) {
            if (this.state === 1) {
                this.state = 0;
            } else if (this.state === 0) {
                this.state = 1;
            }

            this.addToken(TokenTypes.Quote, Quotes.Normal);
            this.advance(1);
            return true;
        }

        return false;
    }

    runOpenQuote() {
        if (this.separator == null && this.quoted && this.startsWith(Quotes.Open)) {
            if (this.state === 0) {
                this.state = 2;
            } else {
                this.state = 0;
            }

            this.addToken(TokenTypes.OpenQuote, Quotes.Open);
            this.advance(1);
            return true;
        }

        return false;
    }

    runEndQuote() {
        if (this.separator == null && this.quoted && this.startsWith(Quotes.End)) {
            if (this.state === 2) {
                this.state = 0;
            } else {
                this.state = 2;
            }

            this.addToken(TokenTypes.EndQuote, Quotes.End);
            this.advance(1);
            return true;
        }

        return false;
    }

    runSeparator() {
        if (this.separator != null && this.startsWith(this.separator)) {
            this.addToken(TokenTypes.Separator, this.slice(0, this.separator.length));
            this.advance(this.separator.length);
            return true;
        }

        return false;
    }

    runWord() {
        const wordRegex = this.state === 0
            ? /^\S+/
            : new RegExp(`^[^\\s${this.state === 1 ? Quotes.Normal : `${Quotes.Open}${Quotes.End}`}]+`);
        const wordMatch = this.match(wordRegex);
        if (wordMatch) {
            if (this.separator) {
                if (wordMatch[0].toLowerCase() === this.separator.toLowerCase()) {
                    return false;
                }

                const index = wordMatch[0].indexOf(this.separator);
                if (index === -1) {
                    this.addToken(TokenTypes.Word, wordMatch[0]);
                    this.advance(wordMatch[0].length);
                    return true;
                }

                const actual = wordMatch[0].slice(0, index);
                this.addToken(TokenTypes.Word, actual);
                this.advance(actual.length);
                return true;
            }

            this.addToken(TokenTypes.Word, wordMatch[0]);
            this.advance(wordMatch[0].length);
            return true;
        }

        return false;
    }

    runWhitespace() {
        const wsMatch = this.match(/^\s+/);
        if (wsMatch) {
            this.addToken(TokenTypes.WS, wsMatch[0]);
            this.advance(wsMatch[0].length);
            return true;
        }

        return false;
    }
}

class Parser {
    constructor(tokens, { separated }) {
        this.tokens = tokens;
        this.separated = separated;
        this.position = 0;
        /*
         * Phrases are `{ type: TokenTypes.Phrase, value, raw }`.
         * Flags are `{ type: TokenTypes.Flag, key, raw }`.
         * Option flags are `{ type: TokenTypes.OptionFlag, key, value, raw }`.
         * The `all` property is partitioned into `phrases`, `flags`, and `optionFlags`.
         */
        this.results = {
            all: [],
            phrases: [],
            flags: [],
            optionFlags: []
        };
    }

    next() {
        this.position++;
    }

    lookaheadN(n, ...types) {
        return this.tokens[this.position + n] != null && types.includes(this.tokens[this.position + n].type);
    }

    lookahead(...types) {
        return this.lookaheadN(0, ...types);
    }

    match(...types) {
        if (this.lookahead(...types)) {
            this.next();
            return this.tokens[this.position - 1];
        }

        throw new Error(`Unexpected token ${this.tokens[this.position].value} of type ${this.tokens[this.position].type} (this should never happen)`);
    }

    parse() {
        // -1 for EOF.
        while (this.position < this.tokens.length - 1) {
            this.runArgument();
        }

        this.match(TokenTypes.EOF);
        return this.results;
    }

    runArgument() {
        const leading = this.lookahead(TokenTypes.WS) ? this.match(TokenTypes.WS).value : '';
        if (this.lookahead(TokenTypes.FlagWord, TokenTypes.OptionFlagWord)) {
            const parsed = this.parseFlag();
            const trailing = this.lookahead(TokenTypes.WS) ? this.match(TokenTypes.WS).value : '';
            const separator = this.lookahead(TokenTypes.Separator) ? this.match(TokenTypes.Separator).value : '';
            parsed.raw = `${leading}${parsed.raw}${trailing}${separator}`;
            this.results.all.push(parsed);
            if (parsed.type === ResultTypes.Flag) {
                this.results.flags.push(parsed);
            } else {
                this.results.optionFlags.push(parsed);
            }

            return;
        }

        const parsed = this.parsePhrase();
        const trailing = this.lookahead(TokenTypes.WS) ? this.match(TokenTypes.WS).value : '';
        const separator = this.lookahead(TokenTypes.Separator) ? this.match(TokenTypes.Separator).value : '';
        parsed.raw = `${leading}${parsed.raw}${trailing}${separator}`;
        this.results.all.push(parsed);
        this.results.phrases.push(parsed);
    }

    parseFlag() {
        if (this.lookahead(TokenTypes.FlagWord)) {
            const flag = this.match(TokenTypes.FlagWord);
            const parsed = { type: ResultTypes.Flag, key: flag.value, raw: flag.value };
            return parsed;
        }

        // Otherwise, `this.lookahead(TokenTypes.OptionFlagWord)` should be true.
        const flag = this.match(TokenTypes.OptionFlagWord);
        const parsed = { type: ResultTypes.OptionFlag, key: flag.value, value: '', raw: flag.value };
        const ws = this.lookahead(TokenTypes.WS) ? this.match(TokenTypes.WS) : null;
        if (ws != null) {
            parsed.raw += ws.value;
        }

        const phrase = this.lookahead(TokenTypes.Quote, TokenTypes.OpenQuote, TokenTypes.EndQuote, TokenTypes.Word)
            ? this.parsePhrase()
            : null;

        if (phrase != null) {
            parsed.value = phrase.value;
            parsed.raw += phrase.raw;
        }

        return parsed;
    }

    parsePhrase() {
        if (!this.separated) {
            if (this.lookahead(TokenTypes.Quote, TokenTypes.OpenQuote, TokenTypes.EndQuote)) {
                const parsed = { type: ResultTypes.Phrase, value: '', raw: '' };

                const openQuote = this.match(TokenTypes.Quote, TokenTypes.OpenQuote, TokenTypes.EndQuote);
                parsed.raw += openQuote.value;

                // Open quote - end quote / open quote; Normal quote - normal quote
                const enders = openQuote.type === TokenTypes.Quote ? [TokenTypes.Quote] : [TokenTypes.OpenQuote, TokenTypes.EndQuote];

                while (this.lookahead(TokenTypes.Word, TokenTypes.WS)) {
                    const match = this.match(TokenTypes.Word, TokenTypes.WS);
                    parsed.value += match.value;
                    parsed.raw += match.value;
                }
                const endQuote = this.lookahead(...enders) ? this.match(...enders) : null;

                if (endQuote != null) {
                    parsed.raw += endQuote.value;
                }

                return parsed;
            }

            if (this.lookahead(TokenTypes.EndQuote)) {
                const { value } = this.match(TokenTypes.EndQuote);
                return { type: ResultTypes.Phrase, value, raw: value };
            }
        }

        if (this.separated) {
            const init = this.match(TokenTypes.Word);
            const parsed = { type: ResultTypes.Phrase, value: init.value, raw: init.value };
            while (this.lookahead(TokenTypes.WS) && this.lookaheadN(1, TokenTypes.Word)) {
                const ws = this.match(TokenTypes.WS);
                const word = this.match(TokenTypes.Word);
                parsed.value += ws.value + word.value;
            }

            parsed.raw = parsed.value;
            return parsed;
        }

        const { value } = this.match(TokenTypes.Word);
        return { type: ResultTypes.Phrase, value, raw: value };
    }
}

/**
 * Parses content.
 * @param {ContentParserOptions} options - Options.
 * @private
 */
class ContentParser {
    constructor({
        flagWords = [],
        optionFlagWords = [],
        quoted = true,
        separator
    } = {}) {
        this.flagWords = flagWords;
        this.flagWords.sort((a, b) => b.length - a.length);

        this.optionFlagWords = optionFlagWords;
        this.optionFlagWords.sort((a, b) => b.length - a.length);

        this.quoted = Boolean(quoted);
        this.separator = separator;
    }

    /**
     * Parses content.
     * @param {string} content - Content to parse.
     * @returns {ContentParserResult}
     */
    parse(content) {
        const tokens = new Tokenizer(content, {
            flagWords: this.flagWords,
            optionFlagWords: this.optionFlagWords,
            quoted: this.quoted,
            separator: this.separator
        }).tokenize();

        return new Parser(tokens, { separated: this.separator != null }).parse();
    }

    /**
     * Extracts the flags from argument options.
     * @param {ArgumentOptions[]} args - Argument options.
     * @returns {ExtractedFlags}
     */
    static getFlags(args) {
        const res = {
            flagWords: [],
            optionFlagWords: []
        };

        for (const arg of args) {
            const arr = res[arg.match === ArgumentMatches.FLAG ? 'flagWords' : 'optionFlagWords'];
            if (arg.match === ArgumentMatches.FLAG || arg.match === ArgumentMatches.OPTION) {
                if (Array.isArray(arg.flag)) {
                    arr.push(...arg.flag);
                } else {
                    arr.push(arg.flag);
                }
            }
        }

        return res;
    }
}

module.exports = ContentParser;

/**
 * Options for the content parser.
 * @typedef {Object} ContentParserOptions
 * @prop {string[]} [flagWords=[]] - Words considered flags.
 * @prop {string[]} [optionFlagWords=[]] - Words considered option flags.
 * @prop {boolean} [quoted=true] - Whether to parse quotes.
 * @prop {string} [separator] - Whether to parse a separator.
 * @private
 */

/**
 * Result of parsing.
 * @typedef {Object} ContentParserResult
 * @prop {StringData[]} all - All phrases and flags.
 * @prop {StringData[]} phrases - Phrases.
 * @prop {StringData[]} flags - Flags.
 * @prop {StringData[]} optionFlags - Option flags.
 */

/**
 * Flags extracted from an argument list.
 * @typedef {Object} ExtractedFlags
 * @prop {string[]} [flagWords=[]] - Words considered flags.
 * @prop {string[]} [optionFlagWords=[]] - Words considered option flags.
 * @private
 */

/**
 * A single phrase or flag.
 * @typedef {Object} StringData
 * @prop {string} type - One of 'Phrase', 'Flag', 'OptionFlag'.
 * @prop {string} raw - The raw string with whitespace and/or separator.
 * @prop {?string} key - The key of a 'Flag' or 'OptionFlag'.
 * @prop {?string} value - The value of a 'Phrase' or 'OptionFlag'.
 */
