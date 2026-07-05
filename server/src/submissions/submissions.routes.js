import { Router } from "express";
import * as submissionsController from "./submissions.controller.js";
import { authMiddleware, requireAuth, requireVerified } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { idempotencyMiddleware } from "../middleware/idempotency.js";

const router = Router();

// Configure rate limits (e.g., max 5 requests per 60 seconds)
// Note: Your rateLimit.js expects just the prefix and the limit count.
const runRateLimiter = rateLimitMiddleware("run-limit", 5); 
const submitRateLimiter = rateLimitMiddleware("submit-limit", 5);

router.use(authMiddleware);

// Apply limiters and idempotency BEFORE the controller logic
router.post("/run", 
  requireAuth, 
  requireVerified, 
  runRateLimiter, 
  idempotencyMiddleware, 
  submissionsController.run
);

router.post("/", 
  requireAuth, 
  requireVerified, 
  submitRateLimiter, 
  idempotencyMiddleware, 
  submissionsController.submit
);

router.get("/", requireAuth, submissionsController.listMine);
router.get("/:id", requireAuth, requireVerified, submissionsController.getById);

export default router;