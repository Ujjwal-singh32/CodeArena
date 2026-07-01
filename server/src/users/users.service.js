import prisma from "../config/db.js";

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

  return users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.username,
    rating: u.rating,
    solvedCount: u.solvedCount,
  }));
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) return null;

  const rank = await getUserRank(userId);

  const submissions = await prisma.submission.findMany({
    where: { userId },
    include: { problem: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const duels = await prisma.matchParticipant.findMany({
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
  });

  const activity = await prisma.submission.groupBy({
    by: ["createdAt"],
    where: { userId },
    _count: true,
  });

  const heatmapMap = {};
  for (const s of await prisma.submission.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 365,
  })) {
    const day = s.createdAt.toISOString().slice(0, 10);
    heatmapMap[day] = (heatmapMap[day] || 0) + 1;
  }

  const heatmapData = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }));

  const solvedProblems = await prisma.submission.findMany({
    where: { userId, status: "ACCEPTED" },
    select: { problem: { select: { tags: { include: { tag: true } } } } },
  });

  const topicMap = {};
  for (const s of solvedProblems) {
    for (const t of s.problem.tags) {
      topicMap[t.tag.name] = (topicMap[t.tag.name] || 0) + 1;
    }
  }

  const allTags = await prisma.tag.findMany();
  const topicProgress = allTags.map((tag) => {
    const solved = topicMap[tag.name] || 0;
    const total = 0;
    return {
      topic: tag.name,
      solved,
      total: Math.max(solved, 5),
      percentage: Math.min(100, Math.round((solved / Math.max(solved, 5)) * 100)),
    };
  }).filter((t) => t.solved > 0).slice(0, 8);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      rating: user.rating,
      solvedCount: user.solvedCount,
      rank,
      bio: user.profile?.bio || "",
      github: user.profile?.github || "",
      linkedin: user.profile?.linkedin || "",
      leetcode: user.profile?.leetcode || "",
      joinDate: user.createdAt,
    },
    recentSubmissions: submissions.map((s) => ({
      id: s.id,
      problem: s.problem.title,
      slug: s.problem.slug,
      status: s.status,
      language: s.language,
      runtime: s.runtime ? `${s.runtime} ms` : "—",
      date: s.createdAt,
    })),
    duelHistory: duels.map((d) => {
      const opponent = d.match.participants.find((p) => p.userId !== userId);
      const won = d.match.winnerId === userId;
      const ratingChange = d.ratingAfter != null ? d.ratingAfter - d.ratingBefore : 0;
      return {
        id: d.matchId,
        opponent: opponent?.user.username || "Unknown",
        topic: d.match.config?.topic || "General",
        result: won ? "WIN" : d.match.status === "FINISHED" ? "LOSS" : "DRAW",
        ratingChange: ratingChange >= 0 ? `+${ratingChange}` : `${ratingChange}`,
        date: d.joinedAt,
      };
    }),
    heatmapData,
    topicProgress,
  };
}

export async function getUserProfile(userId) {
  const dashboard = await getUserDashboard(userId);
  const leaderboard = await getLeaderboard(10);
  return {
    ...dashboard,
    leaderboard: leaderboard.map((entry) => ({
      ...entry,
      isCurrentUser: entry.userId === userId,
    })),
  };
}
