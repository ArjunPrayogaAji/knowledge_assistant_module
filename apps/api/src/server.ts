import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createKnex } from "./db/knex.js";
import { attachDb } from "./middleware/auth.js";
import { toErrorResponse } from "./lib/errors.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { entitiesRouter } from "./routes/entities.js";
import { activityRouter } from "./routes/activity.js";
import { adminUsersRouter } from "./routes/adminUsers.js";
import { settingsRouter } from "./routes/settings.js";
import { knowledgeRouter } from "./routes/knowledge.js";
import { exportsRouter } from "./routes/exports.js";

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
const db = createKnex();

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
app.use(
  cors({
    origin: corsOrigin,
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachDb(db));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/projects", projectsRouter);
app.use("/entities", entitiesRouter);
app.use("/activity", activityRouter);
app.use("/admin/users", adminUsersRouter);
app.use("/settings", settingsRouter);
app.use("/knowledge", knowledgeRouter);
app.use("/exports", exportsRouter);

// Error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const { status, body } = toErrorResponse(err);
  res.status(status).json(body);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${PORT}`);
});
