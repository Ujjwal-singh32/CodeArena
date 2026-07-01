import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { getRedis } from "../config/redis.js";

export async function createProblem(data) {
  const existing = await prisma.problem.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError(`Problem with slug "${data.slug}" already exists`, 409);

  const tagIds = [];
  for (const name of data.tags || []) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    tagIds.push(tag.id);
  }

  const categoryIds = [];
  for (const name of data.categories || []) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryIds.push(cat.id);
  }

  const problem = await prisma.problem.create({
    data: {
      title: data.title,
      slug: data.slug,
      statement: data.statement,
      inputFormat: data.inputFormat,
      outputFormat: data.outputFormat,
      constraints: data.constraints,
      difficulty: data.difficulty,
      isPublished: data.isPublished ?? true,
      timeLimit: data.timeLimit ?? 2,
      memoryLimit: data.memoryLimit ?? 256,
      examples: {
        create: (data.examples || []).map((ex, i) => ({
          input: ex.input,
          output: ex.output,
          explanation: ex.explanation || null,
          order: ex.order ?? i + 1,
        })),
      },
      testCases: {
        create: (data.testCases || []).map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: tc.isSample ?? false,
        })),
      },
      boilerplates: {
        create: (data.boilerplates || []).map((b) => ({
          language: b.language,
          starterCode: b.starterCode,
        })),
      },
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });

  await invalidateProblemCache();
  return problem;
}

export async function listAllProblems() {
  return prisma.problem.findMany({
    orderBy: { id: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      isPublished: true,
      submissionCount: true,
      acceptedCount: true,
      createdAt: true,
    },
  });
}

async function invalidateProblemCache() {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys("problems:*");
    if (keys.length) await redis.del(...keys);
  } catch {}
}
