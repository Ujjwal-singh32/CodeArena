export const platformStats = {
  totalProblems: 847,
  activeUsers: 12400,
  duelsToday: 342,
  submissionsToday: 8900,
};

export const problems = [
  {
    id: "1",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "EASY",
    acceptance: 49.2,
    tags: ["Array", "Hash Table"],
    category: "Arrays",
    solved: true,
    submissionCount: 2840000,
  },
  {
    id: "2",
    slug: "add-two-numbers",
    title: "Add Two Numbers",
    difficulty: "MEDIUM",
    acceptance: 42.1,
    tags: ["Linked List", "Math"],
    category: "Linked List",
    solved: false,
    submissionCount: 1200000,
  },
  {
    id: "3",
    slug: "longest-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "MEDIUM",
    acceptance: 34.8,
    tags: ["String", "Sliding Window"],
    category: "Strings",
    solved: true,
    submissionCount: 2100000,
  },
  {
    id: "4",
    slug: "median-two-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "HARD",
    acceptance: 38.5,
    tags: ["Array", "Binary Search"],
    category: "Binary Search",
    solved: false,
    submissionCount: 980000,
  },
  {
    id: "5",
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "EASY",
    acceptance: 41.3,
    tags: ["Stack", "String"],
    category: "Stack",
    solved: true,
    submissionCount: 3200000,
  },
  {
    id: "6",
    slug: "merge-k-lists",
    title: "Merge k Sorted Lists",
    difficulty: "HARD",
    acceptance: 48.9,
    tags: ["Linked List", "Heap"],
    category: "Heap",
    solved: false,
    submissionCount: 760000,
  },
  {
    id: "7",
    slug: "binary-tree-inorder",
    title: "Binary Tree Inorder Traversal",
    difficulty: "EASY",
    acceptance: 75.2,
    tags: ["Tree", "DFS"],
    category: "Trees",
    solved: false,
    submissionCount: 1800000,
  },
  {
    id: "8",
    slug: "word-ladder",
    title: "Word Ladder",
    difficulty: "HARD",
    acceptance: 36.1,
    tags: ["BFS", "Graph"],
    category: "Graphs",
    solved: false,
    submissionCount: 540000,
  },
];

export const problemDetail = {
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "EASY",
  tags: ["Array", "Hash Table"],
  timeLimit: 2,
  memoryLimit: 256,
  statement: `Given an array of integers **nums** and an integer **target**, return indices of the two numbers such that they add up to **target**.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
  inputFormat: `The first line contains an integer **n** — the size of the array.
The second line contains **n** space-separated integers — the array elements.
The third line contains the integer **target**.`,
  outputFormat: `Print two space-separated integers — the indices (0-based) of the two numbers that add up to target.`,
  constraints: [
    "2 ≤ nums.length ≤ 10⁴",
    "-10⁹ ≤ nums[i] ≤ 10⁹",
    "-10⁹ ≤ target ≤ 10⁹",
    "Only one valid answer exists.",
  ],
  examples: [
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
    },
    {
      input: "nums = [3,2,4], target = 6",
      output: "[1,2]",
      explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
    },
  ],
  boilerplate: {
    javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Write your code here\n    \n}\n`,
    python: `def two_sum(nums, target):\n    # Write your code here\n    pass\n`,
    cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        \n    }\n};\n`,
    java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        \n    }\n}\n`,
  },
};

export const currentUser = {
  username: "code_warrior",
  email: "coder@codearena.dev",
  rating: 1642,
  solvedCount: 127,
  rank: 4821,
  streak: 14,
  bio: "Competitive programmer | DSA enthusiast | Building CodeArena",
  avatar: null,
  github: "codewarrior",
  linkedin: "codewarrior",
  leetcode: "codewarrior",
  codeforces: "codewarrior",
  joinDate: "2025-09-15",
};

export const recentSubmissions = [
  { id: "1", problem: "Two Sum", status: "ACCEPTED", language: "JavaScript", runtime: "68 ms", date: "2026-06-28" },
  { id: "2", problem: "Valid Parentheses", status: "ACCEPTED", language: "Python", runtime: "32 ms", date: "2026-06-27" },
  { id: "3", problem: "Merge k Sorted Lists", status: "WRONG_ANSWER", language: "C++", runtime: "—", date: "2026-06-26" },
  { id: "4", problem: "Longest Substring", status: "ACCEPTED", language: "JavaScript", runtime: "45 ms", date: "2026-06-25" },
  { id: "5", problem: "Word Ladder", status: "TIME_LIMIT_EXCEEDED", language: "Java", runtime: "—", date: "2026-06-24" },
];

export const duelHistory = [
  { id: "1", opponent: "algo_master", result: "WIN", ratingChange: "+24", date: "2026-06-28", topic: "Arrays" },
  { id: "2", opponent: "byte_hunter", result: "LOSS", ratingChange: "-18", date: "2026-06-26", topic: "Graphs" },
  { id: "3", opponent: "stack_overflow", result: "WIN", ratingChange: "+21", date: "2026-06-24", topic: "DP" },
];

export const topicProgress = [
  { topic: "Arrays", solved: 32, total: 45, percentage: 71 },
  { topic: "Strings", solved: 18, total: 30, percentage: 60 },
  { topic: "Trees", solved: 12, total: 28, percentage: 43 },
  { topic: "Graphs", solved: 8, total: 25, percentage: 32 },
  { topic: "Dynamic Programming", solved: 6, total: 35, percentage: 17 },
  { topic: "Greedy", solved: 14, total: 22, percentage: 64 },
];

export const heatmapData = Array.from({ length: 52 * 7 }, (_, i) => ({
  date: new Date(2025, 6, 1 + i),
  count: Math.floor(Math.random() * 5),
}));

export const leaderboard = [
  { rank: 1, username: "grandmaster_x", rating: 2847, solved: 412 },
  { rank: 2, username: "algo_legend", rating: 2712, solved: 389 },
  { rank: 3, username: "code_ninja", rating: 2654, solved: 356 },
  { rank: 4, username: "dsa_king", rating: 2589, solved: 341 },
  { rank: 5, username: "code_warrior", rating: 1642, solved: 127, isCurrentUser: true },
];

export const contests = [
  {
    id: "1",
    name: "Weekly Challenge #42",
    startTime: "2026-07-05T14:00:00",
    duration: 120,
    problems: 5,
    participants: 234,
    status: "UPCOMING",
  },
  {
    id: "2",
    name: "Summer Code Sprint",
    startTime: "2026-06-28T10:00:00",
    duration: 180,
    problems: 8,
    participants: 567,
    status: "ACTIVE",
  },
  {
    id: "3",
    name: "Beginner Friendly #12",
    startTime: "2026-06-20T16:00:00",
    duration: 90,
    problems: 4,
    participants: 891,
    status: "ENDED",
  },
];

export const chatMessages = [
  { id: "1", sender: "algo_master", message: "Ready when you are!", time: "14:32" },
  { id: "2", sender: "code_warrior", message: "Let's go with medium difficulty", time: "14:33", isMe: true },
  { id: "3", sender: "algo_master", message: "Arrays topic works for me", time: "14:33" },
];

export const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
];

export const aiMessages = [
  {
    id: "1",
    role: "assistant",
    content: "Hi! I'm your AI coding assistant. Ask me for hints, syntax help, or general DSA doubts.",
  },
];
