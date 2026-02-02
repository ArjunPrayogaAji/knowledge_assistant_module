import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/errors.js";
import { offsetLimit, paginationQuerySchema } from "../lib/pagination.js";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";

export const projectsRouter = Router();

const listProjectsQuery = paginationQuerySchema.extend({
  query: z.string().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  sort: z.enum(["created_at_desc", "created_at_asc", "name_asc", "name_desc"]).default("created_at_desc")
});

projectsRouter.get("/", requireAuth, validateQuery(listProjectsQuery), async (req, res, next) => {
  try {
    const db = req.db!;
    const q = req.query as z.infer<typeof listProjectsQuery>;
    const { offset, limit } = offsetLimit(q);

    const base = db("projects").select("*");
    if (q.query) base.whereILike("name", `%${q.query}%`);
    if (q.status) base.where({ status: q.status });

    // Count must be computed on a separate query (no non-aggregated selects).
    const countQuery = db("projects");
    if (q.query) countQuery.whereILike("name", `%${q.query}%`);
    if (q.status) countQuery.where({ status: q.status });
    const totalRow = await countQuery.count<{ count: string }[]>({ count: "*" }).first();
    const total = Number(totalRow?.count ?? 0);

    switch (q.sort) {
      case "created_at_asc":
        base.orderBy("created_at", "asc");
        break;
      case "created_at_desc":
        base.orderBy("created_at", "desc");
        break;
      case "name_asc":
        base.orderBy("name", "asc");
        break;
      case "name_desc":
        base.orderBy("name", "desc");
        break;
      default:
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid sort");
    }

    const items = await base.offset(offset).limit(limit);
    res.json({ data: { items, page: q.page, pageSize: q.pageSize, total } });
  } catch (e) {
    next(e);
  }
});

projectsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const db = req.db!;
    const project = await db("projects").select("*").where({ id: req.params.id }).first();
    if (!project) throw new ApiError(404, "NOT_FOUND", "Project not found");

    const activity = await db("activity_log")
      .select("id", "action", "metadata_json", "created_at", "actor_user_id")
      .whereRaw("metadata_json->>'projectId' = ?", [project.id])
      .orderBy("created_at", "desc")
      .limit(20);

    res.json({ data: { project, recentActivity: activity } });
  } catch (e) {
    next(e);
  }
});
