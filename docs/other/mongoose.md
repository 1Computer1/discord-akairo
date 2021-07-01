# Using Mongoose Provider

### Storing Prefixes

Let's implement per-guild prefixes.  
First, create a new MongooseProvider.

```js
// It is better to init mongoose in another file (eg. main.js)
// connect to database and then require this file (eg. bot.js)
const model = require('./path/to/model'); // see Model Example below

const { AkairoClient, MongooseProvider } = require('discord-akairo');

class CustomClient extends AkairoClient {
    constructor() {
        super({
            /* Options here */
        });

        // Mongoose Provider
        this.settings = new MongooseProvider(model);
    }
}
```

Before you can actually use the provider, you would have to run the `init` method.  
For example:

```js
class CustomClient extends AkairoClient {
    /* ... */
    async login(token) {
        await this.settings.init();
        return super.login(token);
    }
}
```

Now, the provider can be used like so:

```js
class CustomClient extends AkairoClient {
    constructor() {
        super({
            prefix: (message) => {
                if (message.guild) {
                    // The third param is the default.
                    return this.settings.get(message.guild.id, 'prefix', '!');
                }

                return '!';
            }
        });

        /* ... */
    }
}
```

Values can be set with the `set` method:

```js
const { Command } = require('discord-akairo');

class PrefixCommand extends Command {
    constructor() {
        super('prefix', {
            aliases: ['prefix'],
            category: 'stuff',
            args: [
                {
                    id: 'prefix',
                    default: '!'
                }
            ],
            channel: 'guild'
        });
    }

    async exec(message, args) {
        // The third param is the default.
        const oldPrefix = this.client.settings.get(message.guild.id, 'prefix', '!');

        await this.client.settings.set(message.guild.id, 'prefix', args.prefix);
        return message.reply(`Prefix changed from ${oldPrefix} to ${args.prefix}`);
    }
}

module.exports = PrefixCommand;
```

### Model Example

```js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const guildSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    settings: {
        type: Object,
        required: true
    }
}, { minimize: false });

module.exports = mongoose.model('model', guildSchema);
```
