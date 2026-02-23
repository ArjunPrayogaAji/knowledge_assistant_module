# CONTEXT.md — Knowledge Assistant Module
## Adamant SaaS — Take-Home Assignment

> **Read this file before doing anything.** This is the single source of truth for the entire project.

---

## 1. What We Are Building

Adding a **Knowledge Assistant** module to the existing Adamant SaaS dashboard. Not a new project — everything integrates into the existing codebase.

Two features:
- **Knowledge Uploader** (admin-only): upload JSONL documents into a vector database
- **Chatbot** (per-user): ChatGPT-style UI that answers questions using RAG from the knowledge base

---

## 2. Final Architecture

```
[Next.js Web]
    ↓ fetch / SSE
[Express API — Node.js]  ←→  [PostgreSQL 16]
    ↓ proxy RAG calls
[FastAPI RAG — Python]   ←→  [Qdrant]
```

**5 Docker Compose containers:**

| Service | Image / Build | Port | Responsibility |
|---------|--------------|------|----------------|
| `db` | postgres:16 | 5432 | PostgreSQL — conversations, messages, jobs |
| `qdrant` | qdrant/qdrant:latest | 6333 | Vector DB — document chunks, hybrid search |
| `api` | Build from Dockerfile | 4000 | Express — auth, job mgmt, conversation CRUD, proxy to RAG |
| `rag` | Build from apps/rag/Dockerfile | 8000 | Python FastAPI — chunking, embedding, retrieval, LLM, streaming |
| `web` | Build from Dockerfile | 3000 | Next.js frontend |

**Hard data boundary:**
- **PostgreSQL** stores: `conversations`, `messages`, `message_sources`, `ingestion_jobs`
- **Qdrant** stores: `document_chunks` (768-dim vectors + payload metadata)

---

## 3. Tech Stack — Final Decisions (CLOSED)

| Layer | Technology | Critical Notes |
|-------|-----------|----------------|
| Frontend | Next.js (existing) | Match existing patterns exactly |
| Backend API | Express + Node.js (existing) | Auth, job mgmt, conversation CRUD only — no AI logic here |
| RAG Service | Python FastAPI (NEW) | All AI logic: chunking, embed, retrieve, LLM |
| Database | PostgreSQL via Knex | New migrations for KA tables |
| Vector DB | Qdrant (NEW container) | Hybrid search built-in — no manual RRF needed |
| Embeddings | gemini-embedding-001 | **768 dimensions** — via `google-generativeai` SDK |
| LLM | gemini-2.5-flash | StreamingResponse from FastAPI → Node → browser |
| Chunking | Parent-Child + Semantic | Parent = full doc context, Child = precise retrieval unit |
| Retrieval | Hybrid Search (Dense + Sparse) | Qdrant handles fusion natively |
| Auth | Existing session cookie | **DO NOT reinvent** — Node.js handles all auth |

**API Key:** Use `GOOGLE_API_KEY`. `OPENAI_API_KEY` is **not used at all.**

---

## 4. Existing Codebase Analysis (Milestone 1 — COMPLETE)

### 4.1 Folder Structure
```
/
├── apps/
│   ├── api/        ← Express backend (@ac/api)
│   └── web/        ← Next.js frontend (@ac/web)
├── packages/
│   └── db/         ← Knex migrations & seeds (@ac/db)
├── docker-compose.yml
└── .env / .env.example
```

### 4.2 Sidebar Navigation
- File: `apps/web/components/layout/nav.ts`
- Typed nav config consumed by the real dashboard sidebar
- New "Assistant" group already added in Milestone 2 ✅

### 4.3 Authentication Pattern
- **Session-based cookie auth** — no JWT, no NextAuth
- **Backend:** `requireAuth` middleware reads `ac_session` cookie → validates session in DB → attaches `req.user`
- **Frontend:** `RequireAuth` component calls `GET /auth/me` on mount → redirects to `/login` if fails
- **Role check:** `requireRole('admin')` middleware → 403 if not admin

