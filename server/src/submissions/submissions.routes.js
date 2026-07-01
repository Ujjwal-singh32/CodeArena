import { Router } from "express";
import * as submissionsController from "./submissions.controller.js";
import { authMiddleware, requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.post("/run", submissionsController.run);
router.post("/", requireAuth, submissionsController.submit);
router.get("/:id", requireAuth, submissionsController.getById);

export default router;
