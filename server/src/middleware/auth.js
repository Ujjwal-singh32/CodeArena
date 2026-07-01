import { verifyToken } from "../utils/jwt.js";
import prisma from "../config/db.js";
import { AppError } from "../utils/AppError.js";

export async function authMiddleware(req, _res, next) {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);
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

    req.user = user;
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }
  next();
}

export function requireVerified(req, _res, next) {
  if (!req.user?.emailVerified) {
    return next(new AppError("Email verification required", 403));
  }
  next();
}
