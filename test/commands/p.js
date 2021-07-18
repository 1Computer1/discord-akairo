/* eslint-disable no-console */

const { Command } = require('../..');

class PCommand extends Command {
    constructor() {
        super('p', {
            aliases: ['p'],
            args: [
                {
                    id: 'integer',
                    type: 'bigint',
                    prompt: {
                        start: async () => {
                            await Promise.resolve(1);
                            return 'Give me an integer!';
                        },
                        retry: 'That\'s not an integer, try again!',
                        optional: false
                    }
                }
            ]
        });
    }

    before() {
        console.log('p command: before');
    }

    exec(message, { integer }) {
        return message.util.send(`integer -> ${integer}`);
    }
}

module.exports = PCommand;
