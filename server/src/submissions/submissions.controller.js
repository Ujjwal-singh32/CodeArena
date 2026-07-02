import * as submissionsService from "./submissions.service.js";
import { AppError } from "../utils/AppError.js";

export async function run(req, res, next) {
  try {
    const { code, language, problemId } = req.body;
    if (!code || !language || !problemId) {
      throw new AppError("code, language, and problemId are required", 400);
    }
    const result = await submissionsService.runSampleTests({
      userId: req.user.id,
      problemId: parseInt(problemId, 10),
      code,
      language,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function submit(req, res, next) {
  try {
    const { code, language, problemId, matchId } = req.body;
    if (!code || !language || !problemId) {
      throw new AppError("code, language, and problemId are required", 400);
    }

    const result = await submissionsService.createSubmission({
      userId: req.user.id,
      problemId: parseInt(problemId, 10),
      code,
      language,
      matchId: matchId ? parseInt(matchId, 10) : null,
    });

    const verdict = result.verdict;
    res.status(202).json({
      submission: result.submission,
      verdict: verdict
        ? {
            status: verdict.status,
            passedTestCases: verdict.passedTestCases,
            totalTestCases: verdict.totalTestCases,
            runtime: verdict.runtime,
            memory: verdict.memory,
            output: verdict.output,
          }
        : null,
      jobId: result.jobId || null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const submission = await submissionsService.getSubmission(req.params.id, req.user.id);
    res.json({ submission });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || "20", 10);
    const submissions = await submissionsService.listUserSubmissions(req.user.id, limit);
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
}
