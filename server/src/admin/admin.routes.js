import { Router } from "express";
import * as adminController from "./admin.controller.js";
import { requireAdminKey } from "../middleware/adminAuth.js";

const router = Router();

router.use(requireAdminKey);
router.get("/problems", adminController.listProblems);
router.post("/problems", adminController.createProblem);
router.post("/problems/:id/test-cases", adminController.addTestCases);

export default router;
