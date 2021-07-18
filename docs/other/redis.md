# Using Redis Provider

DISCLAIMER: As with all Akairo Providers, if you are doing complex stuff, you should
work directly with your database APIs. The Provider interface allows for a pretty
hands-off approach to storing data associated with each Discord Guild/Server.

### Installation

Add the [node-redis](https://github.com/NodeRedis/node-redis) package as a dependency:

```
npm install redis
```

If you have the [ReJSON](https://oss.redislabs.com/redisjson/) module on your Redis
server, you can also install the
[node_redis-rejson](https://github.com/stockholmux/node_redis-rejson) package:

```
npm install redis-rejson
```

WARNING: Do not install `redis-rejson` if you don't have the `ReJSON` module installed
on your Redis server!

NOTE: Once you have written data with or without `ReJSON` you can't change your mind
without removing all existing data or writing your own migration scripts.

### Storing Prefixes

Let's implement per-guild prefixes.  
First, create a new RedisProvider.

```js
const { AkairoClient, RedisProvider } = require('discord-akairo');

class CustomClient extends AkairoClient {
    constructor() {
        super({
            /* Options here */
        });

        // Redis Provider
        this.settings = new RedisProvider('Settings');
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

### Under the hood

Redis is a key-value store. Unlike a traditional database, we can't have more than
these two columns. As a result we have to map several pieces of information into
the Redis key and then we store a JSON object as the Redis value.

The Redis key will be `<keyPrefix>ForGuild:{<id>}`. In our example above, we set the
keyPrefix to `Settings`, for a Guild/Server id of `579156553056256019`, we end up
with this Redis key: `SettingsForGuild:{579156553056256019}`.

Now if we add some settings data like this:

```js
await this.client.settings.set(message.guild.id, 'one', 'partridge');
await this.client.settings.set(message.guild.id, 'two', 'calling doves');
await this.client.settings.set(message.guild.id, 'three', 'french hens');
```

We will end up with the following in Redis:

```
KEY: SettingsForGuild:{579156553056256019}
VALUE: {"one": "partridge", "two": "calling doves", "three": "french hens"}
```

Our other providers load all of the data into memory on init and then make sure that
additions/changes are reflected in the database. This Provider can do the same thing
if you pass set `cacheInMemory` to `true` in the `RedisProvider` constructor.

Given that Redis is itself an in-memory database this is off by default. This may
result in a slight delay when reading data while reducing the memory requirements
for our bot.

If you need to configure the Redis client (host/port/username/password/etc) you can
pass the `redisOptions` object to the RedisProvider constructor as the second
argument.

The list of possible options are documented
[here](https://github.com/NodeRedis/node-redis#rediscreateclient).

### Testing with Docker

Following are some instructions for setting up a Docker container for testing your
bot. Please don't use these instructions for production without doing your own
due-dilligence first.

Following assumes you have a `data` directory in the directory where you run this
command to persist your data:

#### Unix with ReJSON
```
docker run --rm -d ^
           --name discord-bot-redis ^
           --publish 127.0.0.1:6379:6379 ^
           -v ${pwd}/data:/data ^
           redislabs/rejson:latest ^
           redis-server --loadmodule /usr/lib/redis/modules/rejson.so --appendonly yes
```

#### Windows with ReJSON
```
docker run --rm -d ^
           --name discord-bot-redis ^
           --publish 127.0.0.1:6379:6379 ^
           -v %CD%/data:/data ^
           redislabs/rejson:latest ^
           redis-server --loadmodule /usr/lib/redis/modules/rejson.so --appendonly yes
```

#### Unix without ReJSON
```
docker run --rm -d ^
           --name discord-bot-redis ^
           --publish 127.0.0.1:6379:6379 ^
           -v ${pwd}/data:/data ^
           redis:6.0-alpine ^
           redis-server --appendonly yes
```

#### Windows without ReJSON
```
docker run --rm -d ^
           --name discord-bot-redis ^
           --publish 127.0.0.1:6379:6379 ^
           -v %CD%/data:/data ^
           redis:6.0-alpine ^
           redis-server --loadmodule /usr/lib/redis/modules/rejson.so --appendonly yes
```
