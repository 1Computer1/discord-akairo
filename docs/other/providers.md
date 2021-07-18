# Using Providers

### Storing Prefixes

Akairo comes with SQLiteProvider and SequelizeProvider, optional utility classes for databases.  
Note that if you are doing something complicated with databases, you should use SQLite or Sequelize directly.  

Let's implement per-guild prefixes.  
First, create a new SQLiteProvider or SequelizeProvider.  

```js
const sqlite = require('sqlite');
const { Database } = require('sqlite3');

const sequelize = require('sequelize');

const { AkairoClient, SQLiteProvider, SequelizeProvider } = require('discord-akairo');

class CustomClient extends AkairoClient {
    constructor() {
        super({
            /* Options here */
        });

        // With SQLite
        this.settings = new SQLiteProvider(sqlite.open({ filename: 'path/to/db.sqlite', driver: Database }), 'table_name', {
            idColumn: 'guild_id',
            dataColumn: 'settings'
        });

        // Or, with sequelize
        this.settings = new SequelizeProvider(/* Sequelize model here */, {
            idColumn: 'guild_id',
            dataColumn: 'settings'
        });
    }
}
```

The providers only handle one table at a time.  
Notice that you can set the `idColumn` and the `dataColumn`.  

The `idColumn` defaults to `id` and is the unique key for that table.  
The `dataColumn` is optional and will change the behavior of the provider in relation with the database.  

When the `dataColumn` is provided, the provider will parse a single column as JSON in order to set values.  
For Sequelize, remember to set that column's type to JSON or JSONB.  

When `dataColumn` is not provided, the provider will work on all columns of the table instead.  

Before you can actually use the provider, you would have to run the `init` method.  
For example:  

```js
class CustomClient extends AkairoClient {
    /* ... */
    async login(token) {
        await this.settings.init()
        return super.login(token);
    }
}
```

Now, the provider can be used like so:  

```js
class CustomClient extends AkairoClient {
    constructor() {
        super({
            prefix: message => {
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
