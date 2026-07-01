import prisma from "../config/db.js";
import { getRedis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";

const CACHE_TTL = 300;

export async function listProblems({ difficulty, tag, search, page = 1, limit = 20 }) {
  const cacheKey = `problems:${difficulty || ""}:${tag || ""}:${search || ""}:${page}:${limit}`;
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

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
      p.tags.some((t) => t.tag.name.toLowerCase() === tag.toLowerCase())
    );
  }

  const result = {
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

  return result;
}

export async function getProblemBySlug(slug) {
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

  return formatProblemDetail(problem);
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