### 4.4 Route Registration Pattern
- All routes are `Express Router()` in `apps/api/src/routes/`
- Mounted in `server.ts`:
  ```ts
  app.use('/knowledge-assistant', requireAuth, knowledgeAssistantRouter)
  ```

### 4.5 Knex Migration Pattern
- Location: `packages/db/migrations/`
- Timestamped filenames
- Export `up(knex)` and `down(knex)`

### 4.6 Docker Compose Services (Existing — before KA)
| Service | Image | Port |
|---------|-------|------|
| db | postgres:16 | 5432 |
| api | Built from Dockerfile | 4000 |
| web | Built from Dockerfile | 3000 |

### 4.7 Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | api, rag | Postgres connection string |
| `PASSWORD_SALT` | api | SHA-256 password hashing salt |
| `CORS_ORIGIN` | api | Allowed origin (`http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | web | Base URL for API calls |
| `GOOGLE_API_KEY` | rag (NEW) | Gemini embeddings + LLM |
| `QDRANT_URL` | rag (NEW) | `http://qdrant:6333` |
| `RAG_SERVICE_URL` | api (NEW) | Internal URL to FastAPI service |

---

## 5. Database Schema — New Tables (PostgreSQL)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `conversations` | `id` uuid PK, `user_id` → users.id, `name` text, `created_at` | Per-user conversation list |
| `messages` | `id` uuid PK, `conversation_id` → conversations.id CASCADE, `role` text (user\|assistant), `content` text, `created_at` | Chat message history |
| `message_sources` | `id` uuid PK, `message_id` → messages.id CASCADE, `qdrant_chunk_id` text, `metadata` jsonb | Links messages to source chunks |
| `ingestion_jobs` | `id` uuid PK, `filename` text, `status` text default 'pending', `error_details` jsonb, `inserted` int default 0, `updated` int default 0, `skipped` int default 0, `created_at`, `updated_at` | Job lifecycle tracking |

**Job status lifecycle:** `pending` → `running` → `succeeded` / `failed`

---

## 6. Qdrant Schema

**Collection name:** `document_chunks`

| Field | Value |
|-------|-------|
| Vector | 768-dim (gemini-embedding-001) |
| Search | Hybrid (dense + sparse) — Qdrant handles fusion natively |

**Payload fields per chunk:**
```json
{
  "content": "string",
  "content_hash": "sha256 hex",
  "source_id": "string",
  "filename": "string",
  "module": "string",
  "chunk_type": "parent | child",
  "parent_id": "uuid | null",
  "ingested_at": "ISO timestamp",
  "job_id": "uuid"
}
```

**Parent-Child chunking logic:**
- Parent chunk = full document item content (used as LLM context window)
- Child chunk = smaller semantic sub-chunk (used as retrieval unit)
- Retrieval hits **child chunks** → fetch their parent for richer context

**Deduplication logic:**
- Same `content_hash` → **skip**
- Same `source_id` but different `content_hash` → **update**
- New → **insert**

---

## 7. FastAPI RAG Service — Performance Approach

- `async def` on all endpoints
- `asyncio.gather()` for parallel dense + sparse retrieval
- Async Qdrant client (`qdrant-client` async mode)
- Batch embedding to Gemini (not one-by-one)
- `StreamingResponse` for LLM output (`text/event-stream`)
- Qdrant + Gemini clients initialized **once** at startup via `lifespan` context manager

---

## 8. Full RAG Pipeline

```
User query
  → Embed query (gemini-embedding-001)
  → Hybrid search Qdrant (dense + sparse via asyncio.gather())
  → Retrieve top-5 child chunks
  → Fetch parent chunks (richer context for LLM)
  → Build prompt with retrieved context
  → Stream gemini-2.5-flash response via SSE
  → After stream ends: save citations to message_sources
```

---

## 9. Feature Requirements & 22 Scenarios

### Feature 1 — Navigation (4 scenarios)
- Sidebar shows "Knowledge Assistant" link when authenticated
- Unauthenticated → redirect (existing RequireAuth behavior)
- Page has two tabs: **Chatbot** and **Knowledge Uploader**
- Knowledge Uploader tab admin-only → 403 for non-admin

### Feature 2 — Knowledge Uploader / Ingestion (9 scenarios)
- Accept JSONL/NDJSON format; reject other formats with a clear message
- Reject empty files or files over size limit with a clear message
- Each upload creates an ingestion job with visible status: `pending → running → succeeded / failed`
- On failure: show human-readable error reason
- Malformed JSONL lines: skip + record line number & reason in `error_details`
- Each chunk stores metadata: filename, module/type, source_id, ingested_at
- Deduplication via SHA-256 hash per chunk (logic above)
- Report counts: inserted / updated / skipped
- New content queryable only after ingestion status = `succeeded`

### Feature 3 — Chatbot / RAG (3 scenarios)
- RAG pipeline: embed → hybrid retrieve → LLM → stream via SSE
- Answers must be grounded in ingested content — **citations required** per message
- If KB empty or no relevant content: clear message + next step (not a hallucinated answer)
- On LLM/vector DB error: show clear error — **never store partial answer as success**

### Feature 4 — Conversation Management (6 scenarios)
- Per-user conversation list visible on return
- Can open and continue any previous conversation
- Can delete a conversation (removed from list)
- Can rename a conversation (saved and shown)
- Auto-generate conversation name from first message (Gemini call)
- Each assistant message stores source references for traceability

---

## 10. Node.js Backend Routes (apps/api/src/routes/knowledgeAssistant.ts)

Mount in `server.ts`: `app.use('/knowledge-assistant', requireAuth, knowledgeAssistantRouter)`

| Method | Path | Auth | Function |
|--------|------|------|----------|
| POST | `/upload` | requireRole('admin') | Multipart JSONL upload, create job, process async |
| GET | `/jobs/:id` | requireAuth | Return job row |
| POST | `/conversations` | requireAuth | Create new conversation |
| GET | `/conversations` | requireAuth | List user conversations ordered by created_at desc |
| DELETE | `/conversations/:id` | requireAuth | Delete if owned by req.user |
| PATCH | `/conversations/:id` | requireAuth | Rename conversation |
| GET | `/conversations/:id/messages` | requireAuth | Return messages + message_sources |
| POST | `/conversations/:id/chat` | requireAuth | Save user message, proxy SSE to RAG, save assistant message + sources |

**Upload async flow (after returning job_id immediately):**
1. Validate file (JSONL/NDJSON only, max 10MB, not empty)
2. Create `ingestion_jobs` row with `status=pending`, return `{ job_id }` immediately
3. Async: parse JSONL lines (skip + record malformed lines with line number in `error_details`)
4. Update job `status=running`
5. POST parsed lines to `RAG_SERVICE_URL/ingest`
6. Update job with `inserted/updated/skipped` counts and `status=succeeded` or `failed`

**Chat flow:**
- Save user message to DB
- Call `RAG_SERVICE_URL/chat` with streaming
- Pipe SSE stream to client (`Content-Type: text/event-stream`)
- After stream ends: save assistant message + source chunk IDs to `message_sources`
- If first message in conversation: call Gemini to auto-generate conversation name

---

## 11. Milestone Prompts & Status

> **How to use:** For each milestone, copy the prompt below into Antigravity exactly as written.
> After each milestone is verified and working, manually update its status from `⏳ Pending` to `✅ DONE`.

---

### Milestone 1 — Read & Understand Codebase
**Status: ✅ DONE** — Output captured in Section 4 of this file.

---

### Milestone 2 — Sidebar Entry + Auth Guard + Tab UI
**Status: ✅ DONE**
**Thinking mode: ON**

**Antigravity Prompt:**
```
Read CONTEXT.md first.

Based on the codebase analysis in CONTEXT.md, do the following:

1. Add a "Knowledge Assistant" entry to the sidebar in apps/web/components/Sidebar.js by appending to the existing navGroups array: { href: "/dashboard/knowledge-assistant", label: "Knowledge Assistant" }

2. Create the route apps/web/app/(dashboard)/dashboard/knowledge-assistant/page.tsx with two tabs: "Chatbot" and "Knowledge Uploader". The page must be wrapped by the existing RequireAuth component. The Knowledge Uploader tab must only render its content if the current user role is "admin" — for non-admin users show a 403/Forbidden message consistent with the app style.

Do not create any backend routes yet. Match all existing naming conventions, component patterns, and styling.

After completing, update communication_document.md with a section for Milestone 2 that documents: every file changed or created, why each decision was made, and one alternative approach comparison if relevant.
```

---

### Milestone 3 — DB Migrations + Docker Compose Update
**Status: ⏳ Pending**
**Thinking mode: ON**

**Antigravity Prompt:**
```
Read CONTEXT.md first.

Do the following:

1. Create a single Knex migration file in packages/db/migrations/ (timestamped, following existing conventions) for these new PostgreSQL tables:
   - conversations: id uuid pk, user_id references users.id, name text, created_at
   - messages: id uuid pk, conversation_id references conversations.id on delete cascade, role text (user|assistant), content text, created_at
   - message_sources: id uuid pk, message_id references messages.id on delete cascade, qdrant_chunk_id text, metadata jsonb
   - ingestion_jobs: id uuid pk, filename text, status text default 'pending', error_details jsonb, inserted int default 0, updated int default 0, skipped int default 0, created_at, updated_at

2. Update docker-compose.yml to add two new services:
   - qdrant: image qdrant/qdrant:latest, port 6333:6333, named volume for persistence
   - rag: built from apps/rag/Dockerfile, port 8000:8000, depends_on qdrant and db, env vars: GOOGLE_API_KEY, QDRANT_URL=http://qdrant:6333, DATABASE_URL
   - Also add RAG_SERVICE_URL=http://rag:8000 to the existing api service env

3. Additional requirements for docker-compose.yml:
   - rag service must depend_on both qdrant AND db (condition: service_healthy)
   - rag service must have a healthcheck (GET /health endpoint)
   - api service must depend_on rag (condition: service_healthy)
   - Verify that existing db:seed is idempotent before running — if not, wrap with onConflict().ignore() or equivalent

4. Also update .env.example to include the three new variables: GOOGLE_API_KEY, QDRANT_URL, RAG_SERVICE_URL.

After completing, update communication_document.md with a section for Milestone 3 that documents: every file changed or created, why each decision was made, and one alternative approach comparison if relevant.
```

---

### Milestone 4 — Python FastAPI RAG Service
**Status: ⏳ Pending**
**Thinking mode: ON**

**Antigravity Prompt:**
```
Read CONTEXT.md first.

Create a new Python FastAPI service at apps/rag/ with this structure:
- apps/rag/main.py
- apps/rag/requirements.txt
- apps/rag/Dockerfile

Rules:
- Python 3.11+
- All endpoints must use async def
- Use google-generativeai SDK for Gemini (embeddings: gemini-embedding-001 at 768 dimensions, LLM: gemini-2.5-flash)
- Use qdrant-client in async mode
- Initialize Qdrant and Gemini clients once at startup via lifespan context manager
- Also implement GET /health endpoint that returns { status: "ok" } — required by docker-compose healthcheck.

Implement two endpoints:

1. POST /ingest
   - Accepts: { job_id, filename, lines: [{content, source_id, module, ...}] }
   - Performs parent-child chunking: parent = full item content, child = semantic sub-chunks
   - Batch embeds all chunks in a single Gemini API call
   - Upserts into Qdrant collection 'document_chunks' using content_hash (SHA-256) for deduplication
   - Payload per chunk: content, content_hash, source_id, filename, module, chunk_type (parent|child), parent_id, ingested_at, job_id
   - Returns: { inserted, updated, skipped }
   - On startup or before first upsert, ensure Qdrant collection 'document_chunks' exists — create it if not (vectors size=768, distance=Cosine, with sparse vectors enabled for hybrid search).

2. POST /chat
   - Accepts: { query, conversation_history }
   - Embeds query
   - Runs hybrid search (dense + sparse) in parallel using asyncio.gather()
   - Retrieves top-5 child chunks then fetches their parent chunks for context
   - Builds prompt and streams gemini-2.5-flash response using StreamingResponse (text/event-stream)
   - Returns citations as a final SSE event

3. The Dockerfile for rag must: use python:3.11-slim, COPY apps/rag/requirements.txt, RUN pip install, COPY apps/rag/ ., expose port 8000, CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

After completing, update communication_document.md with a section for Milestone 4 that documents: every file changed or created, why each decision was made, and one alternative approach comparison if relevant.
```

---

### Milestone 5 — Node.js Backend Routes
**Status: ⏳ Pending**
**Thinking mode: ON**

**Antigravity Prompt:**
```
Read CONTEXT.md first.

Use multer for multipart file upload handling — check if it's already in apps/api/package.json before installing.
Create apps/api/src/routes/knowledgeAssistant.ts as an Express Router and mount it in server.ts at /knowledge-assistant with requireAuth middleware.

Implement these routes:

1. POST /upload — requireRole('admin'), multipart file upload
   - Validate: JSONL/NDJSON only, max 10MB, reject empty files
   - Create ingestion_jobs row with status=pending
   - Return { job_id } immediately
   - Then async: parse JSONL lines (skip + record malformed lines with line number + reason in error_details), update status=running, POST parsed lines to RAG_SERVICE_URL/ingest, update job with inserted/updated/skipped and status=succeeded or failed

2. GET /jobs/:id — return job row

3. POST /conversations — create conversation for req.user.id, return { conversation_id }

4. GET /conversations — list user's conversations ordered by created_at desc

5. DELETE /conversations/:id — delete if owned by req.user

6. PATCH /conversations/:id — rename conversation

7. GET /conversations/:id/messages — return messages with message_sources

8. POST /conversations/:id/chat
   - Save user message to DB
   - Call RAG_SERVICE_URL/chat with streaming
   - Pipe SSE stream to client (Content-Type: text/event-stream)
   - On stream end: save assistant message + source chunk IDs to message_sources
   - If first message in conversation: call Gemini to auto-generate a short conversation name and save it

After completing, update communication_document.md with a section for Milestone 5 that documents: every file changed or created, why each decision was made, and one alternative approach comparison if relevant.
```

---

### Milestone 6 — Chat UI + Streaming Frontend
**Status: ⏳ Pending**
**Thinking mode: OFF**

**Antigravity Prompt:**
```
Read CONTEXT.md first.

Build the Chatbot tab UI in the Knowledge Assistant page. Requirements:

1. Left panel: conversation list with name and date; buttons to create new conversation, delete, and rename (inline edit on double-click)
2. Right panel: messages in chronological order, user messages right-aligned, assistant left-aligned, ChatGPT style
3. Input at bottom: text input + send button, disabled while streaming
4. Streaming: use native fetch with ReadableStream to consume SSE from POST /knowledge-assistant/conversations/:id/chat, append text chunks to assistant message bubble in real time
5. Citations: after each assistant message, show a collapsible source list (filename, module, source_id)
6. Error state: inline error message if API fails

Use apiFetch from lib/apiClient.ts for all non-streaming calls. Match existing app component and styling patterns.

After completing, update communication_document.md with a section for Milestone 6 that documents: every file changed or created, why each decision was made, and one alternative approach comparison if relevant.
```

---

### Milestone 7 — Knowledge Uploader UI
**Status: ⏳ Pending**
**Thinking mode: OFF**

**Antigravity Prompt:**
```
Read CONTEXT.md first.

Build the Knowledge Uploader tab UI (admin-only, already guarded). Requirements:

1. File drop zone or picker: accept .jsonl and .ndjson only, validate client-side for wrong type, empty file, or over 10MB, show clear error messages
2. Upload button: POST to /knowledge-assistant/upload, show loading state during upload
3. Job status panel: display returned job_id, poll GET /knowledge-assistant/jobs/:id every 3 seconds, show color-coded status badge (pending=grey, running=blue, succeeded=green, failed=red)
4. On failure: display error_details skipped lines (line number + reason)
5. On success: display inserted/updated/skipped counts

Match existing app component and styling patterns.

After completing, update communication_document.md with a section for Milestone 7 that documents: every file changed or created, why each decision was made, and one alternative approach comparison if relevant.
```

---

### Milestone 8 — Cold Start Test & 22 Scenario Verification
**Status: ⏳ Pending**
**Thinking mode: ON**

**Antigravity Prompt:**
```
Read CONTEXT.md first.

Verify full cold start and all 22 scenarios:

1. Run: docker compose down -v (wipe all volumes)
2. Run: docker compose up — confirm all 5 services start: db, qdrant, rag, api, web
3. Confirm PostgreSQL migrations ran (4 new tables exist)
4. Confirm Qdrant collection 'document_chunks' is created on first ingest
5. Confirm GOOGLE_API_KEY is available in rag container

Then walk through all 22 scenarios:
- 4 navigation scenarios (sidebar, auth redirect, two tabs, admin-only uploader)
- 9 uploader/ingestion scenarios (format validation, size limit, job lifecycle, malformed lines, deduplication, counts)
- 3 chatbot/RAG scenarios (streaming + citations, empty KB response, error handling)
- 6 conversation management scenarios (list, open, delete, rename, auto-name, sources stored)

Report pass/fail for each. Fix any failures found.

After completing, update communication_document.md with a final section for Milestone 8 summarizing cold start result and all 22 scenario outcomes.
```

---

## 12. communication_document.md — Instructions for Antigravity

> This section tells Antigravity exactly how to write and maintain `communication_document.md`.

**File location:** `/communication_document.md` (repo root)

**When to update:** At the end of every milestone, before finishing the session.

**Structure per milestone entry:**

```markdown
## Milestone [N] — [Name]

### What Changed
List every file that was created, modified, or deleted. For each file, one sentence on what changed.

### Why
For each significant decision made in this milestone, explain the reasoning clearly.
Keep it plain — assume the reader understands the domain but wants to learn the "why".

### Alternative Approach (only if the topic is non-trivial)
Describe one popular alternative approach and why we did NOT choose it for this project.
Keep it to 3–5 sentences max.
```

**Rules for Antigravity when writing this file:**
- Be specific — file paths, function names, table names, not vague descriptions
- "Why" must explain the actual reason, not just restate what was done
- Only include the Alternative Approach section if the decision involved a real trade-off worth understanding
- Never delete previous milestone entries — always append
- Write in plain English, no jargon without explanation

---

## 13. High-Risk Checklist — Verify Before Submit

| Risk Item | Priority |
|-----------|----------|
| `docker compose up` cold start — all 5 services healthy | CRITICAL |
| `GOOGLE_API_KEY` available in rag container | CRITICAL |
| Qdrant collection created on first ingest | HIGH |
| Deduplication works on re-upload of same file | HIGH |
| Streaming works end-to-end in browser | HIGH |
| Citations saved to `message_sources` after stream ends | HIGH |
| Job lifecycle visible in UI (pending → running → succeeded) | HIGH |
| Every Qdrant chunk has full metadata in payload | HIGH |
| Auth + role patterns match existing (non-admin → 403 on uploader) | MEDIUM |
| Empty KB → clear response (no hallucination) | MEDIUM |
| Malformed JSONL → job reports line number + reason | MEDIUM |
| Vector dimension = 768 (matches gemini-embedding-001 output) | MEDIUM |
