import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { clientToPrismaLang } from "../problems/problems.service.js";
import { judgeSubmission } from "../execution/sandbox.js";
import { addExecutionJob, addAiReviewJob } from "../queues/index.js";
import { publishEvent } from "../config/kafka.js";
import { formatJudgeOutput } from "../utils/judgeOutput.js";

function formatVerdict(verdict) {
  return {
    ...verdict,
    output: formatJudgeOutput(verdict.status, verdict),
  };
}

export async function runSampleTests({ userId, problemId, code, language }) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: { testCases: { where: { isSample: true } } },
  });
  if (!problem) throw new AppError("Problem not found", 404);
  if (problem.testCases.length === 0) {
    throw new AppError("No sample test cases configured for this problem", 400);
  }

  const result = await judgeSubmission({
    code,
    language,
    testCases: problem.testCases,
    timeLimitSec: problem.timeLimit,
    memoryLimitMb: problem.memoryLimit,
  });

  const output = formatJudgeOutput(result.status, {
    stdout: result.stdout,
    stderr: result.stderr,
    compileOutput: result.compileOutput,
    passedTestCases: result.passedTestCases,
    totalTestCases: result.totalTestCases,
    expectedOutput: result.expectedOutput,
  });

  return {
    output,
    status: result.status,
    runtime: result.runtime,
    memory: result.memory,
    passedTestCases: result.passedTestCases,
    totalTestCases: result.totalTestCases,
  };
}

export async function createSubmission({ userId, problemId, code, language, matchId = null }) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: { testCases: true },
  });
  if (!problem) throw new AppError("Problem not found", 404);

  const prismaLang = clientToPrismaLang(language);

  const submission = await prisma.submission.create({
    data: {
      userId,
      problemId,
      matchId,
      code,
      language: prismaLang,
      status: "PENDING",
    },
  });

  const jobResult = await addExecutionJob({
    submissionId: submission.id,
    code,
    language,
    testCases: problem.testCases,
    timeLimitSec: problem.timeLimit,
    memoryLimitMb: problem.memoryLimit,
    userId,
    problemId,
  });

  if (jobResult.inline) {
    const verdict = jobResult.result?.verdict || jobResult.result;
    return {
      submission: jobResult.result?.submission || submission,
      verdict: verdict ? formatVerdict(verdict) : null,
    };
  }

  return { submission, jobId: jobResult.jobId };
}

export async function processSubmissionJob(data) {
  const { submissionId, code, language, testCases, timeLimitSec, memoryLimitMb, userId, problemId } = data;

  const verdict = await judgeSubmission({ code, language, testCases, timeLimitSec, memoryLimitMb });

  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: verdict.status,
      runtime: verdict.runtime,
      memory: verdict.memory,
      stdout: verdict.stdout,
      stderr: verdict.stderr,
      compileOutput: verdict.compileOutput,
      passedTestCases: verdict.passedTestCases,
      totalTestCases: verdict.totalTestCases,
    },
  });

  if (verdict.status === "ACCEPTED") {
    await prisma.user.update({
      where: { id: userId },
      data: { solvedCount: { increment: 1 } },
    });
    await prisma.problem.update({
      where: { id: problemId },
      data: { acceptedCount: { increment: 1 } },
    });
  }

  await prisma.problem.update({
    where: { id: problemId },
    data: { submissionCount: { increment: 1 } },
  });

  await publishEvent("submission.completed", {
    event: "submission.completed",
    submissionId,
    userId,
    problemId,
    status: verdict.status,
  });

  if (verdict.status === "ACCEPTED") {
    await addAiReviewJob({ submissionId });
  }

  return { submission, verdict: formatVerdict(verdict) };
}

export async function getSubmission(id, userId) {
  const submission = await prisma.submission.findUnique({
    where: { id: parseInt(id, 10) },
    include: { aiReview: true, problem: { select: { title: true, slug: true } } },
  });
  if (!submission) throw new AppError("Submission not found", 404);
  if (submission.userId !== userId) throw new AppError("Forbidden", 403);
  return submission;
}

export async function listUserSubmissions(userId, limit = 20) {
  const submissions = await prisma.submission.findMany({
    where: { userId },
    include: { problem: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return submissions.map((s) => ({
    id: s.id,
    problem: s.problem.title,
    slug: s.problem.slug,
    status: s.status,
    language: s.language,
    runtime: s.runtime ? `${s.runtime} ms` : "—",
    date: s.createdAt,
  }));
}
