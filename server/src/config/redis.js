import Redis from "ioredis";
import { env } from "./env.js";

let redis = null;

export function getRedis() {
  if (!redis) {
    try {
      redis = new Redis(env.redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
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
    if (client.status !== "ready") await client.connect();
    return true;
  } catch (err) {
    console.warn("Redis unavailable:", err.message);
    return false;
  }
}

export default getRedis;
