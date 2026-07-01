import { processSubmissionJob } from "../submissions/submissions.service.js";
import { generateAiReview } from "../ai/ai.service.js";
import { sendDuelResultEmail } from "../utils/email.js";
import { createWorker, registerInlineHandler, QUEUE_NAMES } from "../queues/index.js";

export function startWorkers(io) {
  registerInlineHandler(QUEUE_NAMES.EXECUTION, async (data) => {
    const result = await processSubmissionJob(data);
    io?.to(`user:${data.userId}`).emit("submission:verdict", {
      submissionId: data.submissionId,
      status: result.verdict.status,
      passedTestCases: result.verdict.passedTestCases,
      totalTestCases: result.verdict.totalTestCases,
      runtime: result.verdict.runtime,
      memory: result.verdict.memory,
    });
    return result;
  });

  registerInlineHandler(QUEUE_NAMES.AI_REVIEW, async (data) => {
    const review = await generateAiReview(data.submissionId);
    if (review) {
      const submission = await import("../config/db.js").then((m) =>
        m.default.submission.findUnique({ where: { id: data.submissionId } })
      );
      io?.to(`user:${submission?.userId}`).emit("ai:review-ready", {
        submissionId: data.submissionId,
        review,
      });
    }
    return review;
  });

  registerInlineHandler(QUEUE_NAMES.EMAIL, async (data) => {
    if (data.type === "duel-result") {
      return sendDuelResultEmail(data.email, data);
    }
    return null;
  });

  createWorker(QUEUE_NAMES.EXECUTION, async (data) => {
    const result = await processSubmissionJob(data);
    io?.to(`user:${data.userId}`).emit("submission:verdict", {
      submissionId: data.submissionId,
      status: result.verdict.status,
      passedTestCases: result.verdict.passedTestCases,
      totalTestCases: result.verdict.totalTestCases,
    });
    return result;
  });

  createWorker(QUEUE_NAMES.AI_REVIEW, async (data) => {
    return generateAiReview(data.submissionId);
  });

  createWorker(QUEUE_NAMES.EMAIL, async (data) => {
    if (data.type === "duel-result") {
      return sendDuelResultEmail(data.email, data);
    }
  });

  console.log("Workers registered (inline fallback when Redis unavailable)");
}
