# Additonal Features
Ability to enable and disable commands

[Fixed outdated function references in ClientUtil](https://github.com/discord-akairo/discord-akairo/pull/202)

[Added ClientUtil#permissionNames to typings](https://github.com/discord-akairo/discord-akairo/pull/188)

[typings(InhibitorOptions): improve 'type' type](https://github.com/discord-akairo/discord-akairo/pull/186)

[fix(typings): Made 3 improvements](https://github.com/discord-akairo/discord-akairo/pull/182)

[Remove unnecessary second CommandHandler prefix function call](https://github.com/discord-akairo/discord-akairo/pull/177)

[Fixed Type For Aliasas](https://github.com/discord-akairo/discord-akairo/pull/172)

[Support 'timespan' ArgumentType](https://github.com/discord-akairo/discord-akairo/pull/163)

[refactor(Util): remove custom flatMap implementation](https://github.com/discord-akairo/discord-akairo/pull/118)

[feat: update for discord.js v13](https://github.com/discord-akairo/discord-akairo/pull/179) Just adds inline repies replies for CommandUtil#reply

## Installation

Requires Node 12+ and Discord.js v12.  

*discord-akairo*  
`npm install greysilly7/discord-akairo` or `yarn add greysilly7/discord-akairo`

*discord.js*  
`npm install discordjs/discord.js`


## Links

- [Website](https://discord-akairo.github.io)
- [Repository](https://github.com/discord-akairo/discord-akairo)  
- [Changelog](https://github.com/discord-akairo/discord-akairo/releases)
- [Discord](https://discord.gg/arTauDY)  

## Contributing

Open an issue or a pull request!  
Everyone is welcome to do so.  
Make sure to run `npm test` before committing.  

## Explains some of the features
Enabling/Disabling a Command: Just add enabled to the super of the command it is a boolan true equals enabled false equals disabled
`Support 'timespan' ArgumentType` to do this in your argument just set the type to `timespan`
