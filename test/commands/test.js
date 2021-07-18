const { Argument: { compose, range, union }, Command } = require('../..');

class TestCommand extends Command {
    constructor() {
        super('test', {
            aliases: ['test', 'test-a'],
            cooldown: 5000,
            prefix: ['$', '%'],
            args: [
                {
                    id: 'x',
                    match: 'rest',
                    type: compose((m, s) => s.replace(/\s/g, ''), range(union('integer', 'emojint'), 0, 50))
                }
            ]
        });
    }

    exec(message, { x }) {
        return message.util.send(`x -> ${x}`);
    }
}

module.exports = TestCommand;
