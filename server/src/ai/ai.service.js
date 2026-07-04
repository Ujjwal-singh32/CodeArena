import prisma from "../config/db.js";
import { env } from "../config/env.js";
import { getRedis } from "../config/redis.js";

const PROMPTS = {
  hint: (ctx) =>
    `You are a coding tutor. Give a concise hint (no full solution) for this problem.\nProblem: ${ctx.problemTitle}\nLanguage: ${ctx.language}\nCode:\n${ctx.code}`,
  syntax: (ctx) =>
    `Review this code for syntax/logic errors. Return corrected code or explain fixes.\nLanguage: ${ctx.language}\nCode:\n${ctx.code}`,
  doubt: (ctx) =>
    `Answer this DSA question about the problem.\nProblem: ${ctx.problemTitle}\nQuestion: ${ctx.question}\nCode context:\n${ctx.code || "N/A"}`,
  review: (ctx) =>
    `Review this accepted submission. Return ONLY a valid JSON object with exactly three keys: "timeComplexity", "spaceComplexity", and "optimizationTips". Do not wrap the response in markdown tags.\nLanguage: ${ctx.language}\nCode:\n${ctx.code}`,
};

export async function aiAssist({
  mode,
  code,
  language,
  problemTitle,
  question,
}) {
  const prompt = PROMPTS[mode]?.({ code, language, problemTitle, question });
  if (!prompt) throw new Error("Invalid AI mode");

  if (env.ai.apiKey) {
    const responseText = await callCohere(prompt);
    if (responseText) return { response: responseText };
  }

  return { response: getMockResponse(mode, problemTitle, question) };
}

async function callCohere(prompt) {
  const res = await fetch(env.ai.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ai.apiKey}`,
    },
    body: JSON.stringify({
      model: env.ai.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Cohere API error:", res.status, errText);
    return null;
  }

  const data = await res.json();

  // Handle Cohere V2 Array format (extracts 'text' and ignores 'thinking' blocks)
  if (Array.isArray(data.message?.content)) {
    const textBlock = data.message.content.find(
      (block) => block.type === "text",
    );
    if (textBlock) {
      return textBlock.text;
    }
  }

  // Fallbacks for older V1 formats or unexpected structures
  return (
    data.message?.content ||
    data.text ||
    data.generations?.[0]?.text ||
    data.choices?.[0]?.message?.content ||
    null
  );
}

export async function selectDuelProblem(config) {
  // 1. Fetch ALL matching problem IDs (fetching just the ID is very fast/lightweight)
  const problems = await prisma.problem.findMany({
    where: {
      isPublished: true,
      difficulty: config.difficulty,
      OR: [
        {
          tags: {
            some: {
              tag: { name: { equals: config.topic, mode: "insensitive" } },
            },
          },
        },
        {
          categories: {
            some: {
              category: { name: { equals: config.topic, mode: "insensitive" } },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  // 2. Pick a random problem from the matched list
  if (problems.length > 0) {
    const randomIndex = Math.floor(Math.random() * problems.length);
    return problems[randomIndex].id;
  }

  // 3. Fallback: If no problem matches the exact topic, fetch random by difficulty
  const fallbacks = await prisma.problem.findMany({
    where: { isPublished: true, difficulty: config.difficulty },
    select: { id: true },
  });

  if (fallbacks.length > 0) {
    const randomIndex = Math.floor(Math.random() * fallbacks.length);
    return fallbacks[randomIndex].id;
  }

  return null;
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

  // Safely parse the JSON returned by the AI review prompt
  let parsedReview = {
    timeComplexity: "Unknown",
    spaceComplexity: "Unknown",
    optimizationTips: response,
  };

  try {
    // Strip markdown formatting if the AI accidentally includes it
    const cleanJsonString = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const jsonResponse = JSON.parse(cleanJsonString);

    // NEW CODE: Handle arrays safely
    let formattedTips = jsonResponse.optimizationTips;
    if (Array.isArray(formattedTips)) {
      // Join array items with a newline and bullet point
      formattedTips = formattedTips.map((tip) => `• ${tip}`).join("\n");
    } else if (typeof formattedTips === "object") {
      // Just in case it returns a nested object
      formattedTips = JSON.stringify(formattedTips);
    }

    parsedReview = {
      timeComplexity: jsonResponse.timeComplexity || "Unknown",
      spaceComplexity: jsonResponse.spaceComplexity || "Unknown",
      optimizationTips: formattedTips || response,
    };
  } catch (error) {
    console.error("Failed to parse AI Review JSON:", error);
  }

  const review = await prisma.aIReview.create({
    data: {
      submissionId,
      feedback: "Automated Code Review Completed.",
      timeComplexity: parsedReview.timeComplexity,
      spaceComplexity: parsedReview.spaceComplexity,
      optimizationTips: parsedReview.optimizationTips,
    },
  });
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`submission:${submissionId}:${submission.userId}`);
    } catch (err) {
      console.warn(
        "Failed to clear submission cache for AI review:",
        err.message,
      );
    }
  }
  return review;
}

function getMockResponse(mode, problemTitle, question) {
  const mocks = {
    hint: "Try using a hash map to store complements. For each element, check if the target minus current exists in the map — that gives O(n) time.",
    syntax:
      "Your code structure looks fine. Double-check return types, bracket matching, and that you're returning indices rather than values if required.",
    doubt: question
      ? `"${question}" — Start by clarifying inputs/outputs, then pick the right data structure. For ${problemTitle || "this problem"}, consider a single-pass approach.`
      : "Break the problem into smaller steps. Identify the pattern (two pointers, sliding window, etc.) before coding.",
    review: JSON.stringify({
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      optimizationTips:
        "Consider whether you can reduce space to O(1). Remove redundant variables and early-exit when possible.",
    }),
  };
  return mocks[mode] || mocks.doubt;
}
