import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { addEmailJob } from "../queues/index.js";
import { selectDuelProblem } from "../ai/ai.service.js";
import { getIo } from "../sockets/io.js";

const readyPlayers = new Map();

export async function findMatchAutomatically(userId) {
  // 1. Try to find an open match where the user is NOT already a participant
  const openMatches = await prisma.match.findMany({
    where: { status: "WAITING" },
    include: { participants: true },
    orderBy: { createdAt: "asc" }
  });

  const validMatch = openMatches.find(m => 
    m.participants.length < 2 && 
    !m.participants.some(p => p.userId === userId)
  );

  // 2. If an open match exists, join it
  if (validMatch) {
    return await joinMatch(validMatch.id, userId);
  }

  // 3. Otherwise, create a new waiting match
  return await createMatch(userId, {
    topic: "General",
    difficulty: "EASY",
    questionCount: 1,
    duration: 30,
    title: "1v1 Duel"
  });
}

function emitMatchUpdate(matchId, match) {
  getIo()?.to(`duel:${matchId}`).emit("duel:match-update", { match });
}

function clearReady(matchId) {
  readyPlayers.delete(matchId);
}

export async function createMatch(userId, { topic, difficulty, questionCount, duration, title }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const match = await prisma.match.create({
    data: {
      status: "WAITING",
      config: {
        create: {
          topic,
          difficulty,
          questionCount: parseInt(questionCount, 10),
          duration: parseInt(duration, 10),
        },
      },
      participants: {
        create: {
          userId,
          ratingBefore: user.rating,
        },
      },
    },
    include: {
      config: true,
      participants: { include: { user: { select: { username: true, rating: true } } } },
    },
  });

  return formatMatch(match,title); // Remove the second argument here
}

export async function listOpenMatches({ topic, difficulty, ratingMin, ratingMax }) {
  const matches = await prisma.match.findMany({
    // REMOVED status: "WAITING" so we get all matches for the lobby history
    include: {
      config: true,
      participants: {
        include: { user: { select: { username: true, rating: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return matches
    // REMOVED .filter((m) => m.participants.length < 2)
    .filter((m) => !topic || m.config?.topic === topic)
    .filter((m) => !difficulty || m.config?.difficulty === difficulty)
    .filter((m) => {
      const rating = m.participants[0]?.user?.rating || 1500;
      if (ratingMin && rating < ratingMin) return false;
      if (ratingMax && rating > ratingMax) return false;
      return true;
    })
    .map((m) => formatMatch(m));
}

export async function handlePlayerLeave(matchId, userId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true },
  });
  
  if (!match) return;

  if (match.status === "WAITING") {
    // 1. If game hasn't started, remove them from the room
    await prisma.matchParticipant.deleteMany({ 
      where: { matchId, userId } 
    });
    
    // If room is now empty, close it completely
    const remainingPlayers = match.participants.filter(p => p.userId !== userId);
    if (remainingPlayers.length === 0) {
      await prisma.match.update({ 
        where: { id: matchId }, 
        data: { status: "CLOSED" } 
      });
    }
  } else if (match.status === "RUNNING") {
    // 2. If game is running and they leave, the opponent automatically wins
    const opponent = match.participants.find(p => p.userId !== userId);
    if (opponent) {
      await finishMatch(matchId, opponent.userId);
    }
  }
}

export async function joinMatch(matchId, userId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true, config: true },
  });

  if (!match) throw new AppError("Match not found", 404);
  if (match.status !== "WAITING") throw new AppError("Match is not open", 400);
  if (match.participants.length >= 2) throw new AppError("Room is full", 400);
  if (match.participants.some((p) => p.userId === userId)) {
    throw new AppError("Already in this match", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.matchParticipant.create({
    data: { matchId, userId, ratingBefore: user.rating },
  });

  const updated = await getMatch(matchId);
  emitMatchUpdate(matchId, updated);
  return updated;
}

export async function getMatch(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: parseInt(matchId, 10) || 0 },
    include: {
      config: { include: { problem: true } },
      participants: { include: { user: { select: { id: true, username: true, rating: true } } } },
      chatMessages: {
        include: { sender: { select: { username: true } } },
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });
  if (!match) throw new AppError("Match not found", 404);
  return formatMatchDetail(match);
}

export async function submitMatchConfig(matchId, userId, config) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { config: true, participants: true },
  });
  if (!match) throw new AppError("Match not found", 404);
  if (!match.participants.some((p) => p.userId === userId)) {
    throw new AppError("Not a participant", 403);
  }
  if (match.config?.isLocked) {
    throw new AppError("Match config is locked", 400);
  }

  await prisma.matchConfig.update({
    where: { matchId },
    data: {
      topic: config.topic,
      difficulty: config.difficulty,
      questionCount: parseInt(config.questionCount, 10),
      duration: parseInt(config.duration, 10),
    },
  });

  if (!readyPlayers.has(matchId)) readyPlayers.set(matchId, new Set());
  readyPlayers.get(matchId).add(userId);

  const updated = await getMatch(matchId);
  emitMatchUpdate(matchId, updated);
  getIo()?.to(`duel:${matchId}`).emit("duel:player-ready", { userId });

  if (readyPlayers.get(matchId).size >= 2 && match.participants.length >= 2) {
    return lockAndStartMatch(matchId);
  }

  return updated;
}

