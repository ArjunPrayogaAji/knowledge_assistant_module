import type { RequestHandler } from "express";
import crypto from "node:crypto";
import type { Knex } from "knex";
import { ApiError } from "../lib/errors.js";

export type AuthedUser = { id: string; email: string; name: string; role: "admin" | "member" };

declare global {
  // eslint-disable-next-line no-var
  var __ac_types: unknown;
}

declare module "express-serve-static-core" {
  interface Request {
    db?: Knex;
    user?: AuthedUser;
    sessionId?: string;
  }
}

const COOKIE_NAME = "ac_session";

export function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT ?? "dev_salt_change_me";
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export function attachDb(db: Knex): RequestHandler {
  return (req, _res, next) => {
    req.db = db;
    next();
  };
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const db = req.db;
  if (!db) return next(new ApiError(500, "INTERNAL_ERROR", "DB not attached"));

  const sessionId = (req.cookies?.[COOKIE_NAME] as string | undefined) ?? undefined;
  if (!sessionId) return next(new ApiError(401, "UNAUTHORIZED", "Not logged in"));

  const session = await db("sessions").select("*").where({ id: sessionId }).first();
  if (!session) return next(new ApiError(401, "UNAUTHORIZED", "Invalid session"));
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db("sessions").where({ id: sessionId }).del();
    return next(new ApiError(401, "UNAUTHORIZED", "Session expired"));
  }

  const user = await db("users").select("id", "email", "name", "role").where({ id: session.user_id }).first();
  if (!user) return next(new ApiError(401, "UNAUTHORIZED", "Invalid session user"));

  req.sessionId = sessionId;
  req.user = user;
  next();
};

export function requireRole(role: "admin" | "member"): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "UNAUTHORIZED", "Not logged in"));
    if (role === "member") return next();
    if (req.user.role !== "admin") return next(new ApiError(403, "FORBIDDEN", "Forbidden"));
    next();
  };
}

export function sessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/"
  };
}

export function sessionCookieName() {
  return COOKIE_NAME;
}
