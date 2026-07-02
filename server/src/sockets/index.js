import prisma from "../config/db.js";
import { finishMatch } from "../duel/duel.service.js";
import * as Y from "yjs";

const collabRooms = new Map();
// 1. Add a map to track our cleanup timers
const cleanupTimers = new Map(); 

function getCollabRoom(code) {
  const key = code.toUpperCase();
  if (!collabRooms.has(key)) {
    collabRooms.set(key, { users: new Map(), ydoc: new Y.Doc() }); 
  }
  return collabRooms.get(key);
}

export function setupSockets(io) {
  io.on("connection", (socket) => {
    socket.on("join", ({ userId }) => {
      if (userId) socket.join(`user:${userId}`);
    });

    // ── Collab (Yjs sync + chat) ──
    socket.on("collab:join", ({ roomCode, userId, username, color }) => {
      const key = roomCode.toUpperCase();
      const room = getCollabRoom(roomCode);
      const odId = String(userId || socket.id);
      
      room.users.set(socket.id, {
        id: socket.id,
        odId,
        name: username || "guest",
        color: color || "#00ff88",
      });
      
      socket.join(`collab:${key}`);
      socket.collabRoom = key;
      socket.collabUserId = odId;

      // 2. If someone joins, CANCEL any pending room deletion timer!
      if (cleanupTimers.has(key)) {
        clearTimeout(cleanupTimers.get(key));
        cleanupTimers.delete(key);
      }

      const stateVector = Y.encodeStateAsUpdate(room.ydoc);
      socket.emit("collab:sync", { update: Array.from(stateVector) });

      broadcastCollabUsers(io, roomCode);
    });

    socket.on("collab:update", ({ roomCode, update }) => {
      const room = getCollabRoom(roomCode);
      Y.applyUpdate(room.ydoc, new Uint8Array(update));
      socket.to(`collab:${roomCode.toUpperCase()}`).emit("collab:sync", { update });
    });

    socket.on("collab:awareness", ({ roomCode, update }) => {
      socket.to(`collab:${roomCode.toUpperCase()}`).emit("collab:awareness", { update });
    });

    socket.on("collab:chat", ({ roomCode, sender, message, isAi, senderSocketId, clientMsgId }) => {
      const payload = {
        sender,
        message,
        isAi: !!isAi,
        senderSocketId: senderSocketId || socket.id,
        clientMsgId: clientMsgId || null,
      };
      socket.to(`collab:${roomCode.toUpperCase()}`).emit("collab:chat", payload);
    });

    socket.on("collab:leave", ({ roomCode }) => {
      leaveCollabRoom(socket, io, roomCode);
    });

    // ── Duel room ──
    socket.on("duel:join", ({ matchId, userId }) => {
      socket.join(`duel:${matchId}`);
      socket.duelMatchId = matchId;
      socket.duelUserId = userId;
    });

    socket.on("duel:chat", async ({ matchId, message, senderId, clientMsgId }) => {
      try {
        const msg = await prisma.chatMessage.create({
          data: { matchId: parseInt(matchId, 10), senderId, message },
          include: { sender: { select: { username: true } } },
        });
        io.to(`duel:${matchId}`).emit("duel:chat", {
          id: String(msg.id),
          clientMsgId: clientMsgId || null,
          sender: msg.sender.username,
          senderId,
          message: msg.message,
          time: msg.createdAt.toISOString(),
        });
      } catch (err) {
        console.error("duel:chat error:", err.message);
      }
    });

    socket.on("duel:config-ready", ({ matchId, userId }) => {
      io.to(`duel:${matchId}`).emit("duel:player-ready", { userId });
    });

    socket.on("duel:match-start", ({ matchId }) => {
      io.to(`duel:${matchId}`).emit("duel:started", { matchId });
    });

    socket.on("duel:submit-win", async ({ matchId, winnerId }) => {
      try {
        const match = await finishMatch(parseInt(matchId, 10), winnerId);
        io.to(`duel:${matchId}`).emit("duel:finished", { matchId, winnerId, match });
      } catch (err) {
        console.error("duel:submit-win error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      if (socket.collabRoom) {
        leaveCollabRoom(socket, io, socket.collabRoom);
      }
    });
  });
}

function leaveCollabRoom(socket, io, roomCode) {
  const key = roomCode.toUpperCase();
  const room = collabRooms.get(key);
  
  if (!room) return;

  room.users.delete(socket.id);
  socket.leave(`collab:${key}`);
  
  // 3. The Grace Period Logic
  if (room.users.size === 0) {
    // Wait 24 hours (86400000 milliseconds) before destroying the code
    const timer = setTimeout(() => {
      if (collabRooms.has(key) && collabRooms.get(key).users.size === 0) {
        collabRooms.get(key).ydoc.destroy();
        collabRooms.delete(key);
        cleanupTimers.delete(key);
      }
    }, 24 * 60 * 60 * 1000); // <-- 24 hours
    
    cleanupTimers.set(key, timer);
  } else {
    broadcastCollabUsers(io, roomCode);
  }
}

function broadcastCollabUsers(io, roomCode) {
  const room = getCollabRoom(roomCode);
  const seen = new Set();
  const users = [];
  for (const user of room.users.values()) {
    if (seen.has(user.odId)) continue;
    seen.add(user.odId);
    users.push(user);
  }
  io.to(`collab:${roomCode.toUpperCase()}`).emit("collab:users", users);
}