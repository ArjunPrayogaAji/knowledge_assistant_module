import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const settingsRouter = Router();

settingsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const db = req.db!;
    const featureFlags = await db("feature_flags").select("*").orderBy("key", "asc");
    const apiKeys = await db("api_keys").select("*").orderBy("created_at", "desc");
    res.json({ data: { featureFlags, apiKeys } });
  } catch (e) {
    next(e);
  }
});

settingsRouter.patch(
  "/feature-flags/:key",
  requireAuth,
  requireRole("admin"),
  validateBody(z.object({ enabled: z.boolean() })),
  async (req, res, next) => {
    try {
      const db = req.db!;
      const { enabled } = req.body as { enabled: boolean };
      const updated = await db("feature_flags").where({ key: req.params.key }).update({ enabled }).returning("*");
      res.json({ data: { featureFlag: updated[0] } });
    } catch (e) {
      next(e);
    }
  }
);
