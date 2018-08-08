const { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler, SQLiteProvider, TypeHandler } = require('../../src/index');
const sqlite = require('sqlite');

class TestClient extends AkairoClient {
    constructor() {
        super({
            ownerID: '123992700587343872'
        });

        this.commandHandler = new CommandHandler(this, {
            directory: './test/commands/',
            ignoreCooldownID: ['132266422679240704'],
            aliasReplacement: /-/g,
            handleEdits: true,
            prefix: '!!',
            allowMention: true,
            storeMessages: true,
            defaultPrompt: {
                start: 'What is thing?',
                modifyStart: (text, msg) => `${msg.author}, ${text}\nType \`cancel\` to cancel this command.`,
                retry: 'What is thing, again?',
                modifyRetry: (text, msg) => `${msg.author}, ${text}\nType \`cancel\` to cancel this command.`,
                timeout: 'Out of time.',
                ended: 'No more tries.',
                cancel: 'Cancelled.'
            }
        });

        this.inhibitorHandler = new InhibitorHandler(this, {
            directory: './test/inhibitors/'
        });

        this.listenerHandler = new ListenerHandler(this, {
            directory: './test/listeners/'
        });

        this.typeHandler = new TypeHandler(this, {
            directory: './test/types/'
        });

        const db = sqlite.open('./test/db.sqlite')
            .then(d => d.run('CREATE TABLE IF NOT EXISTS guilds (id TEXT NOT NULL UNIQUE, settings TEXT)').then(() => d));
        this.settings = new SQLiteProvider(db, 'guilds', { dataColumn: 'settings' });

        this.setup();
    }

    setup() {
        this.commandHandler
            .useInhibitorHandler(this.inhibitorHandler)
            .useTypeHandler(this.typeHandler);

        this.typeHandler
            .useCommandHandler(this.commandHandler)
            .useInhibitorHandler(this.inhibitorHandler)
            .useListenerHandler(this.listenerHandler);

        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            inhibitorHandler: this.inhibitorHandler,
            listenerHandler: this.listenerHandler
        });

        this.commandHandler.loadAll();
        this.inhibitorHandler.loadAll();
        this.listenerHandler.loadAll();
        this.typeHandler.loadAll();
    }

    async start(token) {
        await this.settings.init();
        await this.login(token);
        console.log('Ready!'); // eslint-disable-line no-console
    }
}

module.exports = TestClient;
