import * as usersService from "./users.service.js";
import { AppError } from "../utils/AppError.js";

export async function platformStats(_req, res, next) {
  try {
    const stats = await usersService.getPlatformStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
}

export async function leaderboard(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || "10", 10);
    const entries = await usersService.getLeaderboard(limit);
    res.json({ leaderboard: entries });
  } catch (err) {
    next(err);
  }
}

export async function dashboard(req, res, next) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const data = await usersService.getUserDashboard(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function profile(req, res, next) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const data = await usersService.getUserProfile(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
