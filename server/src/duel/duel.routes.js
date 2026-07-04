import { Router } from "express";
import * as duelController from "./duel.controller.js";
import { authMiddleware, requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.use(requireAuth);
router.get("/matches", duelController.list);
router.post("/matches", duelController.create);
router.get("/matches/:id", duelController.get);
router.post("/matches/:id/join", duelController.join);
router.post("/matches/:id/config", duelController.submitConfig);
router.post("/matches/:id/start", duelController.start);
router.post("/matches/find", duelController.findOpponent);

export default router;