export async function lockAndStartMatch(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { config: true, participants: { include: { user: true } } },
  });
  if (!match || match.participants.length < 2) {
    throw new AppError("Need 2 players to start", 400);
  }

  const problemId = await selectDuelProblem(match.config);

  await prisma.matchConfig.update({
    where: { matchId },
    data: { isLocked: true, problemId },
  });

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  clearReady(matchId);
  const updated = await getMatch(matchId);
  emitMatchUpdate(matchId, updated);
  getIo()?.to(`duel:${matchId}`).emit("duel:started", { matchId, match: updated });
  return updated;
}

export async function finishMatch(matchId, winnerId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: { include: { user: true } } },
  });
  if (!match) throw new AppError("Match not found", 404);

  const updates = calculateElo(match.participants, winnerId);

  await prisma.$transaction([
    prisma.match.update({
      where: { id: matchId },
      data: { status: "FINISHED", endedAt: new Date(), winnerId },
    }),
    ...updates.map((u) =>
      prisma.matchParticipant.update({
        where: { id: u.participantId },
        data: { ratingAfter: u.ratingAfter, score: u.score },
      })
    ),
    ...updates.map((u) =>
      prisma.user.update({
        where: { id: u.userId },
        data: { rating: u.ratingAfter },
      })
    ),
  ]);

  for (const u of updates) {
    const participant = match.participants.find((p) => p.userId === u.userId);
    await addEmailJob({
      type: "duel-result",
      email: participant.user.email,
      won: u.userId === winnerId,
      ratingChange: u.ratingAfter - u.ratingBefore,
      opponent: match.participants.find((p) => p.userId !== u.userId)?.user.username,
    });
  }

  return getMatch(matchId);
}

function calculateElo(participants, winnerId) {
  const [a, b] = participants;
  const ratingA = a.ratingBefore;
  const ratingB = b.ratingBefore;
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const scoreA = a.userId === winnerId ? 1 : 0;
  const scoreB = 1 - scoreA;
  const k = 32;
  const newA = Math.round(ratingA + k * (scoreA - expectedA));
  const newB = Math.round(ratingB + k * (scoreB - expectedB));

  return [
    { participantId: a.id, userId: a.userId, ratingBefore: ratingA, ratingAfter: newA, score: scoreA },
    { participantId: b.id, userId: b.userId, ratingBefore: ratingB, ratingAfter: newB, score: scoreB },
  ];
}

function formatMatch(match) {
  const creator = match.participants?.[0]?.user;
  return {
    id: String(match.id),
    title: match.title || `${match.config?.topic || "Open"} Duel`, // <-- UPDATE THIS LINE
    creator: creator?.username || "unknown",
    creatorRating: creator?.rating || 1500,
    topic: match.config?.topic,
    difficulty: match.config?.difficulty,
    duration: match.config?.duration,
    questionCount: match.config?.questionCount,
    status: match.status,
    playerCount: match.participants?.length || 0,
  };
}

function formatMatchDetail(match) {
  const problem = match.config?.problem;
  return {
    ...formatMatch(match),
    config: match.config
      ? {
          ...match.config,
          problem: problem
            ? {
                id: String(problem.id),
                slug: problem.slug,
                title: problem.title,
                statement: problem.statement,
                difficulty: problem.difficulty,
                inputFormat: problem.inputFormat,
                outputFormat: problem.outputFormat,
                constraints: problem.constraints?.split("\n").filter(Boolean) || [],
                timeLimit: problem.timeLimit,
                memoryLimit: problem.memoryLimit,
              }
            : null,
        }
      : null,
    participants: match.participants.map((p) => ({
      id: p.user.id,
      username: p.user.username,
      rating: p.user.rating,
      ratingBefore: p.ratingBefore,
    })),
    chat: match.chatMessages?.map((m) => ({
      id: String(m.id),
      sender: m.sender.username,
      senderId: m.senderId,
      message: m.message,
      time: m.createdAt.toISOString(),
    })),
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    winnerId: match.winnerId,
  };
}
