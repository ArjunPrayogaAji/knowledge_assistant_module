import type { RequestHandler } from "express";
import { z } from "zod";
import { ApiError } from "../lib/errors.js";

export function validateQuery<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(new ApiError(400, "VALIDATION_ERROR", parsed.error.message));
    req.query = parsed.data as any;
    next();
  };
}

export function validateBody<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new ApiError(400, "VALIDATION_ERROR", parsed.error.message));
    req.body = parsed.data;
    next();
  };
}
