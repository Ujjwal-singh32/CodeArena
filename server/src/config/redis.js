import Redis from "ioredis";
import { env } from "./env.js";

let redis = null;
let redisReady = false;

export function isRedisReady() {
  return redisReady;
}

export function getRedis() {
  if (!redis) {
    try {
      redis = new Redis(env.redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        enableReadyCheck: true,
      });
    } catch {
      redis = null;
    }
  }
  return redis;
}

export async function connectRedis() {
  const client = getRedis();
  if (!client) {
    redisReady = false;
    return false;
  }
  try {
    if (client.status === "wait") await client.connect();
    await client.ping();
    redisReady = true;
    console.log("Redis connected (ioredis)");
    return true;
  } catch (err) {
    redisReady = false;
    console.warn("Redis unavailable — using inline job processing:", err.message);
    return false;
  }
}

export default getRedis;
