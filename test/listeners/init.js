/* eslint-disable no-console */

const { Listener } = require('../../src');

class InitListener extends Listener {
    constructor() {
        super('init', {
            emitter: 'commandHandler',
            event: 'init',
            category: 'commandHandler'
        });
    }

    exec(mod) {
        console.log('Command initiated:', mod.id);
    }
}

module.exports = InitListener;
