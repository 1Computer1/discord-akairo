const { Command } = require('../../');

class InitTestCommand extends Command {
    constructor() {
        super('init', {
            aliases: ['initest'],
            description: {
                content: 'Sends text to test `init`'
            }
        });
    }

    init() {
        this.text = this.client.user.tag;
    }

    exec(message) {
        return message.reply(this.text);
    }
}

module.exports = InitTestCommand;
