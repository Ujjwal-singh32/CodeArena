import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const twoSumStatement = `Given an array of integers **nums** and an integer **target**, return indices of the two numbers such that they add up to **target**.

You may assume that each input would have exactly one solution, and you may not use the same element twice.`;

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@codearena.dev" },
    update: {},
    create: {
      username: "code_warrior",
      email: "demo@codearena.dev",
      passwordHash,
      emailVerified: true,
      rating: 1642,
      solvedCount: 127,
      profile: { create: { bio: "Competitive programming enthusiast" } },
    },
  });

  const arrayTag = await prisma.tag.upsert({
    where: { name: "Array" },
    update: {},
    create: { name: "Array" },
  });

  const hashTag = await prisma.tag.upsert({
    where: { name: "Hash Table" },
    update: {},
    create: { name: "Hash Table" },
  });

  const arrayCat = await prisma.category.upsert({
    where: { name: "Arrays" },
    update: {},
    create: { name: "Arrays" },
  });

  const problem = await prisma.problem.upsert({
    where: { slug: "two-sum" },
    update: {},
    create: {
      title: "Two Sum",
      slug: "two-sum",
      statement: twoSumStatement,
      inputFormat: "nums: integer array, target: integer",
      outputFormat: "indices: integer array of length 2",
      constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
      difficulty: "EASY",
      isPublished: true,
      timeLimit: 2,
      memoryLimit: 256,
      examples: {
        create: [
          {
            input: "nums = [2,7,11,15], target = 9",
            output: "[0,1]",
            explanation: "nums[0] + nums[1] == 9",
            order: 1,
          },
          {
            input: "nums = [3,2,4], target = 6",
            output: "[1,2]",
            order: 2,
          },
        ],
      },
      testCases: {
        create: [
          { input: "2 7 11 15\n9", expectedOutput: "0 1", isSample: true },
          { input: "3 2 4\n6", expectedOutput: "1 2", isSample: true },
          { input: "3 3\n6", expectedOutput: "0 1", isSample: false },
        ],
      },
      boilerplates: {
        create: [
          {
            language: "JAVASCRIPT",
            starterCode: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};`,
          },
          {
            language: "PYTHON",
            starterCode: `def twoSum(nums, target):\n    pass`,
          },
        ],
      },
      tags: {
        create: [{ tagId: arrayTag.id }, { tagId: hashTag.id }],
      },
      categories: {
        create: [{ categoryId: arrayCat.id }],
      },
    },
  });

  console.log("Seed complete:", { user: user.username, problem: problem.slug });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
