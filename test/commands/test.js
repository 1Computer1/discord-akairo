const { Command } = require('../../src/index.js');

function exec(message, args){
    return console.log(args);
}

module.exports = new Command('test', exec, {
    aliases: ['test', 't'],
    args: [
        {
            id: 'thing',
            type: 'number',
            prompt: {
                start: () => ({ embed: { title: 'text from argument' } })
            }
        },
        {
            id: 'thing2',
            type: 'number',
            prompt: {
                retries: 1
            }
        },
        {
            id: 'thing3',
            type: 'member',
            prompt: {
                start: () => 'Optional member.',
                optional: true
            },
            default: 123
        }
    ],
    defaultPrompt: {
        start: () => 'text from command',
        retries: 5
    }
});
