import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { addEmailJob } from "../queues/index.js";
import { selectDuelProblem } from "../ai/ai.service.js";
import { getIo } from "../sockets/io.js";
import { getRedis } from "../config/redis.js";
const readyPlayers = new Map();

export async function findMatchAutomatically(userId) {
  // 1. Try to find an open match where the user is NOT already a participant
  const redis = getRedis();
  if (!redis) throw new AppError("Matchmaking is currently unavailable", 503);
  const queueKey = "duel:matchmaking_queue";
  const existingQueue = await redis.lrange(queueKey, 0, -1);
  if (existingQueue.includes(String(userId))) {
    return { status: "queued", message: "Already in matchmaking queue" };
  }
  await redis.rpush(queueKey, String(userId));

  const queueLen = await redis.llen(queueKey);
  if (queueLen >= 2) {
    // Pop the first 2 players
    const player1 = await redis.lpop(queueKey);
    const player2 = await redis.lpop(queueKey);

    // Create the match with Player 1 as creator
    const match = await createMatch(parseInt(player1, 10), {
      topic: "General",
      difficulty: "EASY",
      questionCount: 1,
      duration: 30,
      title: "Auto-Match Duel",
    });

    // Add Player 2 to the match
    const parsedMatchId = parseInt(match.id, 10);
    await joinMatch(parsedMatchId, parseInt(player2, 10));

    // Notify both players instantly via Socket.IO
    const io = getIo();
    if (io) {
      io.to(`user:${player1}`).emit("duel:match-found", { matchId: match.id });
      io.to(`user:${player2}`).emit("duel:match-found", { matchId: match.id });
    }

    return { status: "matched", matchId: match.id };
  }

  // 4. If not enough players yet, return queued status
  return { status: "queued", message: "Waiting for opponent..." };
}

function emitMatchUpdate(matchId, match) {
  getIo()?.to(`duel:${matchId}`).emit("duel:match-update", { match });
}

function clearReady(matchId) {
  readyPlayers.delete(matchId);
}

export async function createMatch(
  userId,
  { topic, difficulty, questionCount, duration, title },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  const problemId = await selectDuelProblem({ topic, difficulty });
  const match = await prisma.match.create({
    data: {
      status: "WAITING",
      title: title,
      config: {
        create: {
          topic,
          difficulty,
          questionCount: parseInt(questionCount, 10),
          duration: parseInt(duration, 10),
          isLocked: true, // NEW: Immediately lock the config
          problemId: problemId,
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
      participants: {
        include: { user: { select: { username: true, rating: true } } },
      },
    },
  });
  const io = getIo();
  if (io) {
    io.emit("duel:match-created", formatMatch(match)); // Emits to everyone
  }
  return formatMatch(match, title); // Remove the second argument here
}

export async function listOpenMatches({
  topic,
  difficulty,
  ratingMin,
  ratingMax,
}) {
  const redis = getRedis();
  const cacheKey = `duel:matches:list:${topic || "all"}:${difficulty || "all"}:${ratingMin || 0}:${ratingMax || "max"}`;
  if (redis) {
    try {
      const cachedMatches = await redis.get(cacheKey);
      if (cachedMatches) {
        return JSON.parse(cachedMatches); // Return instantly from memory!
      }
    } catch (err) {
      console.warn("Redis cache read error in listOpenMatches:", err.message);
    }
  }

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
  const formattedMatches = matches
    .filter((m) => !topic || m.config?.topic === topic)
    .filter((m) => !difficulty || m.config?.difficulty === difficulty)
    .filter((m) => {
      const rating = m.participants[0]?.user?.rating || 1500;
      if (ratingMin && rating < ratingMin) return false;
      if (ratingMax && rating > ratingMax) return false;
      return true;
    })
    .map((m) => formatMatch(m));
  if (redis) {
    try {
      // EX 5 = Expires in 5 seconds. Keeps the lobby feeling "live" without killing the DB.
      await redis.set(cacheKey, JSON.stringify(formattedMatches), "EX", 5);
    } catch (err) {
      console.warn("Redis cache write error in listOpenMatches:", err.message);
    }
  }
  return formattedMatches;
}

export async function handlePlayerLeave(matchId, userId) {
  const parsedMatchId = parseInt(matchId, 10);
  const parsedUserId = parseInt(userId, 10);

  if (isNaN(parsedMatchId) || isNaN(parsedUserId)) return;
  const match = await prisma.match.findUnique({
    where: { id: parsedMatchId },
    include: { participants: true },
  });

  if (!match) return;

  if (match.status === "WAITING" || match.status === "RUNNING") {
    const opponent = match.participants.find((p) => p.userId !== parsedUserId);

    if (opponent) {
      // Opponent exists: Declare them the winner!
      const finishedMatch = await finishMatch(parsedMatchId, opponent.userId);

      // Emit the victory to the remaining player's socket
      import("../sockets/io.js").then(({ getIo }) => {
        const io = getIo();
        if (io) {
          io.to(`duel:${parsedMatchId}`).emit("duel:finished", {
            matchId: parsedMatchId,
            winnerId: opponent.userId,
            match: finishedMatch,
          });
        }
      });
    } else {
      // No opponent ever joined: Permanently close the room.
      await prisma.match.update({
        where: { id: parsedMatchId },
        data: { status: "CLOSED" },
      });
    }
  }
}

export async function joinMatch(matchId, userId) {
  const redis = getRedis();
  const lockKey = `lock:match:${matchId}`;
  if (redis) {
    // Attempt to acquire lock for 3 seconds
    const acquired = await redis.set(lockKey, userId, "NX", "PX", 3000);
    if (!acquired)
      throw new AppError(
        "Match is currently being joined by another player. Try again.",
        409,
      );
  }
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true, config: true },
    });
    if (match.participants.length >= 2) throw new AppError("Room is full", 400);
    if (!match) throw new AppError("Match not found", 404);
    if (match.participants.some((p) => p.userId === userId)) {
      return getMatch(matchId);
    }
    if (match.status !== "WAITING")
      throw new AppError("Match is not open", 400);
    if (match.participants.length >= 2) throw new AppError("Room is full", 400);
    if (match.participants.some((p) => p.userId === userId)) {
      throw new AppError("Already in this match", 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.matchParticipant.create({
      data: { matchId, userId, ratingBefore: user.rating },
    });
    const currentMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    let autoStarted = false;
    if (currentMatch.participants.length >= 2) {
      await prisma.match.update({
        where: { id: matchId },
        data: { status: "RUNNING", startedAt: new Date() },
      });
      autoStarted = true;
    }
    const updated = await getMatch(matchId);
    emitMatchUpdate(matchId, updated);
    if (autoStarted) {
      getIo()
        ?.to(`duel:${matchId}`)
        .emit("duel:started", { matchId, match: updated });
    }
    return updated;
  } finally {
    if (redis) await redis.del(lockKey);
  }
}

