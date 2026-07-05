import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { signAccessToken, signRefreshToken, parseExpiresToMs, verifyToken } from "../utils/jwt.js";
import { sendVerificationEmail } from "../utils/email.js";
import { env } from "../config/env.js";
import { addUsernameToBloom } from "../utils/bloomFilter.js"; // <-- ADDED: Import Bloom Filter utility

export async function registerUser({ username, email, password }) {
  // 1. Check for existing email and username separately
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  const existingUsername = await prisma.user.findUnique({ where: { username } });

  // 2. Prevent taking someone else's username
  if (existingUsername && existingUsername.email !== email) {
    throw new AppError("Username already exists", 409);
  }

  // 3. Handle the existing email logic
  if (existingEmail) {
    if (existingEmail.emailVerified) {
      throw new AppError("Email is already registered and verified. Please log in.", 409);
    } else {
      // User exists but is UNVERIFIED. 
      // We will update their password, clean up old tokens, and resend the email.
      const passwordHash = await bcrypt.hash(password, 12);
      
      const updatedUser = await prisma.user.update({
        where: { id: existingEmail.id },
        data: { passwordHash, username } // Update username in case they typed a new one
      });

      // Also ensure the updated username is in the Bloom Filter
      addUsernameToBloom(updatedUser.username).catch(err => console.error(err));

      // Delete any old verification tokens to keep the database clean
      await prisma.verificationToken.deleteMany({
        where: { userId: updatedUser.id }
      });

      // Generate a fresh token
      const token = uuidv4();
      await prisma.verificationToken.create({
        data: {
          token,
          userId: updatedUser.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      await sendVerificationEmail(updatedUser.email, token);

      return { 
        id: updatedUser.id, 
        username: updatedUser.username, 
        email: updatedUser.email, 
        message: "Verification email resent" 
      };
    }
  }

  // 4. If we reach here, it is a brand new user. Proceed with normal creation.
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      profile: { create: {} },
    },
  });

  addUsernameToBloom(user.username).catch(err => console.error("Bloom error:", err));

  const token = uuidv4();
  await prisma.verificationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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

  if (!user.emailVerified) {
    throw new AppError(
      "Please verify your email before logging in. Check your inbox for the verification link.",
      403
    );
  }

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

export async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token", 401);
  }

  const stored = await prisma.refreshToken.findFirst({
    where: { token: refreshToken, userId: decoded.userId, revoked: false },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError("Refresh token expired", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
      rating: true,
      solvedCount: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);

  const accessToken = signAccessToken({ userId: user.id });
  return { accessToken, user };
}