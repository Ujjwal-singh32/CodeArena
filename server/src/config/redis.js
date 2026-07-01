import Redis from "ioredis";
import { env } from "./env.js";

let redis = null;

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
  if (!client) return false;
  try {
    if (client.status === "wait") await client.connect();
    await client.ping();
    console.log("Redis connected (ioredis)");
    return true;
  } catch (err) {
    console.warn("Redis unavailable:", err.message);
    return false;
  }
}

export default getRedis;
