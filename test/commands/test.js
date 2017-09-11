/* eslint-disable no-console */

const { Command } = require('../..');
const util = require('util');

class TestCommand extends Command {
    constructor() {
        super('test', {
            aliases: ['test'],
            args: [
                {
                    id: 'number',
                    type: 'number',
                    prompt: {
                        start: 'Type a number!',
                        retry: 'Please type a valid number.'
                    },
                    cancel: value => value > 10 ? 'Value is over 10' : null
                },
                {
                    id: 'number2',
                    type: 'number',
                    prompt: {
                        start: 'Type a number!',
                        retry: 'Please type a valid number.'
                    }
                }
            ]
        });
    }

    exec(message, args) {
        message.channel.send(util.inspect(args), { code: 'js' });
    }
}

module.exports = TestCommand;
