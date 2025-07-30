const { createClient } = require('redis');
const createLogger  = require('../utils/logger');
const logger = createLogger('Rdis Client');
require('dotenv').config();

const redis = createClient({ url: process.env.REDIS_URL });

redis.on('error', (err) => logger.error('Redis error', err));

redis.connect()
  .then(() => logger.info('Connected to Redis'))
  .catch((err) => logger.error('Redis connection failed', err));

module.exports = redis;
