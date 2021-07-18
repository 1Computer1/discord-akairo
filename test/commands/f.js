/* eslint-disable no-console */

const { Command, Flag } = require('../..');
const { inspect } = require('util');

class FCommand extends Command {
    constructor() {
        super('f', {
            aliases: ['f'],
            args: [
                {
                    id: 'x',
                    type: (msg, phrase) => {
                        if (phrase.length > 10) {
                            return Flag.fail(phrase);
                        }

                        return phrase;
                    },
                    default: (msg, value) => {
                        console.log('f command: failed', value);
                        return 1;
                    }
                }
            ]
        });
    }

    exec(message, args) {
        return message.util.send(inspect(args, { depth: 1 }), { code: 'js' });
    }
}

module.exports = FCommand;
