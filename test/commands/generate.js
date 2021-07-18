const { Command, Flag } = require('../..');

class GenerateCommand extends Command {
    constructor() {
        super('generate', {
            aliases: ['generate', 'g']
        });
    }

    *args() {
        const x = yield {
            type: ['1', '2'],
            otherwise: 'Type 1 or 2!'
        };

        if (x === '1') {
            return Flag.continue('sub');
        }

        return { x };
    }

    exec(message, { x }) {
        return message.util.send(`X -> ${x}`);
    }
}

module.exports = GenerateCommand;
