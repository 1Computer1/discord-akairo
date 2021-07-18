const { Command } = require('../..');
const sleep = require('util').promisify(setTimeout);

class LockCommand extends Command {
    constructor() {
        super('lock', {
            aliases: ['lock'],
            lock: 'guild'
        });
    }

    exec(message) {
        return [0, 1, 2, 3, 4].reduce((promise, num) => promise.then(() => sleep(1000)).then(() => message.util.send(num.toString())), Promise.resolve());
    }
}

module.exports = LockCommand;
