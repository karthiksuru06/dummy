// Centralized pino logger.
// TODO: server.js and routes/* should migrate console.log/console.error
// calls to this logger (e.g. `const logger = require('./utils/logger')`).

const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

// Pretty output in dev is a nicety that requires the optional `pino-pretty`
// dep. If it isn't installed (or in prod), fall back to structured JSON so the
// logger never crashes the process on require.
let transport;
if (!isProd) {
  try {
    require.resolve('pino-pretty');
    transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    };
  } catch {
    transport = undefined; // pino-pretty not installed → plain JSON
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transport,
});

module.exports = logger;
