import { processSubmissionJob } from "../submissions/submissions.service.js";
import { generateAiReview } from "../ai/ai.service.js";
import { sendDuelResultEmail } from "../utils/email.js";
import { createWorker, registerInlineHandler, QUEUE_NAMES } from "../queues/index.js";
import prisma from "../config/db.js";

function emitSubmissionVerdict(io, data, result) {
  io?.to(`user:${data.userId}`).emit("submission:verdict", {
    submissionId: data.submissionId,
    status: result.verdict.status,
    passedTestCases: result.verdict.passedTestCases,
    totalTestCases: result.verdict.totalTestCases,
    runtime: result.verdict.runtime,
    memory: result.verdict.memory,
    output: result.verdict.output,
  });
}

async function handleExecutionJob(data, io) {
  const result = await processSubmissionJob(data);
  emitSubmissionVerdict(io, data, result);
  return result;
}

async function handleAiReviewJob(data, io) {
  const review = await generateAiReview(data.submissionId);
  if (review) {
    const submission = await prisma.submission.findUnique({
      where: { id: data.submissionId },
    });
    io?.to(`user:${submission?.userId}`).emit("ai:review-ready", {
      submissionId: data.submissionId,
      review,
    });
  }
  return review;
}

export function startWorkers(io) {
  const executionProcessor = (data) => handleExecutionJob(data, io);
  const aiReviewProcessor = (data) => handleAiReviewJob(data, io);
  const emailProcessor = async (data) => {
    if (data.type === "duel-result") {
      return sendDuelResultEmail(data.email, data);
    }
    return null;
  };

  registerInlineHandler(QUEUE_NAMES.EXECUTION, executionProcessor);
  registerInlineHandler(QUEUE_NAMES.AI_REVIEW, aiReviewProcessor);
  registerInlineHandler(QUEUE_NAMES.EMAIL, emailProcessor);

  createWorker(QUEUE_NAMES.EXECUTION, executionProcessor);
  createWorker(QUEUE_NAMES.AI_REVIEW, aiReviewProcessor);
  createWorker(QUEUE_NAMES.EMAIL, emailProcessor);

  console.log("Workers registered (BullMQ when Redis available, inline fallback otherwise)");
}
