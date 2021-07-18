const { Command } = require('../..');

class EmbedCommand extends Command {
    constructor() {
        super('embed', {
            aliases: ['embed'],
            args: [
                {
                    id: 'emptyContent',
                    match: 'flag',
                    flag: '-c'
                },
                {
                    id: 'emptyEmbed',
                    match: 'flag',
                    flag: '-e'
                },
                {
                    id: 'phrase',
                    match: 'phrase'
                }
            ]
        });
    }

    exec(message, { emptyContent, emptyEmbed, phrase }) {
        if (emptyContent) {
            return message.util.send({ embed: { description: phrase } });
        }

        if (emptyEmbed) {
            return message.util.send(phrase);
        }

        return message.util.send(phrase, { embed: { description: phrase } });
    }
}

module.exports = EmbedCommand;
