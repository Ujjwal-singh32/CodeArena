import * as aiService from "./ai.service.js";
import { AppError } from "../utils/AppError.js";

export async function assist(req, res, next) {
  try {
    const { mode, code, language, problemTitle, problemId, question } = req.body;
    if (!mode) throw new AppError("mode is required", 400);

    const result = await aiService.aiAssist({
      mode,
      code: code || "",
      language: language || "javascript",
      problemTitle: problemTitle || "",
      problemId,
      question,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
