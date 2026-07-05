import { getRedis } from "../config/redis.js";

export async function rateLimit({ key, limit = 60, windowSec = 60 }) {
  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: limit };

  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSec);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

export function rateLimitMiddleware(prefix, limit = 60, windowSec = 60) {
  return async (req, _res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    
    // Pass the windowSec down to the core function
    const result = await rateLimit({ key: `${prefix}:${ip}`, limit, windowSec });
    
    if (!result.allowed) {
      const { AppError } = await import("../utils/AppError.js");
      // Give a clear message for the 1-hour block
      return next(new AppError(`Too many requests. Please try again in a while.`, 429));
    }
    next();
  };
}
