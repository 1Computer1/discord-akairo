const { Command } = require('../..');
const { inspect } = require('util');

class SeparateCommand extends Command {
    constructor() {
        super('separate', {
            aliases: ['separate', 'sep'],
            args: [
                {
                    id: 'integers',
                    match: 'separate',
                    type: 'integer',
                    prompt: {
                        start: 'Give me some integers!',
                        retry: (msg, { phrase }) => `"${phrase}" is not an integer, try again!`
                    }
                }
            ]
        });
    }

    exec(message, { integers }) {
        return message.util.send(inspect(integers, { depth: 1 }), { code: 'js' });
    }
}

module.exports = SeparateCommand;
