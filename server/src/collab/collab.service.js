import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { clientToPrismaLang } from "../problems/problems.service.js";

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(userId, { title, language }) {
  const code = generateRoomCode();
  const prismaLang = clientToPrismaLang(language || "javascript");

  const room = await prisma.room.create({
    data: {
      roomCode: code,
      title: title || "Collab Session",
      language: prismaLang,
      ownerId: userId,
      members: {
        create: { userId, role: "OWNER", isOnline: true },
      },
    },
    include: { members: { include: { user: { select: { username: true } } } } },
  });

  return formatRoom(room);
}

export async function joinRoom(roomCode, userId) {
  const room = await prisma.room.findUnique({
    where: { roomCode: roomCode.toUpperCase() },
    include: { members: true },
  });

  if (!room) throw new AppError("Room not found", 404);
  if (room.members.length >= room.maxMembers) {
    throw new AppError("Room is full", 400);
  }

  const existing = room.members.find((m) => m.userId === userId);
  if (!existing) {
    await prisma.roomMember.create({
      data: { roomId: room.id, userId, role: "MEMBER", isOnline: true },
    });
  } else {
    await prisma.roomMember.update({
      where: { id: existing.id },
      data: { isOnline: true },
    });
  }

  return getRoom(roomCode);
}

export async function getRoom(roomCode) {
  const room = await prisma.room.findUnique({
    where: { roomCode: roomCode.toUpperCase() },
    include: {
      members: {
        include: { user: { select: { id: true, username: true } } },
      },
      owner: { select: { username: true } },
    },
  });
  if (!room) throw new AppError("Room not found", 404);
  return formatRoom(room);
}

function formatRoom(room) {
  return {
    id: room.id,
    roomCode: room.roomCode,
    title: room.title,
    language: room.language,
    maxMembers: room.maxMembers,
    members: room.members.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      role: m.role,
      isOnline: m.isOnline,
    })),
  };
}
