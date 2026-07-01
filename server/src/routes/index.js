import { Router } from "express";
import authRoutes from "../auth/auth.routes.js";
import problemsRoutes from "../problems/problems.routes.js";
import submissionsRoutes from "../submissions/submissions.routes.js";
import duelRoutes from "../duel/duel.routes.js";
import collabRoutes from "../collab/collab.routes.js";
import aiRoutes from "../ai/ai.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/problems", problemsRoutes);
router.use("/submissions", submissionsRoutes);
router.use("/duel", duelRoutes);
router.use("/collab", collabRoutes);
router.use("/ai", aiRoutes);

export default router;
