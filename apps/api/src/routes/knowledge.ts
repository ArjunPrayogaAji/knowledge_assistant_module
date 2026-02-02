import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/errors.js";
import { offsetLimit, paginationQuerySchema } from "../lib/pagination.js";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";

export const knowledgeRouter = Router();

const VALID_TYPES = [
  "docs",
  "policies",
  "api_reference",
  "changelog",
  "incidents",
  "support",
  "feature_flags",
  "analytics_events",
  "playbooks"
] as const;

type KnowledgeType = (typeof VALID_TYPES)[number];

function isValidType(type: string): type is KnowledgeType {
  return VALID_TYPES.includes(type as KnowledgeType);
}

const listKnowledgeQuery = paginationQuerySchema.extend({
  query: z.string().optional(),
  category: z.string().optional(),
  updated_after: z.string().optional(),
  sort: z.enum(["updated_at_desc", "updated_at_asc", "title_asc", "title_desc"]).default("updated_at_desc")
});

// IMPORTANT: Specific routes MUST come before parameterized routes

// GET /knowledge/stats/counts - Get counts per type
knowledgeRouter.get("/stats/counts", requireAuth, async (req, res, next) => {
  try {
    const db = req.db!;

    const counts = await db("knowledge_items")
      .select("type")
      .count<{ type: string; count: string }[]>({ count: "*" })
      .groupBy("type");

    const result: Record<string, number> = {};
    for (const row of counts) {
      result[row.type] = Number(row.count);
    }

    res.json({ data: { counts: result } });
  } catch (e) {
    next(e);
  }
});

// GET /knowledge/recent/all - Get recent items across all types
knowledgeRouter.get("/recent/all", requireAuth, async (req, res, next) => {
  try {
    const db = req.db!;
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const items = await db("knowledge_items")
      .select("id", "type", "title", "category", "updated_at")
      .orderBy("updated_at", "desc")
      .limit(limit);

    res.json({ data: { items } });
  } catch (e) {
    next(e);
  }
});

// GET /knowledge/categories/:type - Get categories for a type
knowledgeRouter.get("/categories/:type", requireAuth, async (req, res, next) => {
  try {
    const db = req.db!;
    const { type } = req.params;

    if (!isValidType(type)) {
      throw new ApiError(400, "VALIDATION_ERROR", `Invalid type: ${type}`);
    }

    const categories = await db("knowledge_items")
      .distinct("category")
      .where({ type })
      .orderBy("category", "asc");

    res.json({ data: { categories: categories.map((c) => c.category) } });
  } catch (e) {
    next(e);
  }
});

// GET /knowledge/:type - List items of a type
knowledgeRouter.get("/:type", requireAuth, validateQuery(listKnowledgeQuery), async (req, res, next) => {
  try {
    const db = req.db!;
    const { type } = req.params;

    if (!isValidType(type)) {
      throw new ApiError(400, "VALIDATION_ERROR", `Invalid type: ${type}`);
    }

    const q = req.query as z.infer<typeof listKnowledgeQuery>;
    const { offset, limit } = offsetLimit(q);

    const base = db("knowledge_items").select("*").where({ type });
    if (q.query) base.whereILike("title", `%${q.query}%`);
    if (q.category) base.where({ category: q.category });
    if (q.updated_after) base.where("updated_at", ">=", q.updated_after);

    // Count query
    const countQuery = db("knowledge_items").where({ type });
    if (q.query) countQuery.whereILike("title", `%${q.query}%`);
    if (q.category) countQuery.where({ category: q.category });
    if (q.updated_after) countQuery.where("updated_at", ">=", q.updated_after);
    const totalRow = await countQuery.count<{ count: string }[]>({ count: "*" }).first();
    const total = Number(totalRow?.count ?? 0);

    switch (q.sort) {
      case "updated_at_asc":
        base.orderBy("updated_at", "asc");
        break;
      case "updated_at_desc":
        base.orderBy("updated_at", "desc");
        break;
      case "title_asc":
        base.orderBy("title", "asc");
        break;
      case "title_desc":
        base.orderBy("title", "desc");
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

// GET /knowledge/:type/:id - Get single item
knowledgeRouter.get("/:type/:id", requireAuth, async (req, res, next) => {
  try {
    const db = req.db!;
    const { type, id } = req.params;

    if (!isValidType(type)) {
      throw new ApiError(400, "VALIDATION_ERROR", `Invalid type: ${type}`);
    }

    const item = await db("knowledge_items").select("*").where({ id, type }).first();
    if (!item) throw new ApiError(404, "NOT_FOUND", "Item not found");

    res.json({ data: { item } });
  } catch (e) {
    next(e);
  }
});
