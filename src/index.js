module.exports = {
    AkairoClient: require('./struct/AkairoClient'),
    AkairoHandler: require('./struct/AkairoHandler'),
    CommandHandler: require('./struct/commands/CommandHandler'),
    InhibitorHandler: require('./struct/inhibitors/InhibitorHandler'),
    ListenerHandler: require('./struct/listeners/ListenerHandler'),
    AkairoModule: require('./struct/AkairoModule'),
    Command: require('./struct/commands/Command'),
    Inhibitor: require('./struct/inhibitors/Inhibitor'),
    Listener: require('./struct/listeners/Listener'),
    SQLiteHandler: require('./struct/databases/SQLiteHandler'),
    Constants: require('./struct/utils/Constants'),
    Category: require('./struct/utils/Category'),
    version: require('../package.json').version
};
