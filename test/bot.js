const TestClient = require('./struct/TestClient');
const client = new TestClient();

const { token } = require('./config.json');
client.start(token);

process.on('unhandledRejection', err => console.error(err)); // eslint-disable-line no-console
