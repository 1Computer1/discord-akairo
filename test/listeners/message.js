/* eslint-disable no-console */

const { Listener } = require('../..');

class MessageListener extends Listener {
    constructor() {
        super('message', {
            emitter: 'client',
            event: 'message',
            category: 'client'
        });
    }

    exec(msg) {
        console.log('message:', msg.content);
    }
}

module.exports = MessageListener;
