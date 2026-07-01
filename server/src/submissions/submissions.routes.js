import { Router } from "express";
import * as submissionsController from "./submissions.controller.js";
import { authMiddleware, requireAuth, requireVerified } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.post("/run", requireAuth, requireVerified, submissionsController.run);
router.post("/", requireAuth, requireVerified, submissionsController.submit);
router.get("/:id", requireAuth, requireVerified, submissionsController.getById);

export default router;
