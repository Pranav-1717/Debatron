import { createClient } from 'redis';
import logger from '../config/logger.js';

const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', (err) => logger.error('Redis error', err));
await redis.connect();

export default redis;