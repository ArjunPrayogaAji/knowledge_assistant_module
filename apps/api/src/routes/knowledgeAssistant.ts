/**
 * apps/api/src/routes/knowledgeAssistant.ts
 *
 * Knowledge Assistant routes — mounted at /knowledge-assistant
 * All routes inherit requireAuth from server.ts mount.
 */

import { Router } from "express";
import crypto from "node:crypto";
import multer from "multer";
import { ApiError } from "../lib/errors.js";
import { requireRole } from "../middleware/auth.js";

export const knowledgeAssistantRouter = Router();

// ── multer — memory storage, 10 MB limit ────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const RAG_URL = process.env.RAG_SERVICE_URL ?? "http://localhost:8000";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? "";

// ── helpers ──────────────────────────────────────────────────────────────────

function isJsonlFile(mimetype: string, originalname: string): boolean {
    const ext = originalname.split(".").pop()?.toLowerCase() ?? "";
    return ext === "jsonl" || ext === "ndjson";
}

interface ParsedLine {
    content: string;
    source_id: string;
    module: string;
    [key: string]: unknown;
}

interface MalformedLine {
    line: number;
    reason: string;
}

function parseJsonlBuffer(buffer: Buffer): { lines: ParsedLine[]; malformed: MalformedLine[] } {
    const raw = buffer.toString("utf-8");
    const lines: ParsedLine[] = [];
    const malformed: MalformedLine[] = [];

    raw
        .split("\n")
        .map((l) => l.trim())
        .forEach((text, idx) => {
            if (!text) return; // skip blank lines
            try {
                const obj = JSON.parse(text) as Record<string, unknown>;
                // Normalise legacy export fields: body→content, id→source_id, type→module
                const content =
                    (obj.content as string | undefined) ||
                    (obj.body as string | undefined) ||
                    (obj.title as string | undefined) ||
                    "";
                const source_id =
                    (obj.source_id as string | undefined) ||
                    (obj.id as string | undefined) ||
                    "";
                const module =
                    (obj.module as string | undefined) ||
                    (obj.type as string | undefined) ||
                    "general";

                if (!content || !source_id) {
                    malformed.push({
                        line: idx + 1,
                        reason: "Missing required fields: content (or body/title), source_id (or id)"
                    });
                    return;
                }
                lines.push({ ...obj, content, source_id, module } as ParsedLine);
            } catch {
                malformed.push({ line: idx + 1, reason: "Invalid JSON" });
            }
        });

    return { lines, malformed };
}

