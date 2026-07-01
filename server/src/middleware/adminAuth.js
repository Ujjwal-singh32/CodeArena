import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export function requireAdminKey(req, _res, next) {
  const key = req.headers["x-admin-key"] || req.query.adminKey;
  if (!env.admin.apiKey) {
    return next(new AppError("Admin API key not configured on server", 503));
  }
  if (key !== env.admin.apiKey) {
    return next(new AppError("Invalid admin API key", 401));
  }
  next();
}
