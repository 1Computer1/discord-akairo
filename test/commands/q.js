const { Command } = require('../..');

class QCommand extends Command {
    constructor() {
        super('q', {
            aliases: ['q']
        });
    }

    exec(message) {
        const command = this.handler.modules.get('p');
        return this.handler.handleDirectCommand(message, '', command);
    }
}

module.exports = QCommand;
