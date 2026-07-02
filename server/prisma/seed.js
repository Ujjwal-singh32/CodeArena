import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const twoSumStatement = `Given an array of integers **nums** and an integer **target**, return indices of the two numbers such that they add up to **target**.

You may assume that each input would have exactly one solution, and you may not use the same element twice.`;

const jsBoilerplate = `const fs = require('fs');
const lines = fs.readFileSync('input.txt', 'utf8').trim().split('\\n');
const nums = lines[0].split(' ').map(Number);
const target = parseInt(lines[1], 10);

const map = new Map();
for (let i = 0; i < nums.length; i++) {
  const need = target - nums[i];
  if (map.has(need)) {
    console.log(map.get(need) + ' ' + i);
    process.exit(0);
  }
  map.set(nums[i], i);
}
`;

const pyBoilerplate = `lines = open('input.txt').read().strip().split('\\n')
nums = list(map(int, lines[0].split()))
target = int(lines[1])

seen = {}
for i, n in enumerate(nums):
    if target - n in seen:
        print(seen[target - n], i)
        break
    seen[n] = i
`;

const cppBoilerplate = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    freopen("input.txt", "r", stdin);
    string line;
    getline(cin, line);
    stringstream ss(line);
    vector<int> nums;
    int x;
    while (ss >> x) nums.push_back(x);
    int target;
    cin >> target;
    unordered_map<int,int> mp;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (mp.count(target - nums[i])) {
            cout << mp[target - nums[i]] << " " << i << "\\n";
            return 0;
        }
        mp[nums[i]] = i;
    }
    return 0;
}
`;

const javaBoilerplate = `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new FileReader("input.txt"));
        String line = br.readLine();
        String[] parts = line.trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        int target = Integer.parseInt(br.readLine().trim());
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            if (seen.containsKey(target - nums[i])) {
                System.out.println(seen.get(target - nums[i]) + " " + i);
                return;
            }
            seen.put(nums[i], i);
        }
    }
}
`;

const cBoilerplate = `#include <stdio.h>

int main() {
    freopen("input.txt", "r", stdin);
    int nums[10000], n = 0, x;
    while (scanf("%d", &x) == 1) nums[n++] = x;
    int target = nums[--n];
    n--;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                printf("%d %d\\n", i, j);
                return 0;
            }
        }
    }
    return 0;
}
`;

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@codearena.dev" },
    update: { emailVerified: true },
    create: {
      username: "code_warrior",
      email: "demo@codearena.dev",
      passwordHash,
      emailVerified: true,
      rating: 1642,
      solvedCount: 0,
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

  await prisma.problem.upsert({
    where: { slug: "two-sum" },
    update: {
      inputFormat: "Line 1: space-separated integers (the array)\nLine 2: integer target\n\nPrograms read from input.txt in the judge working directory.",
      outputFormat: "Two space-separated indices (0-indexed)",
    },
    create: {
      title: "Two Sum",
      slug: "two-sum",
      statement: twoSumStatement,
      inputFormat: "Line 1: space-separated integers (the array)\nLine 2: integer target\n\nPrograms read from input.txt in the judge working directory.",
      outputFormat: "Two space-separated indices (0-indexed)",
      constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
      difficulty: "EASY",
      isPublished: true,
      timeLimit: 2,
      memoryLimit: 256,
      examples: {
        create: [
          {
            input: "2 7 11 15\n9",
            output: "0 1",
            explanation: "nums[0] + nums[1] == 9",
            order: 1,
          },
          {
            input: "3 2 4\n6",
            output: "1 2",
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
          { language: "JAVASCRIPT", starterCode: jsBoilerplate },
          { language: "PYTHON", starterCode: pyBoilerplate },
          { language: "CPP", starterCode: cppBoilerplate },
          { language: "JAVA", starterCode: javaBoilerplate },
          { language: "C", starterCode: cBoilerplate },
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

  console.log("Seed complete:", { user: user.username, problem: "two-sum" });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
