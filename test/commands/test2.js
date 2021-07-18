const { Argument: { compose, range, union }, Command } = require('../..');

class Test2Command extends Command {
    constructor() {
        super('test2', {
            aliases: ['test2'],
            cooldown: 5000,
            prefix: () => ['/', '>'],
            args: [
                {
                    id: 'y',
                    match: 'rest',
                    type: compose((m, s) => s.replace(/\s/g, ''), range(union('integer', 'emojint'), 0, 50))
                }
            ]
        });
    }

    exec(message, { y }) {
        return message.util.send(`y -> ${y}`);
    }
}

module.exports = Test2Command;
