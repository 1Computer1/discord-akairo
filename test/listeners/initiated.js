/* eslint-disable no-console */

const { Listener } = require('../../src');

class InitiatedListener extends Listener {
    constructor() {
        super('initiated', {
            emitter: 'commandHandler',
            event: 'initiated',
            category: 'commandHandler'
        });
    }

    exec() {
        console.log('All commands initiated!');
    }
}

module.exports = InitiatedListener;
