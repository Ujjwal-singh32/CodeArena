import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { signAccessToken, signRefreshToken, parseExpiresToMs } from "../utils/jwt.js";
import { sendVerificationEmail } from "../utils/email.js";
import { env } from "../config/env.js";

export async function registerUser({ username, email, password }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) throw new AppError("Username or email already exists", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      profile: { create: {} },
    },
  });

  const token = uuidv4();
  await prisma.verificationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail(email, token);

  return { id: user.id, username: user.username, email: user.email };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("Invalid credentials", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + parseExpiresToMs(env.jwt.refreshExpires)),
    },
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      rating: user.rating,
    },
    accessToken,
    refreshToken,
  };
}

export async function verifyEmail(token) {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    throw new AppError("Invalid or expired verification token", 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
    prisma.verificationToken.delete({ where: { id: record.id } }),
  ]);

  return { verified: true };
}

export async function logoutUser(refreshToken) {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  }
  return { loggedOut: true };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) throw new AppError("User not found", 404);
  const { passwordHash, ...safe } = user;
  return safe;
}
