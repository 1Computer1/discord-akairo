const { Command } = require('../../src');
const { inspect } = require('util');

class SubCommand extends Command {
    constructor() {
        super('sub', {
            args: [
                {
                    id: 'thing'
                }
            ]
        });
    }

    exec(message, args) {
        return message.util.send(inspect(args, { depth: 1 }), { code: 'js' });
    }
}

module.exports = SubCommand;
