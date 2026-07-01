import prisma from "../config/db.js";
import { env } from "../config/env.js";

const PROMPTS = {
  hint: (ctx) =>
    `You are a coding tutor. Give a concise hint (no full solution) for this problem.\nProblem: ${ctx.problemTitle}\nLanguage: ${ctx.language}\nCode:\n${ctx.code}`,
  syntax: (ctx) =>
    `Review this code for syntax/logic errors. Return corrected code or explain fixes.\nLanguage: ${ctx.language}\nCode:\n${ctx.code}`,
  doubt: (ctx) =>
    `Answer this DSA question about the problem.\nProblem: ${ctx.problemTitle}\nQuestion: ${ctx.question}\nCode context:\n${ctx.code || "N/A"}`,
  review: (ctx) =>
    `Review this accepted submission. Provide time/space complexity, unnecessary code, and optimization tips.\nLanguage: ${ctx.language}\nCode:\n${ctx.code}`,
};

export async function aiAssist({ mode, code, language, problemTitle, question }) {
  const prompt = PROMPTS[mode]?.({ code, language, problemTitle, question });
  if (!prompt) throw new Error("Invalid AI mode");

  if (env.ai.apiKey) {
    const res = await fetch(env.ai.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: env.ai.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { response: data.choices?.[0]?.message?.content || "No response." };
    }
  }

  return { response: getMockResponse(mode, problemTitle, question) };
}

export async function selectDuelProblem(config) {
  const problem = await prisma.problem.findFirst({
    where: {
      isPublished: true,
      difficulty: config.difficulty,
      OR: [
        { tags: { some: { tag: { name: { equals: config.topic, mode: "insensitive" } } } } },
        { categories: { some: { category: { name: { equals: config.topic, mode: "insensitive" } } } } },
      ],
    },
    orderBy: { submissionCount: "desc" },
  });

  if (problem) return problem.id;

  const fallback = await prisma.problem.findFirst({
    where: { isPublished: true, difficulty: config.difficulty },
  });
  return fallback?.id || null;
}

export async function generateAiReview(submissionId) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { problem: true },
  });
  if (!submission) return null;

  const { response } = await aiAssist({
    mode: "review",
    code: submission.code,
    language: submission.language.toLowerCase(),
    problemTitle: submission.problem.title,
  });

  const review = await prisma.aIReview.create({
    data: {
      submissionId,
      feedback: response,
      timeComplexity: extractLine(response, "time"),
      spaceComplexity: extractLine(response, "space"),
      optimizationTips: response,
    },
  });

  return review;
}

function extractLine(text, keyword) {
  const line = text.split("\n").find((l) => l.toLowerCase().includes(keyword));
  return line || null;
}

function getMockResponse(mode, problemTitle, question) {
  const mocks = {
    hint: "Try using a hash map to store complements. For each element, check if the target minus current exists in the map — that gives O(n) time.",
    syntax: "Your code structure looks fine. Double-check return types, bracket matching, and that you're returning indices rather than values if required.",
    doubt: question
      ? `"${question}" — Start by clarifying inputs/outputs, then pick the right data structure. For ${problemTitle || "this problem"}, consider a single-pass approach.`
      : "Break the problem into smaller steps. Identify the pattern (two pointers, sliding window, etc.) before coding.",
    review: "Time: O(n), Space: O(n). Consider whether you can reduce space to O(1). Remove redundant variables and early-exit when possible.",
  };
  return mocks[mode] || mocks.doubt;
}
