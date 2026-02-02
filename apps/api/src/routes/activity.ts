import { Router } from "express";
import { z } from "zod";
import { offsetLimit, paginationQuerySchema } from "../lib/pagination.js";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";

export const activityRouter = Router();

const listActivityQuery = paginationQuerySchema.extend({
  query: z.string().optional()
});

activityRouter.get("/", requireAuth, validateQuery(listActivityQuery), async (req, res, next) => {
  try {
    const db = req.db!;
    const q = req.query as z.infer<typeof listActivityQuery>;
    const { offset, limit } = offsetLimit(q);

    const base = db("activity_log as a")
      .leftJoin("users as u", "u.id", "a.actor_user_id")
      .select(
        "a.id",
        "a.action",
        "a.metadata_json",
        "a.created_at",
        "u.id as actor_id",
        "u.email as actor_email",
        "u.name as actor_name"
      );

    const applyFilter = (qb: any) => {
      if (!q.query) return;
      qb.where((w: any) => {
        w.whereILike("a.action", `%${q.query}%`).orWhereILike("u.email", `%${q.query}%`);
      });
    };

    applyFilter(base);

    // Count must be computed separately; counting on a query with selected columns triggers GROUP BY errors in Postgres.
    const countQuery = db("activity_log as a").leftJoin("users as u", "u.id", "a.actor_user_id");
    applyFilter(countQuery);
    const totalRow = await countQuery.count<{ count: string }[]>({ count: "a.id" }).first();
    const total = Number(totalRow?.count ?? 0);

    const items = await base.orderBy("a.created_at", "desc").offset(offset).limit(limit);
    res.json({ data: { items, page: q.page, pageSize: q.pageSize, total } });
  } catch (e) {
    next(e);
  }
});
