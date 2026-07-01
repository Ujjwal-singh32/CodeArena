import { Router } from "express";
import * as collabController from "./collab.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.post("/rooms", collabController.create);
router.get("/rooms/:code", collabController.get);
router.post("/rooms/:code/join", collabController.join);

export default router;
