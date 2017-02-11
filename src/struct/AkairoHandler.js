const path = require('path');
const EventEmitter = require('events');
const rread = require('readdir-recursive');
const { Collection } = require('discord.js');
const Category = require('../utils/Category');
const AkairoModule = require('./AkairoModule');
const { AkairoHandlerEvents } = require('../utils/Constants');

/** @extends EventEmitter */
class AkairoHandler extends EventEmitter {
    /**
     * Handles modules.
     * @param {AkairoClient} client - The Akairo client.
     * @param {string} directory - Directory to modules.
     */
    constructor(client, directory){
        super();

        /**
         * The Akairo client.
         * @readonly
         * @type {AkairoClient}
         */
        this.client = client;

        /**
         * Directory to modules.
         * @readonly
         * @type {string}
         */
        this.directory = path.resolve(directory);

        /**
         * Modules loaded, mapped by ID to AkairoModule.
         * @type {Collection.<string, AkairoModule>}
         */
        this.modules = new Collection();

        /**
         * Categories, mapped by ID to Category.
         * @type {Collection.<string, Category>}
         */
        this.categories = new Collection();

        const filepaths = rread.fileSync(this.directory);
        filepaths.forEach(filepath => {
            this.load(filepath);
        });
    }

    /**
     * Loads a module.
     * @param {string} filepath - Path to file.
     * @returns {AkairoModule}
     */
    load(filepath){
        const mod = require(filepath);

        if (!(mod instanceof AkairoModule)) return;
        if (this.modules.has(mod.id)) throw new Error(`${mod.id} already loaded.`);

        mod.filepath = filepath;
        mod.client = this.client;
        mod.handler = this;

        this.modules.set(mod.id, mod);

        if (!this.categories.has(mod.category)) this.categories.set(mod.category, new Category(mod.category));
        const category = this.categories.get(mod.category);
        mod.category = category;
        category.set(mod.id, mod);

        return mod;
    }

    /**
     * Adds a module.
     * @param {string} filename - Filename to lookup in the directory. A .js extension is assumed.
     * @returns {AkairoModule}
     */
    add(filename){
        const files = rread.fileSync(this.directory);
        const filepath = files.find(file => file.endsWith(`${filename}.js`));

        if (!filepath){
            throw new Error(`File ${filename} not found.`);
        }

        const mod = this.load(filepath);
        this.emit(AkairoHandlerEvents.ADD, mod);
        return mod;
    }

    /**
     * Removes a module.
     * @param {string} id - ID of the module.
     * @returns {AkairoModule}
     */
    remove(id){
        const mod = this.modules.get(id);
        if (!mod) throw new Error(`${id} does not exist.`);

        delete require.cache[require.resolve(mod.filepath)];
        this.modules.delete(mod.id);
        
        mod.category.delete(mod.id);

        this.emit(AkairoHandlerEvents.REMOVE, mod);
        return mod;
    }

    /**
     * Reloads a module.
     * @param {string} id - ID of the module.
     * @returns {AkairoModule}
     */
    reload(id){
        const mod = this.modules.get(id);
        if (!mod) throw new Error(`${id} does not exist.`);

        const filepath = mod.filepath;

        delete require.cache[require.resolve(mod.filepath)];
        this.modules.delete(mod.id);

        mod.category.delete(mod.id);
        
        const newMod = this.load(filepath);
        this.emit(AkairoHandlerEvents.RELOAD, newMod);
        return newMod;
    }

    /**
     * Reloads all modules.
     */
    reloadAll(){
        this.modules.forEach(c => c.reload());
    }

    /**
     * Finds a category by name.
     * @param {string} name - Name to find with.
     * @returns {Category}
     */
    findCategory(name){
        return this.categories.find(category => {
            return category.id.toLowerCase() === name.toLowerCase();
        });
    }
}

module.exports = AkairoHandler;

/**
 * Emitted when a module is added.
 * @event AkairoHandler#add
 * @param {AkairoModule} mod - Module added.
 */

/**
 * Emitted when a module is removed.
 * @event AkairoHandler#remove
 * @param {AkairoModule} mod - Module removed.
 */

/**
 * Emitted when a module is reloaded.
 * @event AkairoHandler#reload
 * @param {AkairoModule} mod - Module reloaded.
 */
