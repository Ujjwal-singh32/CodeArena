import { Router } from "express";
import * as aiController from "./ai.controller.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";

const router = Router();

router.post("/assist", rateLimitMiddleware("ai:assist", 30), aiController.assist);

export default router;
