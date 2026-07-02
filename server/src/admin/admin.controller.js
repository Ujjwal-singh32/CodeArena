import { z } from "zod";
import * as adminService from "./admin.service.js";
import { AppError } from "../utils/AppError.js";

const problemSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  statement: z.string().min(1),
  inputFormat: z.string().min(1),
  outputFormat: z.string().min(1),
  constraints: z.string().min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  isPublished: z.boolean().optional(),
  timeLimit: z.number().int().positive().optional(),
  memoryLimit: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  examples: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
        explanation: z.string().optional(),
        order: z.number().optional(),
      })
    )
    .optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isSample: z.boolean().optional(),
      })
    )
    .optional(),
  boilerplates: z
    .array(
      z.object({
        language: z.enum(["CPP", "C", "JAVA", "PYTHON", "JAVASCRIPT", "TYPESCRIPT"]),
        starterCode: z.string(),
      })
    )
    .optional(),
});

export async function createProblem(req, res, next) {
  try {
    const data = problemSchema.parse(req.body);
    const problem = await adminService.createProblem(data);
    res.status(201).json({ message: "Problem created", problem });
  } catch (err) {
    if (err.name === "ZodError") {
      return next(new AppError(err.errors[0]?.message || "Validation error", 400));
    }
    next(err);
  }
}

export async function listProblems(_req, res, next) {
  try {
    const problems = await adminService.listAllProblems();
    res.json({ problems });
  } catch (err) {
    next(err);
  }
}

const testCaseSchema = z.object({
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isSample: z.boolean().optional(),
      })
    )
    .min(1),
});

export async function addTestCases(req, res, next) {
  try {
    const problemId = parseInt(req.params.id, 10);
    const data = testCaseSchema.parse(req.body);
    const problem = await adminService.addTestCases(problemId, data.testCases);
    res.status(201).json({ message: "Test cases added", problem });
  } catch (err) {
    if (err.name === "ZodError") {
      return next(new AppError(err.errors[0]?.message || "Validation error", 400));
    }
    next(err);
  }
}
