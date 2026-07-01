import * as problemsService from "./problems.service.js";

export async function list(req, res, next) {
  try {
    const { difficulty, tag, search, page, limit } = req.query;
    const result = await problemsService.listProblems({
      difficulty,
      tag,
      search,
      page: parseInt(page || "1", 10),
      limit: parseInt(limit || "20", 10),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBySlug(req, res, next) {
  try {
    const problem = await problemsService.getProblemBySlug(req.params.slug);
    res.json({ problem });
  } catch (err) {
    next(err);
  }
}
