import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/errors.js";
import { offsetLimit, paginationQuerySchema } from "../lib/pagination.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const entitiesRouter = Router();

const listEntitiesQuery = paginationQuerySchema.extend({
  query: z.string().optional(),
  status: z.enum(["open", "pending", "closed"]).optional(),
  sort: z.enum(["created_at_desc", "created_at_asc", "name_asc", "name_desc"]).default("created_at_desc")
});

entitiesRouter.get("/", requireAuth, validateQuery(listEntitiesQuery), async (req, res, next) => {
  try {
    const db = req.db!;
    const q = req.query as z.infer<typeof listEntitiesQuery>;
    const { offset, limit } = offsetLimit(q);

    const base = db("entities").select("*");
    if (q.query) base.whereILike("name", `%${q.query}%`);
    if (q.status) base.where({ status: q.status });

    // Count must be computed on a separate query (no non-aggregated selects).
    const countQuery = db("entities");
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

entitiesRouter.post(
  "/",
  requireAuth,
  validateBody(
    z.object({
      name: z.string().min(1),
      email_or_key: z.string().min(1),
      status: z.enum(["open", "pending", "closed"]).default("open")
    })
  ),
  async (req, res, next) => {
    try {
      const db = req.db!;
      const body = req.body as { name: string; email_or_key: string; status: string };
      const inserted = await db("entities").insert(body).returning("*");
      res.status(201).json({ data: { entity: inserted[0] } });
    } catch (e) {
      next(e);
    }
  }
);

entitiesRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const db = req.db!;
    const entity = await db("entities").select("*").where({ id: req.params.id }).first();
    if (!entity) throw new ApiError(404, "NOT_FOUND", "Entity not found");
    res.json({ data: { entity } });
  } catch (e) {
    next(e);
  }
});

entitiesRouter.patch(
  "/:id",
  requireAuth,
  validateBody(
    z.object({
      name: z.string().min(1).optional(),
      email_or_key: z.string().min(1).optional(),
      status: z.enum(["open", "pending", "closed"]).optional()
    })
  ),
  async (req, res, next) => {
    try {
      const db = req.db!;
      const body = req.body as Record<string, unknown>;
      const updated = await db("entities").where({ id: req.params.id }).update(body).returning("*");
      if (!updated[0]) throw new ApiError(404, "NOT_FOUND", "Entity not found");
      res.json({ data: { entity: updated[0] } });
    } catch (e) {
      next(e);
    }
  }
);
