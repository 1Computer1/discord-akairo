<p align="center">
    <a href=https://github.com/1Computer1/discord-akairo>
        <img src=https://u.nya.is/fweoqf.png/>
    </a>
</p>  

<p align="center">
    <a href=https://nodei.co/npm/discord-akairo>
        <img src=https://nodei.co/npm/discord-akairo.png/>
    </a>
</p>  

## About
A modular and customizable bot framework for Discord.js v11.  
Everything is reloadable, commands are easy to make, and argument parsing is very flexible.  

```js
const { AkairoClient } = require('discord-akairo');

const client = new AkairoClient({
    ownerID: '9876543210',
    prefix: '$',
    commandDirectory: './src/commands/',
    inhibitorDirectory: './src/inhibitors/',
    listenerDirectory: './src/listeners/'
});

client.login('TOKEN').then(() => {
    console.log('Started up!');
});
```

## Features
- Modules for commands, inhibitors, and listeners.
- Extremely flexible command options and behavior.
- Many types of arguments, including flag arguments.
- Prompting for arguments.
- Handling edited messages.
- Resolvers for Discord objects.
- Lots of utilities.
- Easy way to use SQLite.
- Easily extendable classes.

## Installation
discord-akairo: `npm install discord-akairo --save`  
discord.js: `npm install discord.js --save`  
sqlite (optional): `npm install sqlite --save`  

## Links
Repository is available at [https://github.com/1Computer1/discord-akairo](https://github.com/1Computer1/discord-akairo).  
Changelog is available at [https://github.com/1Computer1/discord-akairo/releases](https://github.com/1Computer1/discord-akairo/releases).  
Documentation is available at [https://1computer1.github.io/discord-akairo](https://1computer1.github.io/discord-akairo/).  
If you need more help, message me on Discord: 1Computer#7952.  

## Tutorials
1. [Setting Up a Bot](https://1computer1.github.io/discord-akairo/tutorial-1.%20Setting%20Up%20a%20Bot.html)
2. [Creating a Command](https://1computer1.github.io/discord-akairo/tutorial-2.%20Creating%20a%20Command.html)
3. [Customizing Commands](https://1computer1.github.io/discord-akairo/tutorial-3.%20Customizing%20Commands.html)
4. [Creating an Inhibitor](https://1computer1.github.io/discord-akairo/tutorial-4.%20Creating%20an%20Inhibitor.html)
5. [Creating a Listener](https://1computer1.github.io/discord-akairo/tutorial-5.%20Creating%20a%20Listener.html)
6. [Storing Data with SQLite](https://1computer1.github.io/discord-akairo/tutorial-6.%20Storing%20Data%20with%20SQLite.html)
7. [Regex and Conditionals](https://1computer1.github.io/discord-akairo/tutorial-7.%20Regex%20and%20Conditionals.html)
8. [Argument Prompting](https://1computer1.github.io/discord-akairo/tutorial-8.%20Argument%20Prompting.html)
9. [Handling Edits](https://1computer1.github.io/discord-akairo/tutorial-9.%20Handling%20Edits.html)
