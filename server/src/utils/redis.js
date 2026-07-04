// src/lib/redis.js
import Redis from 'ioredis';

// Ensure your Redis container is mapped correctly if running locally via Docker
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis for Caching'));

export default redisClient;