async function generateConversationName(query: string): Promise<string> {
    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Generate a very short conversation title (max 6 words, no quotes) for a chat that starts with this user message: "${query}"`
                                }
                            ]
                        }
                    ],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 32 }
                })
            }
        );
        if (!resp.ok) return query.slice(0, 60);
        const data = (await resp.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? query.slice(0, 60);
    } catch {
        return query.slice(0, 60);
    }
}

// ── 1. POST /upload ──────────────────────────────────────────────────────────

knowledgeAssistantRouter.post(
    "/upload",
    requireRole("admin"),
    (req, res, next) => {
        upload.single("file")(req, res, (err) => {
            if (err) {
                if ((err as { code?: string }).code === "LIMIT_FILE_SIZE") {
                    return next(new ApiError(400, "VALIDATION_ERROR", "File exceeds 10MB limit"));
                }
                return next(new ApiError(400, "VALIDATION_ERROR", (err as Error).message));
            }
            next();
        });
    },
    async (req, res, next) => {
        try {
            const db = req.db!;
            const file = req.file;

            if (!file) {
                throw new ApiError(400, "VALIDATION_ERROR", "No file uploaded");
            }
            if (file.size === 0) {
                throw new ApiError(400, "VALIDATION_ERROR", "File is empty");
            }
            if (!isJsonlFile(file.mimetype, file.originalname)) {
                throw new ApiError(400, "VALIDATION_ERROR", "Only .jsonl or .ndjson files are accepted");
            }

            // Create job row — status=pending
            const [job] = await db("ingestion_jobs")
                .insert({
                    id: crypto.randomUUID(),
                    filename: file.originalname,
                    status: "pending"
                })
                .returning(["id"]);

            const jobId = job.id ?? job;

            // Return job_id immediately, then process async
            res.status(202).json({ job_id: jobId });

            // ── async processing (fire-and-forget) ─────────────────────────────────
            setImmediate(async () => {
                try {
                    const { lines, malformed } = parseJsonlBuffer(file.buffer);

                    await db("ingestion_jobs").where({ id: jobId }).update({ status: "running" });

                    const ragResp = await fetch(`${RAG_URL}/ingest`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ job_id: jobId, filename: file.originalname, lines })
                    });

                    if (!ragResp.ok) {
                        const errText = await ragResp.text();
                        await db("ingestion_jobs")
                            .where({ id: jobId })
                            .update({
                                status: "failed",
                                error_details: JSON.stringify({
                                    rag_error: errText,
                                    malformed_lines: malformed
                                }),
                                updated_at: db.fn.now()
                            });
                        return;
                    }

                    const result = (await ragResp.json()) as {
                        inserted: number;
                        updated: number;
                        skipped: number;
                    };

                    await db("ingestion_jobs")
                        .where({ id: jobId })
                        .update({
                            status: "succeeded",
                            inserted: result.inserted,
                            updated: result.updated,
                            skipped: result.skipped,
                            error_details:
                                malformed.length > 0 ? JSON.stringify({ malformed_lines: malformed }) : null,
                            updated_at: db.fn.now()
                        });
                } catch (err) {
                    await db("ingestion_jobs")
                        .where({ id: jobId })
                        .update({
                            status: "failed",
                            error_details: JSON.stringify({ message: String(err) }),
                            updated_at: db.fn.now()
                        })
                        .catch(() => { });
                }
            });
        } catch (e) {
            next(e);
        }
    }
);

// ── 2. GET /jobs/:id ─────────────────────────────────────────────────────────

knowledgeAssistantRouter.get("/jobs/:id", async (req, res, next) => {
    try {
        const db = req.db!;
        const job = await db("ingestion_jobs").where({ id: req.params.id }).first();
        if (!job) throw new ApiError(404, "NOT_FOUND", "Job not found");
        res.json({ data: { job } });
    } catch (e) {
        next(e);
    }
});

// ── 3. POST /conversations ───────────────────────────────────────────────────

knowledgeAssistantRouter.post("/conversations", async (req, res, next) => {
    try {
        const db = req.db!;
        const [row] = await db("conversations")
            .insert({ id: crypto.randomUUID(), user_id: req.user!.id })
            .returning(["id"]);
        res.status(201).json({ conversation_id: row.id ?? row });
    } catch (e) {
        next(e);
    }
});

// ── 4. GET /conversations ────────────────────────────────────────────────────

knowledgeAssistantRouter.get("/conversations", async (req, res, next) => {
    try {
        const db = req.db!;
        const conversations = await db("conversations")
            .where({ user_id: req.user!.id })
            .orderBy("created_at", "desc");
        res.json({ data: { conversations } });
    } catch (e) {
        next(e);
    }
});

// ── 5. DELETE /conversations/:id ─────────────────────────────────────────────

knowledgeAssistantRouter.delete("/conversations/:id", async (req, res, next) => {
    try {
        const db = req.db!;
        const deleted = await db("conversations")
            .where({ id: req.params.id, user_id: req.user!.id })
            .del();
        if (!deleted) throw new ApiError(404, "NOT_FOUND", "Conversation not found");
        res.json({ data: { ok: true } });
    } catch (e) {
        next(e);
    }
});

// ── 6. PATCH /conversations/:id ──────────────────────────────────────────────

knowledgeAssistantRouter.patch("/conversations/:id", async (req, res, next) => {
    try {
        const db = req.db!;
        const { name } = req.body as { name?: string };
        if (!name || typeof name !== "string" || !name.trim()) {
            throw new ApiError(400, "VALIDATION_ERROR", "name is required");
        }
        const updated = await db("conversations")
            .where({ id: req.params.id, user_id: req.user!.id })
            .update({ name: name.trim() });
        if (!updated) throw new ApiError(404, "NOT_FOUND", "Conversation not found");
        res.json({ data: { ok: true } });
    } catch (e) {
        next(e);
    }
});

// ── 7. GET /conversations/:id/messages ───────────────────────────────────────

knowledgeAssistantRouter.get("/conversations/:id/messages", async (req, res, next) => {
    try {
        const db = req.db!;

        // Verify ownership
        const conv = await db("conversations")
            .where({ id: req.params.id, user_id: req.user!.id })
            .first();
        if (!conv) throw new ApiError(404, "NOT_FOUND", "Conversation not found");

        const messages = await db("messages")
            .where({ conversation_id: req.params.id })
            .orderBy("created_at", "asc");

        // Attach sources to each message
        const messageIds = messages.map((m: { id: string }) => m.id);
        const sources =
            messageIds.length > 0
                ? await db("message_sources").whereIn("message_id", messageIds)
                : [];

        const sourcesByMessage = sources.reduce(
            (acc: Record<string, unknown[]>, s: { message_id: string }) => {
                if (!acc[s.message_id]) acc[s.message_id] = [];
                acc[s.message_id].push(s);
                return acc;
            },
            {} as Record<string, unknown[]>
        );

        const result = messages.map((m: { id: string }) => ({
            ...m,
            sources: sourcesByMessage[m.id] ?? []
        }));

        res.json({ data: { messages: result } });
    } catch (e) {
        next(e);
    }
});

// ── 8. POST /conversations/:id/chat ──────────────────────────────────────────

knowledgeAssistantRouter.post("/conversations/:id/chat", async (req, res, next) => {
    try {
        const db = req.db!;
        const convId = req.params.id;
        const { query, conversation_history = [] } = req.body as {
            query: string;
            conversation_history: { role: string; content: string }[];
        };

        if (!query || typeof query !== "string" || !query.trim()) {
            throw new ApiError(400, "VALIDATION_ERROR", "query is required");
        }

        // Verify ownership
        const conv = await db("conversations").where({ id: convId, user_id: req.user!.id }).first();
        if (!conv) throw new ApiError(404, "NOT_FOUND", "Conversation not found");

        // Check if this is the first message (for auto-naming)
        const existingCount = await db("messages").where({ conversation_id: convId }).count<{ count: string }[]>({ count: "*" }).first();
        const isFirstMessage = Number(existingCount?.count ?? 0) === 0;

        // Save user message
        const [userMsgRow] = await db("messages")
            .insert({
                id: crypto.randomUUID(),
                conversation_id: convId,
                role: "user",
                content: query.trim()
            })
            .returning(["id"]);
        const _userMsgId = userMsgRow.id ?? userMsgRow;

        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // Call RAG service
        let ragResp: Response;
        try {
            ragResp = await fetch(`${RAG_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: query.trim(), conversation_history })
            });
        } catch (fetchErr) {
            res.write(
                `data: ${JSON.stringify({ type: "error", message: "RAG service unavailable" })}\n\n`
            );
            res.end();
            return;
        }

        if (!ragResp.ok || !ragResp.body) {
            res.write(
                `data: ${JSON.stringify({ type: "error", message: "RAG service error" })}\n\n`
            );
            res.end();
            return;
        }

        // Stream RAG → client while accumulating for DB write
        let fullText = "";
        let citations: {
            qdrant_chunk_id: string;
            source_id?: string;
            filename?: string;
            module?: string;
            content_preview?: string;
        }[] = [];

        const reader = ragResp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                res.write(chunk); // pipe live to client

                // Accumulate for parsing
                buffer += chunk;

                // Parse complete SSE lines from buffer
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? ""; // keep incomplete last line

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const evt = JSON.parse(line.slice(6)) as {
                            type: string;
                            content?: string;
                            citations?: typeof citations;
                        };
                        if (evt.type === "text" && evt.content) {
                            fullText += evt.content;
                        } else if (evt.type === "citations" && evt.citations) {
                            citations = evt.citations;
                        }
                    } catch {
                        // malformed SSE line — ignore
                    }
                }
            }
        } finally {
            res.end();
        }

        // Save assistant message + sources (fire-and-forget — stream already done)
        setImmediate(async () => {
            try {
                if (!fullText) return; // nothing to save if stream errored

                const [assistantMsgRow] = await db("messages")
                    .insert({
                        id: crypto.randomUUID(),
                        conversation_id: convId,
                        role: "assistant",
                        content: fullText
                    })
                    .returning(["id"]);

                const assistantMsgId = assistantMsgRow.id ?? assistantMsgRow;

                // Insert message_sources
                if (citations.length > 0) {
                    await db("message_sources").insert(
                        citations.map((c) => ({
                            id: crypto.randomUUID(),
                            message_id: assistantMsgId,
                            qdrant_chunk_id: c.qdrant_chunk_id,
                            metadata: JSON.stringify({
                                source_id: c.source_id,
                                filename: c.filename,
                                module: c.module,
                                content_preview: c.content_preview
                            })
                        }))
                    );
                }

                // Auto-name conversation on first message
                if (isFirstMessage) {
                    const name = await generateConversationName(query.trim());
                    await db("conversations").where({ id: convId }).update({ name });
                }
            } catch (err) {
                // Non-critical — log but don't throw
                console.error("[ka] post-stream save error:", err);
            }
        });
    } catch (e) {
        next(e);
    }
});
