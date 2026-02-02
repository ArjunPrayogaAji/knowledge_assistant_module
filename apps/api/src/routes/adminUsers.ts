import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const adminUsersRouter = Router();

adminUsersRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const db = req.db!;
    const users = await db("users").select("id", "email", "name", "role", "created_at").orderBy("created_at", "desc");
    res.json({ data: { items: users } });
  } catch (e) {
    next(e);
  }
});

adminUsersRouter.patch(
  "/:id/role",
  requireAuth,
  requireRole("admin"),
  validateBody(z.object({ role: z.enum(["admin", "member"]) })),
  async (req, res, next) => {
    try {
      const db = req.db!;
      const { role } = req.body as { role: "admin" | "member" };
      const updated = await db("users").where({ id: req.params.id }).update({ role }).returning(["id", "email", "name", "role"]);
      if (!updated[0]) throw new ApiError(404, "NOT_FOUND", "User not found");
      res.json({ data: { user: updated[0] } });
    } catch (e) {
      next(e);
    }
  }
);
