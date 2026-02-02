import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";

export const exportsRouter = Router();

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

const exportQuery = z.object({
  ids: z.string().optional(), // comma-separated UUIDs
  category: z.string().optional(),
  updated_after: z.string().optional()
});

// GET /exports/:type - Export items as JSONL
exportsRouter.get("/:type", requireAuth, validateQuery(exportQuery), async (req, res, next) => {
  try {
    const db = req.db!;
    const { type } = req.params;

    if (!isValidType(type)) {
      throw new ApiError(400, "VALIDATION_ERROR", `Invalid type: ${type}`);
    }

    const q = req.query as z.infer<typeof exportQuery>;

    const query = db("knowledge_items").select("*").where({ type });

    if (q.ids) {
      const idList = q.ids.split(",").map((id) => id.trim()).filter(Boolean);
      if (idList.length > 0) {
        query.whereIn("id", idList);
      }
    }

    if (q.category) {
      query.where({ category: q.category });
    }

    if (q.updated_after) {
      query.where("updated_at", ">=", q.updated_after);
    }

    query.orderBy("updated_at", "desc");

    const items = await query;

    // Set headers for JSONL/NDJSON
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-export.jsonl"`);

    // Stream each item as a JSON line
    for (const item of items) {
      res.write(JSON.stringify(item) + "\n");
    }

    res.end();
  } catch (e) {
    next(e);
  }
});
