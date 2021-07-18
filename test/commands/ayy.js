const { Command } = require('../..');

class AyyCommand extends Command {
    constructor() {
        super('ayy', {
            regex: /^ayy+$/i
        });
    }

    exec(message) {
        return message.util.reply('lmao');
    }
}

module.exports = AyyCommand;
