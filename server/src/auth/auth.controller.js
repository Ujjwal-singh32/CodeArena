import * as authService from "./auth.service.js";
import { registerSchema, loginSchema } from "./auth.validator.js";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";
import { parseExpiresToMs, verifyToken } from "../utils/jwt.js";
import { ZodError } from "zod";
import { checkUsernameInBloom } from "../utils/bloomFilter.js";
import prisma from "../config/db.js";

function setAuthCookies(res, { accessToken, refreshToken }) {
  const isProd = env.nodeEnv === "production";
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge: parseExpiresToMs(env.jwt.accessExpires),
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge: parseExpiresToMs(env.jwt.refreshExpires),
  });
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const user = await authService.registerUser(data);
    res.status(201).json({ message: "Registered. Check email to verify.", user });
  } catch (err) {
    if (err instanceof ZodError) {
      return next(new AppError(err.errors[0]?.message || "Validation error", 400));
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginUser(data);
    setAuthCookies(res, result);
    res.json({ user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logoutUser(req.cookies?.refreshToken);
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    if (!req.user) throw new AppError("Not authenticated", 401);
    const user = await authService.getMe(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) throw new AppError("Token required", 400);
    const result = await authService.verifyEmail(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new AppError("Refresh token required", 401);

    const result = await authService.refreshAccessToken(refreshToken);
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "strict" : "lax",
      maxAge: parseExpiresToMs(env.jwt.accessExpires),
    });
    res.json({ user: result.user });
  } catch (err) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    next(err);
  }
}


// ADD THIS NEW FUNCTION at the bottom of the file
export async function checkUsername(req, res, next) {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username query parameter is required" });
    }

    // 1. Fast Path: Check Bloom Filter First (O(1) Redis Call)
    const probablyExists = await checkUsernameInBloom(username);

    if (!probablyExists) {
      // Bloom filter guarantees it DOES NOT exist. We skip the database!
      return res.json({ available: true, source: "bloom_filter" });
    }

    // 2. Slow Path: False Positives are possible. If Bloom says true, verify in DB.
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    return res.json({ 
      available: !user,
      source: "database"
    });
  } catch (error) {
    next(error);
  }
}
