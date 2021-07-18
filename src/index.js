module.exports = {
    // Core
    AkairoClient: require('./struct/AkairoClient'),
    AkairoHandler: require('./struct/AkairoHandler'),
    AkairoModule: require('./struct/AkairoModule'),
    ClientUtil: require('./struct/ClientUtil'),

    // Commands
    Command: require('./struct/commands/Command'),
    CommandHandler: require('./struct/commands/CommandHandler'),
    CommandUtil: require('./struct/commands/CommandUtil'),
    Flag: require('./struct/commands/Flag'),

    // Arguments
    Argument: require('./struct/commands/arguments/Argument'),
    TypeResolver: require('./struct/commands/arguments/TypeResolver'),

    // Inhibitors
    Inhibitor: require('./struct/inhibitors/Inhibitor'),
    InhibitorHandler: require('./struct/inhibitors/InhibitorHandler'),

    // Listeners
    Listener: require('./struct/listeners/Listener'),
    ListenerHandler: require('./struct/listeners/ListenerHandler'),

    // Providers
    Provider: require('./providers/Provider'),
    SequelizeProvider: require('./providers/SequelizeProvider'),
    SQLiteProvider: require('./providers/SQLiteProvider'),
    MongooseProvider: require('./providers/MongooseProvider'),
    RedisProvider: require('./providers/RedisProvider'),

    // Utilities
    AkairoError: require('./util/AkairoError'),
    Category: require('./util/Category'),
    Constants: require('./util/Constants'),
    Util: require('./util/Util'),
    version: require('../package.json').version
};
