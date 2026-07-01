import { Router } from "express";
import * as problemsController from "./problems.controller.js";

const router = Router();

router.get("/", problemsController.list);
router.get("/:slug", problemsController.getBySlug);

export default router;
