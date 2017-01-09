const path = require('path');
const sql = require('sqlite');

class SQLiteHandler {
    /**
     * Creates an SQLiteHandler.
     * @param {string} filepath Path to .sqlite file.
     * @param {string} tableName Name of the table.
     * @param {Object} defaultConfig Default configuration.
     */
    constructor(filepath, tableName, defaultConfig = {}){
        /**
         * Path to .sqlite file.
         * @type {string}
         */
        this.filepath = path.resolve(filepath);

        /**
         * Name of the table.
         * @type {string}
         */
        this.tableName = tableName;

        /**
         * Default configuration.
         * @type {Object}
         */
        this.defaultConfig = defaultConfig;

        /**
         * The SQLite database.
         * @type {?Object}
         */
        this.db;

        /** 
         * Configurations stored in memory, mapped by ID to configuration.
         * @type {Map<string, Object>}
         */
        this.memory = new Map();
    }

    /**
     * Opens the database so that it can be used.
     * @return {Promise.<Database>}
     */
    open(){
        return new Promise((resolve, reject) => {
            sql.open(this.filepath).then(db => {
                this.db = db;
                resolve(this.db);
            }).catch(reject);
        });
    }

    /**
     * Initializes handler and database with IDs.
     * @param ids {Array.<string>} Array of IDs.
     * @returns {Promise.<SQLiteHandler>}
     */
    init(ids){
        return new Promise((resolve, reject) => {
            this.open().then(db => {
                db.all(`SELECT * FROM "${this.tableName}"`).then(rows => {
                    rows.forEach((row) => {
                        this.memory.set(row.id, row);
                    });

                    ids.forEach(id => {
                        if (!this.has(id)){
                            this.add(id).catch(reject);
                        }
                    });
                    
                    resolve(this);
                }).catch(reject);
            }).catch(reject);
        });
    }

    /**
     * Adds into the database.
     * @param {string} id ID of entry.
     * @returns {Promise.<SQLiteHandler>}
     */
    add(id){
        return new Promise((resolve, reject) => {
            if (this.has(id)) return reject(`${id} already exists.`);

            this.db.run(`INSERT INTO "${this.tableName}" (id) VALUES ('${id}')`).then(() => {
                let config = this.defaultConfig;

                config.id = id;
                this.memory.set(id, config);

                resolve(this);
            }).catch(reject);
        });
    }

    /**
     * Adds into the in-memory config.
     * @param {string} id ID of entry.
     * @returns {SQLiteHandler}
     */
    addMemory(id){
        if (this.has(id)) throw new Error(`${id} already exists.`);

        let config = this.defaultConfig;

        config.id = id;
        this.memory.set(id, config);
        return this;
    }

    /**
     * Removes from the database.
     * @param {string} id ID of entry.
     * @returns {Promise.<SQLiteHandler>}
     */
    remove(id){
        return new Promise((resolve, reject) => {
            if (!this.has(id)) return reject(`${id} does not exist.`);
            
            this.db.run(`DELETE FROM "${this.tableName}" WHERE id = '${id}'`).then(() => {
                this.memory.delete(id);
                resolve(this);
            }).catch(reject);
        });
    }

    /**
     * Removes from the in-memory config.
     * @param {string} id ID of entry.
     * @returns {SQLiteHandler}
     */
    removeMemory(id){
        if (!this.has(id)) throw new Error(`${id} does not exist.`);
        this.memory.delete(id);
        return this;
    }

    /**
     * Checks if ID exists in config.
     * @param {string} id ID of entry.
     * @returns {boolean}
     */
    has(id){
        return this.memory.has(id);
    }

    /**
     * Gets configuration for an ID.
     * @param {string} id ID of entry.
     * @returns {Object}
     */
    get(id){
        if (!this.has(id)) return this.defaultConfig;
        
        let config = this.memory.get(id);
        let copy = {};

        Object.keys(config).forEach(key => {
            if (config[key] === null) return copy[key] = this.defaultConfig[key];
            copy[key] = config[key];
        });

        return copy;
    }

    /**
     * Updates the database.
     * @param {string} id ID of entry.
     * @param {string} key Key to set.
     * @param {string|number} value Value to set.
     * @returns {Promise.<SQLiteHandler>}
     */
    set(id, key, value){
        return new Promise((resolve, reject) => {
            key = key.replace(/'/g, '\'\'');
            value = (typeof value === 'string' ? value.replace(/'/g, '\'\'') : value);

            if (!this.has(id)){
                return reject(new Error(`${id} not found.`));
            }

            let config = this.memory.get(id);

            if (!(key in config)){
                return reject(new Error(`Key ${key} was not found for ${id}.`));
            }

            if (key === 'id'){
                return reject(new Error(`Key ${key} is read-only.`));
            }

            config[key] = value;
            this.memory.set(id, config);

            if (isNaN(value)){
                value = `'${value}'`;
            }
            
            this.db.run(`UPDATE "${this.tableName}" SET ${key} = ${value} WHERE id = '${id}'`).then(() => {
                resolve(this);
            }).catch(reject);
        });
    }

    /**
     * Updates the in-memory configuration.
     * @param {string} id ID of entry.
     * @param {string} key Key to set.
     * @param {string|number} value Value to set.
     * @returns {SQLiteHandler}
     */
    setMemory(id, key, value){
        key =  key.replace(/'/g, '\'\'');
        value = (typeof value === 'string' ? value.replace(/'/g, '\'\'') : value);

        if (!this.has(id)){
            throw new Error(`${id} not found.`);
        }

        let config = this.memory.get(id);

        if (!(key in config)){
            throw new Error(`Key ${key} was not found for ${id}.`);
        }

        if (key === 'id'){
            throw new Error(`Key ${key} is read-only.`);
        }

        config[key] = value;
        this.memory.set(id, config);
        return this;
    }

    /**
     * Saves an in-memory config to the database.
     * @param {string} id ID to save.
     * @returns {Promise.<SQLiteHandler>}
     */
    save(id){
        return new Promise((resolve, reject) => {
            if (!this.has(id)){
                return reject(new Error(`${id} not found.`));
            }

            let config = this.memory.get(id);
            let sets = [];

            Object.keys(config).forEach(k => {
                let key =  k.replace(/'/g, '\'\'');
                let value = (typeof config[key] === 'string' ? config[key].replace(/'/g, '\'\'') : config[key]);

                if (isNaN(value)){
                    value = `'${value}'`;
                }

                sets.push(`${key} = ${value}`);
            });

            this.db.run(`UPDATE "${this.tableName}" SET ${sets.join(', ')} WHERE id = '${id}'`).then(() => {
                resolve(this);
            }).catch(reject);
        });
    }
}

module.exports = SQLiteHandler;