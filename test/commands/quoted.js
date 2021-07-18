/* eslint-disable no-console */

const { Command } = require('../../src');
const { inspect } = require('util');

class QuotedCommand extends Command {
    constructor() {
        super('quoted', {
            args: [{
                id: 'normal',
                type: 'string'
            }, {
                id: 'special',
                type: 'string'
            }]
        });
    }

    exec(message, args) {
        return message.util.send(inspect(args, { depth: 1 }), { code: 'js' });
    }
}

module.exports = QuotedCommand;
