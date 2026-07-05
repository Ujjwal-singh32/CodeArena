import * as duelService from "./duel.service.js";
import { AppError } from "../utils/AppError.js";

function getUserId(req) {
  if (!req.user?.id) throw new AppError("Authentication required", 401);
  return req.user.id;
}

export async function create(req, res, next) {
  try {
    const match = await duelService.createMatch(getUserId(req), req.body);
    res.status(201).json({ match });
  } catch (err) {
    next(err);
  }
}
export async function findOpponent(req, res, next) {
  try {
    const match = await duelService.findMatchAutomatically(getUserId(req));
    res.json({ match });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const { topic, difficulty, rating } = req.query;
    let ratingMin, ratingMax;
    if (rating === "0-1200") { ratingMax = 1199; }
    else if (rating === "1200-1600") { ratingMin = 1200; ratingMax = 1599; }
    else if (rating === "1600-2000") { ratingMin = 1600; ratingMax = 1999; }
    else if (rating === "2000+") { ratingMin = 2000; }

    const matches = await duelService.listOpenMatches({ topic, difficulty, ratingMin, ratingMax });
    res.json({ matches });
  } catch (err) {
    next(err);
  }
}

export async function join(req, res, next) {
  try {
    const match = await duelService.joinMatch(parseInt(req.params.id, 10), getUserId(req));
    res.json({ match });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const match = await duelService.getMatch(req.params.id);
    res.json({ match });
  } catch (err) {
    next(err);
  }
}

export async function start(req, res, next) {
  try {
    const match = await duelService.lockAndStartMatch(parseInt(req.params.id, 10));
    res.json({ match });
  } catch (err) {
    next(err);
  }
}

export async function submitConfig(req, res, next) {
  try {
    const match = await duelService.submitMatchConfig(
      parseInt(req.params.id, 10),
      getUserId(req),
      req.body
    );
    res.json({ match });
  } catch (err) {
    next(err);
  }
}
// Add this new function to the file
export async function cancelFind(req, res, next) {
  try {
    await duelService.cancelMatchmaking(getUserId(req));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
