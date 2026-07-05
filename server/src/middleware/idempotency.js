import { getRedis } from "../config/redis.js";

export const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['x-idempotency-key'];
  
  // If no key is provided, just proceed (helpful for backward compatibility during rollout)
  if (!idempotencyKey) return next();

  const redis = getRedis();
  if (!redis) return next(); // If Redis is down, fail-open to allow submissions

  try {
    const redisKey = `idempotency:${idempotencyKey}`;
    
    // Attempt to set the key. 
    // NX = Only set if it does NOT exist.
    // EX = Expire after 24 hours (86400 seconds).
    const isSet = await redis.set(redisKey, "processing", "NX", "EX", 86400);

    // If isSet is null, it means the key already existed. It's a duplicate request.
    if (!isSet) {
      const { AppError } = await import("../utils/AppError.js");
      return next(new AppError("Duplicate submission detected. Please wait.", 409));
    }

    next();
  } catch (error) {
    console.error("Idempotency check error:", error);
    next();
  }
};