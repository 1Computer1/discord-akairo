# Ping Command

```js
const { Command } = require('discord-akairo');

class PingCommand extends Command {
    constructor() {
        super('ping', {
            aliases: ['ping', 'hello']
        });
    }

    async exec(message) {
        const sent = await message.util.reply('Pong!');
        const timeDiff = (sent.editedAt || sent.createdAt) - (message.editedAt || message.createdAt);
        return message.util.reply(
            'Pong!\n' +
            `🔂 **RTT**: ${timeDiff} ms\n` +
            `💟 **Heartbeat**: ${Math.round(this.client.ws.ping)} ms`
        );
    }
}

module.exports = PingCommand;
```
