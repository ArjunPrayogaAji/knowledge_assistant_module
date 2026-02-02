import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { ApiError } from "../lib/errors.js";
import { validateBody } from "../middleware/validate.js";
import { hashPassword, requireAuth, sessionCookieName, sessionCookieOptions } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  validateBody(
    z.object({
      email: z.string().email(),
      password: z.string().min(1)
    })
  ),
  async (req, res, next) => {
    try {
      const db = req.db!;
      const { email, password } = req.body as { email: string; password: string };

      const user = await db("users").select("*").where({ email }).first();
      if (!user) throw new ApiError(401, "UNAUTHORIZED", "Invalid email or password");

      const expected = hashPassword(password);
      if (user.password_hash !== expected) throw new ApiError(401, "UNAUTHORIZED", "Invalid email or password");

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const inserted = await db("sessions")
        .insert({ id: crypto.randomUUID(), user_id: user.id, expires_at: expiresAt })
        .returning(["id"]);

      const sessionId = inserted[0]?.id ?? inserted[0];
      res.cookie(sessionCookieName(), sessionId, sessionCookieOptions());
      res.json({
        data: { user: { id: user.id, email: user.email, name: user.name, role: user.role } }
      });
    } catch (e) {
      next(e);
    }
  }
);

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const db = req.db!;
    await db("sessions").where({ id: req.sessionId }).del();
    res.clearCookie(sessionCookieName(), { path: "/" });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ data: { user: req.user } });
});
