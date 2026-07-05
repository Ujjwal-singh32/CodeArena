import prisma from "../config/db.js";
import { getRedis } from "../config/redis.js";
const CACHE_TTL = 600;

export async function getPlatformStats() {
  const [users, problems, submissions, matches] = await Promise.all([
    prisma.user.count(),
    prisma.problem.count({ where: { isPublished: true } }),
    prisma.submission.count(),
    prisma.match.count({ where: { status: "FINISHED" } }),
  ]);

  return {
    users,
    problems,
    submissions,
    duels: matches,
  };
}

export async function getLeaderboard(limit = 10) {
  const redis = getRedis();
  const cacheKey = `leaderboard:${limit}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {}
  }
  const users = await prisma.user.findMany({
    orderBy: { rating: "desc" },
    take: limit,
    select: {
      id: true,
      username: true,
      rating: true,
      solvedCount: true,
    },
  });

  const result = users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.username,
    rating: u.rating,
    solvedCount: u.solvedCount,
  }));

  if (redis) {
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (e) {}
  }

  return result;
}

export async function getUserRank(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;
  const higher = await prisma.user.count({
    where: { rating: { gt: user.rating } },
  });
  return higher + 1;
}

export async function getUserDashboard(userId) {
  const cacheKey = `dashboard:${userId}`;
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn("Redis get error:", err.message);
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) return null;

  const [
    rank,
    submissions,
    duels,
    activity,
    heatmapSubmissions,
    solvedSubmissions, // Replaced solvedProblems to get distinct IDs
    allProblems, // Replaced allTags to get real problem counts
  ] = await Promise.all([
    getUserRank(userId),
    prisma.submission.findMany({
      where: { userId },
      include: { problem: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.matchParticipant.findMany({
      where: { userId },
      include: {
        match: {
          include: {
            participants: { include: { user: { select: { username: true } } } },
            config: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 10,
    }),
    prisma.submission.groupBy({
      by: ["createdAt"],
      where: { userId },
      _count: true,
    }),
    prisma.submission.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 365,
    }),
    // FIX 1: Only get DISTINCT accepted problem IDs
    prisma.submission.findMany({
      where: { userId, status: "ACCEPTED" },
      select: { problemId: true },
      distinct: ['problemId'], 
    }),
    // FIX 1: Get all problems to calculate real topic totals
    prisma.problem.findMany({
      where: { isPublished: true },
      select: { id: true, tags: { include: { tag: true } } },
    }),
  ]);

  // --- Process Heatmap ---
  const heatmapMap = {};
  for (const s of heatmapSubmissions) {
    const day = s.createdAt.toISOString().slice(0, 10);
    heatmapMap[day] = (heatmapMap[day] || 0) + 1;
  }
  const heatmapData = Object.entries(heatmapMap).map(([date, count]) => ({
    date,
    count,
  }));

  // --- FIX 1: Process Accurate Topic Progress ---
  const topicTotalMap = {};
  for (const p of allProblems) {
    for (const t of p.tags) {
      topicTotalMap[t.tag.name] = (topicTotalMap[t.tag.name] || 0) + 1;
    }
  }

  const solvedProblemIds = solvedSubmissions.map(s => s.problemId);
  const solvedProblemsWithTags = allProblems.filter(p => solvedProblemIds.includes(p.id));

  const topicSolvedMap = {};
  for (const p of solvedProblemsWithTags) {
    for (const t of p.tags) {
      topicSolvedMap[t.tag.name] = (topicSolvedMap[t.tag.name] || 0) + 1;
    }
  }

  const topicProgress = Object.keys(topicTotalMap)
    .map((tagName) => {
      const solved = topicSolvedMap[tagName] || 0;
      const total = topicTotalMap[tagName];
      return {
        topic: tagName,
        solved,
        total,
        percentage: total > 0 ? Math.round((solved / total) * 100) : 0,
      };
    })
    .filter((t) => t.solved > 0)
    .sort((a, b) => b.solved - a.solved) // Sort by most solved topics first
    .slice(0, 8);

  // --- FIX 2: Calculate Accurate Streak ---
  const uniqueDates = Object.keys(heatmapMap);
  let streak = 0;
  
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let checkDate = new Date(today);
  if (uniqueDates.includes(todayStr)) {
    // Start counting from today
  } else if (uniqueDates.includes(yesterdayStr)) {
    // Start counting from yesterday (so they don't lose streak if they haven't solved yet today)
    checkDate = yesterday;
  } else {
    // No recent activity
    checkDate = null;
  }

  if (checkDate) {
    let currentStr = checkDate.toISOString().slice(0, 10);
    while (uniqueDates.includes(currentStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      currentStr = checkDate.toISOString().slice(0, 10);
    }
  }

  // 5. Construct the final payload
  const result = {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      rating: user.rating,
      solvedCount: user.solvedCount, // You might want to update this to solvedSubmissions.length in the future!
      streak: streak, // <-- STREAK PASSED HERE
      rank,
      bio: user.profile?.bio || "",
      github: user.profile?.github || "",
      linkedin: user.profile?.linkedin || "",
      leetcode: user.profile?.leetcode || "",
      joinDate: user.createdAt,
    },
    // ... leave the rest of your result object EXACTLY the same ...
    recentSubmissions: submissions.map((s) => ({
      id: s.id,
      problem: s.problem.title,
      slug: s.problem.slug,
      status: s.status,
      language: s.language,
      runtime: s.runtime ? `${s.runtime} ms` : "--",
      date: s.createdAt,
    })),
    duelHistory: duels.map((d) => {
      const opponent = d.match.participants.find((p) => p.userId !== userId);
      const won = d.match.winnerId === userId;
      const ratingChange =
        d.ratingAfter != null ? d.ratingAfter - d.ratingBefore : 0;
      return {
        id: d.matchId,
        opponent: opponent?.user.username || "Unknown",
        topic: d.match.config?.topic || "General",
        result: won ? "WIN" : d.match.status === "FINISHED" ? "LOSS" : "DRAW",
        ratingChange:
          ratingChange >= 0 ? `+${ratingChange}` : `${ratingChange}`,
        date: d.joinedAt,
      };
    }),
    heatmapData,
    topicProgress,
  };

  // 6. Save payload to Redis Cache
  if (redis) {
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch (err) {
      console.warn("Redis set error:", err.message);
    }
  }

  return result;
}

export async function getUserProfile(userId) {
  const redis = getRedis();
  const cacheKey = `profile:${userId}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {}
  }
  const dashboard = await getUserDashboard(userId);
  const leaderboard = await getLeaderboard(10);
  const result = {
    ...dashboard,
    leaderboard: leaderboard.map((entry) => ({
      ...entry,
      isCurrentUser: entry.userId === userId,
    })),
  };

  if (redis) {
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (e) {}
  }

  return result;
}
