import { Router } from "express";
import * as authController from "./auth.controller.js";
import { authMiddleware, requireAuth } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";

const router = Router();

// Create a limiter: Max 5 requests per 3600 seconds (1 hour)
const registerLimiter = rateLimitMiddleware("register-email-limit", 5, 3600);

router.post("/register", registerLimiter, authController.register);
router.post("/login", rateLimitMiddleware("auth:login", 20), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refresh);
router.get("/verify-email", authController.verifyEmail);
router.get("/me", authMiddleware, requireAuth, authController.me);
router.get("/check-username", authController.checkUsername);

export default router;