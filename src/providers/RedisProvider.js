const Provider = require('./Provider');
const { promisify } = require("util");
const redis = require('redis');

/**
 * Provider using the official `redis` library.
 * See: https://github.com/NodeRedis/node-redis
 * 
 * Will use the ReJSON module in the Redis server if the redis-rejson node
 * module is included with the project.
 * See: https://oss.redislabs.com/redisjson/
 * See: https://github.com/stockholmux/node_redis-rejson
 * 
 * ReJSON values and regular raw JSON strings are not compatible types in
 * Redis. As such you can't migrate between the two encodings without deleting
 * your keys first.
 * 
 * When constructing key names, assumes the id provided to method arguments
 * is a Discord guild (server) identifier. This will be placed in {} in order
 * for all guild related data to be stored on a single Redis shard.
 * 
 * Keys will look like this: <keyPrefix>ForGuild:{id}
 * 
 * The value stored in redis will be a JSON object so it can hold complex
 * information.
 * 
 * @param {string!} keyPrefix - Prefix for redis keys.
 * @param {object} redisOptions - Object used to initialize redis connection.
 * @param {boolean} cacheInMemory - If we should cache all data in memory.
 * @extends {Provider}
 */
class RedisProvider extends Provider {
  constructor(keyPrefix, redisOptions = {}, cacheInMemory = false) {
    super();

    this.keyPrefix = keyPrefix;
    // Described here: https://github.com/NodeRedis/node-redis#rediscreateclient 
    this.options = redisOptions;
    this.cacheInMemory = cacheInMemory;

    // Add support for ReJSON to the redis client if it's available
    this.useReJSON = false;
    try {
      require('redis-rejson')(redis);
      this.useReJSON = true;
    } catch (err) {
      /* ignore */
    }
    const client = redis.createClient(this.options);

    if (this.useReJSON) {
      this._jsonDel = promisify(client.json_del).bind(client);
      this._jsonGet = promisify(client.json_get).bind(client);
      this._jsonSet = promisify(client.json_set).bind(client);
      this._jsonType = promisify(client.json_type).bind(client);
    }

    this._del = promisify(client.del).bind(client);
    this._get = promisify(client.get).bind(client);
    this._set = promisify(client.set).bind(client);
    this._getRedisKeys = promisify(client.keys).bind(client);
    this._redisKeyExists = promisify(client.exists).bind(client);
  }

  _redisKeyForID(id) {
    return `${this.keyPrefix}ForGuild:{${id}}`;
  }

  /**
   * Initializes the provider.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.cacheInMemory) {
      const keys = await this._getRedisKeys(this._redisKeyForID('*'));
      for (var i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (this.useReJSON) {
          this.items.set(key, JSON.parse(await this._jsonGet(key)));
        } else {
          this.items.set(key, JSON.parse(await this.get(key)));
        }
      }
    }
  }

  /**
   * Gets a value.
   * @param {string} id - ID of entry.
   * @param {string} key - The key to get.
   * @param {any} [defaultValue] - Default value if not found or null.
   * @returns {any}
   */
  async get(id, key, defaultValue) {
    const rKey = this._redisKeyForID(id);
    if (this.cacheInMemory) {
      if (this.items.has(rKey)) {
        const value = this.items.get(rKey)[key];
        if (null != value) {
          return value;
        }
      }
    } else {
      if (this.useReJSON) {
        if (await this._jsonType(rKey) && await this._jsonType(rKey, key)) {
          return JSON.parse(await this._jsonGet(rKey, key));
        }
      } else {
        if (await this._redisKeyExists(rKey)) {
          const data = JSON.parse(await this._get(rKey));
          if (key in data) {
            return data[key];
          }
        }
      }
    }
    return defaultValue;
  }

  /**
   * Sets a value.
   * @param {string} id - ID of entry.
   * @param {string} key - The key to set.
   * @param {any} value - The value.
   * @returns {Promise<Statement>}
   */
  async set(id, key, value) {
    const rKey = this._redisKeyForID(id);
    const exists = await this._redisKeyExists(rKey)
    let data = {}
    if (this.cacheInMemory) {
      data = this.items.get(rKey) || {};
      data[key] = value;
      this.items.set(rKey, data);
    }

    if (!exists) {
      data[key] = value;
    }

    if (this.useReJSON) {
      if (exists) {
        return this._jsonSet(rKey, `.${key}`, JSON.stringify(value));
      } else {
        return this._jsonSet(rKey, '.', JSON.stringify(data));
      }
    } else {
      if (exists) {
        data = JSON.parse(await this._get(rKey));
        data[key] = value;
      }
      return this._set(rKey, JSON.stringify(data));
    }
  }

  /**
   * Deletes a value.
   * @param {string} id - ID of entry.
   * @param {string} key - The key to delete.
   * @returns {Promise<Statement>}
   */
  async delete(id, key) {
    if (this.cacheInMemory) {
      const data = this.items.get(id) || {};
      delete data[key];
    }

    const rKey = this._redisKeyForID(id);
    const exists = await this._redisKeyExists(rKey)
    if (exists) {
      if (this.useReJSON) {
        return this._jsonDel(rKey, key)
      } else {
        const data = JSON.parse(await this._get(rKey));
        delete data[key];
        return this._set(rKey, JSON.stringify(data))
      }
    }
  }

  /**
   * Clears an entry.
   * @param {string} id - ID of entry.
   * @returns {Promise<Statement>}
   */
  async clear(id) {
    if (this.cacheInMemory) {
      this.items.delete(id);
    }

    const rKey = this._redisKeyForID(id);
    if (this.useReJSON) {
      return this._jsonDel(rKey, '.');
    } else {
      return this._del(rKey);
    }
  }
}

module.exports = RedisProvider;
