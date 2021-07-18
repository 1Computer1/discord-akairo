# Accessing the Client

## After Instantiation

The client is available to any `AkairoModule` through `this.client`, except for the constructor, because the client is attached after instantiation.

## Inside constructors

In any `AkairoModule` constructor, the corresponding `AkairoHandler` is passed through to the constructor,
so the client can be accessed with `handler.client`:

```js
const { Command } = require('discord-akairo');

class TextCommand extends Command {
    constructor(handler) {
        super('text', {
            aliases: ['text']
        });
      this.text = handler.client.someProperty.someMethod().toText();
    }

    exec(message) {
        return message.reply(this.text);
    }
}

module.exports = TextCommand;
```

## Ready client

What if we need to access some property of a **ready** client just one time? (this could be users, guild, anything that needs connection to Discord)

We can use the `init` method of `AkairoModule`s, called by the handler once the client becomes ready:

```js
const { Command } = require('discord-akairo');

class TextCommand extends Command {
    constructor() {
        super('text', {
            aliases: ['text']
        });
    }

    init() {
      this.text = handler.client.users.cache.get('ID').tag;
    }

    exec(message) {
        return message.reply(this.text);
    }
}

module.exports = TextCommand;
```

## Notes

For every `init` call, whether implemented or not, a `AkairoHandler#init` event emits, with the initiated module as the first and only parameter.

After all modules have been initiated, the handler emits `initiated` with no paremeters.