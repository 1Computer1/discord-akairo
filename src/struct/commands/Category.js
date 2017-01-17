const Collection = require('discord.js').Collection;

class Category {
    /**
     * Creates a new command category.
     * @param {string} id - ID of the category.
     */
    constructor(id){
        /**
         * ID of the category.
         * @type {string} 
         */
        this.id = id;

        /**
         * Collection of commands, mapped by ID to command.
         * @type {Collection.<string, Command>}
         */
        this.commands = new Collection();
    }

    /**
     * Reloads all commands in this category.
     */
    reloadAll(){
        this.commands.forEach(command => command.reload());
    }

    /**
     * Removes all commands in this category.
     */
    removeAll(){
        this.commands.forEach(command => command.remove());
    }

    /**
     * Gets the first alias of each command.
     * @return {string[]}
     */
    list(){
        return this.commands.map(command => command.aliases[0]);
    }

    /**
     * Returns the ID.
     * @returns {string}
     */
    toString(){
        return this.id;
    }
}

module.exports = Category;