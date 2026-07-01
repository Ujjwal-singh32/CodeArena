import { Router } from "express";
import * as duelController from "./duel.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/matches", duelController.list);
router.post("/matches", duelController.create);
router.get("/matches/:id", duelController.get);
router.post("/matches/:id/join", duelController.join);
router.post("/matches/:id/start", duelController.start);

export default router;
