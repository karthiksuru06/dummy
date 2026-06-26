// Shared, OPTIONAL Redis client.
//
// Redis is gated entirely by process.env.REDIS_URL. When it is unset (local
// dev, tests), `redis` is null and `isRedisEnabled` is false so every caller
// can fall back to the existing in-process behavior. This module NEVER throws
// at import time and an 'error' event never crashes the process — it is logged
// and ioredis keeps retrying in the background.

const logger = require('./logger');

const isRedisEnabled = !!process.env.REDIS_URL;

let redis = null;

if (isRedisEnabled) {
  // Lazy require so the dependency is only loaded when actually used.
  const Redis = require('ioredis');

  redis = new Redis(process.env.REDIS_URL, {
    // Keep trying to reconnect; never let a transient outage take the app down.
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  redis.on('error', (err) => {
    // Log and continue — do NOT throw or exit.
    logger.error({ err: err && err.message }, 'Redis client error');
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });
}

// Return a second connection suitable for pub/sub (e.g. the socket.io adapter),
// which requires dedicated connections separate from the command client.
// Returns null when Redis is disabled.
function createPubSubClient() {
  if (!isRedisEnabled || !redis) return null;
  const client = redis.duplicate();
  client.on('error', (err) => {
    logger.error({ err: err && err.message }, 'Redis pub/sub client error');
  });
  return client;
}

module.exports = { redis, isRedisEnabled, createPubSubClient };
