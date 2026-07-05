import crypto from "crypto";
import { getRedis } from "../config/redis.js";

const BITMAP_KEY = "usernames_bloom_filter";
// 1 Million bits = ~122 KB of memory. Adjust based on expected user base.
const FILTER_SIZE = 1000000; 
const HASH_FUNCTIONS_COUNT = 5;

// Generate 'k' different hash offsets for a given string
function getOffsets(username) {
  const normalized = username.trim().toLowerCase();
  const offsets = [];
  
  for (let i = 0; i < HASH_FUNCTIONS_COUNT; i++) {
    // Append index to string to simulate different hash functions
    const hash = crypto.createHash("md5").update(normalized + i).digest("hex");
    // Convert first 8 chars of hex to integer and modulo by size
    const intVal = parseInt(hash.substring(0, 8), 16);
    offsets.push(intVal % FILTER_SIZE);
  }
  return offsets;
}

/**
 * Adds a username to the Redis Bloom Filter
 */
export async function addUsernameToBloom(username) {
  const redis = getRedis();
  if (!redis) return; 

  const offsets = getOffsets(username);
  const pipeline = redis.pipeline();
  
  // Set all calculated bits to 1
  offsets.forEach((offset) => pipeline.setbit(BITMAP_KEY, offset, 1));
  await pipeline.exec();
}

/**
 * Checks if a username MIGHT exist.
 * Returns true if it PROBABLY exists.
 * Returns false if it DEFINITELY DOES NOT exist.
 */
export async function checkUsernameInBloom(username) {
  const redis = getRedis();
  if (!redis) return false; // If Redis is down, fail open (database will catch duplicates)

  const offsets = getOffsets(username);
  const pipeline = redis.pipeline();
  
  // Check all calculated bits
  offsets.forEach((offset) => pipeline.getbit(BITMAP_KEY, offset));
  
  const results = await pipeline.exec();
  
  // results is an array of [error, value]. We only care about the value (0 or 1)
  const bits = results.map((res) => res[1]);
  
  // If EVERY bit is 1, the username probably exists.
  // If EVEN ONE bit is 0, the username definitely does NOT exist.
  return bits.every((bit) => bit === 1);
}