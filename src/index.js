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

    // Arguments
    Argument: require('./struct/commands/arguments/Argument'),
    Control: require('./struct/commands/arguments/Control'),
    Parser: require('./struct/commands/arguments/Parser'),
    TypeResolver: require('./struct/commands/arguments/TypeResolver'),

    // Inhibitors
    Inhibitor: require('./struct/Inhibitor'),
    InhibitorHandler: require('./struct/InhibitorHandler'),

    // Listeners
    Listener: require('./struct/Listener'),
    ListenerHandler: require('./struct/ListenerHandler'),

    // Providers
    Provider: require('./providers/Provider'),
    SequelizeProvider: require('./providers/SequelizeProvider'),
    SQLiteProvider: require('./providers/SQLiteProvider'),

    // Utilities
    AkairoError: require('./util/AkairoError'),
    Category: require('./util/Category'),
    Constants: require('./util/Constants'),
    Util: require('./util/Util'),
    version: require('../package.json').version
};
