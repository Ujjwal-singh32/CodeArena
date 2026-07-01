import { Router } from "express";
import * as usersController from "./users.controller.js";
import { authMiddleware, requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/stats", usersController.platformStats);
router.get("/leaderboard", usersController.leaderboard);

router.use(authMiddleware);
router.get("/dashboard", requireAuth, usersController.dashboard);
router.get("/profile", requireAuth, usersController.profile);

export default router;