export async function getMatch(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: parseInt(matchId, 10) || 0 },
    include: {
      config: { include: { problem: true } },
      participants: {
        include: {
          user: { select: { id: true, username: true, rating: true } },
        },
      },
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
  getIo()
    ?.to(`duel:${matchId}`)
    .emit("duel:started", { matchId, match: updated });
  return updated;
}

export async function finishMatch(matchId, winnerId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: { include: { user: true } } },
  });
  if (!match) throw new AppError("Match not found", 404);
  // 1. ATOMIC LOCK: Try to update the match ONLY if it is still RUNNING
  const atomicUpdate = await prisma.match.updateMany({
    where: {
      id: matchId,
      status: "RUNNING", // The crucial lock condition
    },
    data: { status: "FINISHED", endedAt: new Date(), winnerId },
  });
  if (atomicUpdate.count === 0) {
    console.log(
      `Race condition mitigated for match ${matchId}. Winner was already decided.`,
    );
    return getMatch(matchId); // Return the match data with the TRUE winner
  }
  const updates = calculateElo(match.participants, winnerId);

  await prisma.$transaction([
    // We already updated the Match table above, so we only update Participants and Users here
    ...updates.map((u) =>
      prisma.matchParticipant.update({
        where: { id: u.participantId },
        data: { ratingAfter: u.ratingAfter, score: u.score },
      }),
    ),
    ...updates.map((u) =>
      prisma.user.update({
        where: { id: u.userId },
        data: { rating: u.ratingAfter },
      }),
    ),
  ]);

  for (const u of updates) {
    const participant = match.participants.find((p) => p.userId === u.userId);
    await addEmailJob({
      type: "duel-result",
      email: participant.user.email,
      won: u.userId === winnerId,
      ratingChange: u.ratingAfter - u.ratingBefore,
      opponent: match.participants.find((p) => p.userId !== u.userId)?.user
        .username,
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
    {
      participantId: a.id,
      userId: a.userId,
      ratingBefore: ratingA,
      ratingAfter: newA,
      score: scoreA,
    },
    {
      participantId: b.id,
      userId: b.userId,
      ratingBefore: ratingB,
      ratingAfter: newB,
      score: scoreB,
    },
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
                constraints:
                  problem.constraints?.split("\n").filter(Boolean) || [],
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
export async function cancelMatchmaking(userId) {
  const redis = getRedis();
  if (redis) {
    // Remove the user from the Redis queue
    await redis.lrem("duel:matchmaking_queue", 0, String(userId));
  }
  return { success: true };
}