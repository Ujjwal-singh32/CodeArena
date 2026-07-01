import * as collabService from "./collab.service.js";

function getUserId(req) {
  return req.user?.id || 1;
}

export async function create(req, res, next) {
  try {
    const room = await collabService.createRoom(getUserId(req), req.body);
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const room = await collabService.getRoom(req.params.code);
    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function join(req, res, next) {
  try {
    const room = await collabService.joinRoom(req.params.code, getUserId(req));
    res.json({ room });
  } catch (err) {
    next(err);
  }
}
