import { Router } from "express";
import * as authController from "./auth.controller.js";
import { authMiddleware, requireAuth } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", rateLimitMiddleware("auth:register", 10), authController.register);
router.post("/login", rateLimitMiddleware("auth:login", 20), authController.login);
router.post("/logout", authController.logout);
router.get("/verify-email", authController.verifyEmail);
router.get("/me", authMiddleware, requireAuth, authController.me);

export default router;
