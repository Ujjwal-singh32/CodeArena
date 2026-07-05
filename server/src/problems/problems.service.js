import prisma from "../config/db.js";
import { getRedis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";
import {
  DEFAULT_BOILERPLATES,
  ALL_CLIENT_LANGUAGES,
} from "./defaultBoilerplates.js";

const CACHE_TTL = 300;

// src/problems/problems.service.js

export async function listProblems({
  userId,
  difficulty,
  tag,
  search,
  page = 1,
  limit = 20,
}) {
  const cacheKey = `problems:${difficulty || ""}:${tag || ""}:${search || ""}:${page}:${limit}`;
  const redis = getRedis();

  let result;
  let fromCache = false;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        result = JSON.parse(cached);
        fromCache = true;
      }
    } catch {}
  }

  if (!fromCache) {
    const where = { isPublished: true };
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          submissionCount: true,
          acceptedCount: true,
          tags: { include: { tag: true } },
          categories: { include: { category: true } },
        },
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.problem.count({ where }),
    ]);

    let filtered = problems;
    if (tag) {
      filtered = problems.filter((p) =>
        p.tags.some((t) => t.tag.name.toLowerCase() === tag.toLowerCase()),
      );
    }

    result = {
      problems: filtered.map(formatProblemListItem),
      total,
      page,
      limit,
    };

    if (redis) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      } catch {}
    }
  }

  // Inject user-specific "solved" status dynamically
  if (userId) {
    const solvedSubmissions = await prisma.submission.findMany({
      where: { userId, status: "ACCEPTED" },
      select: { problemId: true },
      distinct: ["problemId"],
    });

    const solvedIds = new Set(solvedSubmissions.map((s) => s.problemId));

    result.problems = result.problems.map((p) => ({
      ...p,
      solved: solvedIds.has(Number(p.id)),
    }));
  } else {
    // Default to false for guests
    result.problems = result.problems.map((p) => ({
      ...p,
      solved: false,
    }));
  }

  return result;
}

// export async function getProblemBySlug(slug) {
//   const problem = await prisma.problem.findUnique({
//     where: { slug },
//     include: {
//       examples: { orderBy: { order: "asc" } },
//       boilerplates: true,
//       tags: { include: { tag: true } },
//       categories: { include: { category: true } },
//       testCases: { where: { isSample: true } },
//     },
//   });

//   if (!problem || !problem.isPublished) {
//     throw new AppError("Problem not found", 404);
//   }

//   return formatProblemDetail(problem);
// }

export async function getProblemBySlug(slug) {
  const cacheKey = `problem:slug:${slug}`;
  const redis = getRedis();

  // 1. Try to fetch from Redis Cache first
  if (redis) {
    try {
      const cachedProblem = await redis.get(cacheKey);
      if (cachedProblem) {
        return JSON.parse(cachedProblem); // Return cached formatted data instantly
      }
    } catch (err) {
      console.warn("Redis cache read error in getProblemBySlug:", err.message);
    }
  }

  // 2. Cache Miss: Fetch from Database
  const problem = await prisma.problem.findUnique({
    where: { slug },
    include: {
      examples: { orderBy: { order: "asc" } },
      boilerplates: true,
      tags: { include: { tag: true } },
      categories: { include: { category: true } },
      testCases: { where: { isSample: true } },
    },
  });

  if (!problem || !problem.isPublished) {
    throw new AppError("Problem not found", 404);
  }

  // Format the problem details for the client
  const formattedProblem = formatProblemDetail(problem);

  // 3. Save the formatted result back to Redis for future clicks
  if (redis) {
    try {
      // Caching for 1 hour (3600 seconds). You can adjust this time.
      await redis.setex(cacheKey, 3600, JSON.stringify(formattedProblem));
    } catch (err) {
      console.warn("Redis cache write error in getProblemBySlug:", err.message);
    }
  }

  return formattedProblem;
}
function formatProblemListItem(p) {
  const acceptance =
    p.submissionCount > 0
      ? Math.round((p.acceptedCount / p.submissionCount) * 1000) / 10
      : 0;
  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    acceptance,
    tags: p.tags.map((t) => t.tag.name),
    category: p.categories[0]?.category.name || "General",
    submissionCount: p.submissionCount,
  };
}

function formatProblemDetail(p) {
  const boilerplate = {};
  for (const b of p.boilerplates) {
    boilerplate[langToClient(b.language)] = b.starterCode;
  }
  for (const lang of ALL_CLIENT_LANGUAGES) {
    if (!boilerplate[lang]) {
      boilerplate[lang] = DEFAULT_BOILERPLATES[lang];
    }
  }

  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    statement: p.statement,
    inputFormat: p.inputFormat,
    outputFormat: p.outputFormat,
    constraints: p.constraints.split("\n").filter(Boolean),
    timeLimit: p.timeLimit,
    memoryLimit: p.memoryLimit,
    tags: p.tags.map((t) => t.tag.name),
    examples: p.examples.map((e) => ({
      input: e.input,
      output: e.output,
      explanation: e.explanation,
    })),
    boilerplate,
    sampleTests: p.testCases.map((t) => ({
      input: t.input,
      expectedOutput: t.expectedOutput,
    })),
  };
}

function langToClient(lang) {
  const map = {
    JAVASCRIPT: "javascript",
    PYTHON: "python",
    CPP: "cpp",
    JAVA: "java",
    C: "c",
    TYPESCRIPT: "typescript",
  };
  return map[lang] || lang.toLowerCase();
}

export function clientToPrismaLang(lang) {
  const map = {
    javascript: "JAVASCRIPT",
    python: "PYTHON",
    cpp: "CPP",
    java: "JAVA",
    c: "C",
    typescript: "TYPESCRIPT",
  };
  return map[lang] || "JAVASCRIPT";
}
export async function getTopics() {
  const tags = await prisma.tag.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return tags.map((t) => t.name);
}
