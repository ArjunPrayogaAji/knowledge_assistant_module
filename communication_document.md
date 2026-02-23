# Communication Document
## Knowledge Assistant — Adamant SaaS

> This file documents every technical decision made per milestone: what changed, why, and how it compares to alternatives.
> **Never delete previous entries. Always append.**

---

## Milestone 1 — Read & Understand Codebase

### What Changed
No files were created or modified. This milestone was read-only analysis of the existing codebase.

### Why
Before writing any code, it is critical to understand the existing patterns — how routes are registered, how auth works, how migrations are structured, and what the folder layout looks like. Skipping this step leads to code that doesn't integrate cleanly and breaks existing conventions. The output of this milestone is captured in CONTEXT.md Section 4 and serves as the foundation for all subsequent milestones.

Key findings that directly affect later milestones:

- `apps/web/components/Sidebar.js` uses a hardcoded `navGroups` array — new entries must be appended there, not in a config file or database.
- Auth is session-based cookie (`ac_session`), not JWT. The `requireAuth` and `requireRole('admin')` middlewares already exist and must be reused as-is.
- All Express routes follow a consistent pattern: `Router()` in `apps/api/src/routes/`, mounted in `server.ts`.
- Knex migrations live in `packages/db/migrations/` with timestamped filenames. The `api` container runs `db:migrate` automatically on startup via the docker-compose `command`.
- The monorepo uses npm workspaces — dependencies must be installed at the right workspace level.

### Alternative Approach
Not applicable — this was a read-only analysis milestone with no implementation decisions.

---

## Milestone 2 — Sidebar Entry + Auth Guard + Tab UI

### What Changed

- **`apps/web/components/layout/nav.ts`** — Added `MessageCircle` to the Lucide icon imports. Added a new `"Assistant"` nav group immediately before the `"Admin"` group, containing one item: `{ label: "Knowledge Assistant", href: "/dashboard/knowledge-assistant", icon: MessageCircle }`.

- **`apps/web/app/(dashboard)/dashboard/knowledge-assistant/page.tsx`** — Created new page with two tabs ("Chatbot" and "Knowledge Uploader"). The page is a `"use client"` component that fetches `GET /auth/me` on mount to determine the current user's role. The Uploader tab renders a styled 403 Forbidden panel for non-admin users. Both tab panels render placeholder content for features coming in Milestones 5–7.

### Why

**Why update `nav.ts` instead of `Sidebar.js`?**
The root-level `apps/web/components/Sidebar.js` is the older, simpler sidebar stub. The actual sidebar rendered by the dashboard layout (`apps/web/app/(dashboard)/dashboard/layout.tsx`) imports `Sidebar` from `components/layout/Sidebar.tsx`, which reads its data from `components/layout/nav.ts`. Updating `nav.ts` is the correct integration point — it keeps all nav data in the typed, icon-aware config file that the real sidebar consumes.

**Why a new `"Assistant"` group rather than appending to `"Admin"`?**
The Knowledge Assistant is not an admin-only feature — the Chatbot tab is available to all authenticated users. Placing it in the Admin group would imply the wrong access level. A dedicated group makes future additions (e.g., more AI-powered tools) easy to slot in.

**Why fetch `/auth/me` in the page itself for the role check?**
The existing `RequireAuth` component (used in the dashboard layout) only verifies that a session exists — it redirects on failure but does not expose the user object to child components. Rather than restructuring `RequireAuth` or adding a React context, fetching `/auth/me` directly in this page follows the same pattern already used in `Topbar.tsx` and keeps the role-check logic self-contained. The extra network call is negligible since `/auth/me` is a fast DB lookup.

**Why show a 403 panel instead of hiding the tab?**
Hiding the tab entirely for non-admins would mean the feature is invisible, which can confuse admins who expect to see it. Showing the tab but blocking access with a clear 403 message is consistent with the existing pattern: the Settings page's feature flag toggle is visible to all but API-enforced to admins, with a note in the UI. The panel matches the app's slate/white card aesthetic.

### Alternative Approach

An alternative would be to fetch the user's role at the dashboard layout level, store it in React context, and consume it in any page via `useContext`. This avoids the extra `/auth/me` call in the page. We did not choose this approach because it requires adding a context provider to the shared `DashboardLayout` — a more invasive change that affects all existing pages — whereas the current approach is isolated to only the pages that need role awareness.

---

## Milestone 3 — DB Migrations + Docker Compose Update

### What Changed

- **`packages/db/migrations/20260222000000_knowledge_assistant.ts`** *(new)* — Knex migration creating four new tables: `conversations`, `messages`, `message_sources`, and `ingestion_jobs`. Each table has UUIDs as primary keys (via `gen_random_uuid()`), appropriate foreign keys with cascade deletes, and indexes on the most-queried columns.

- **`docker-compose.yml`** *(modified)* — Added two new services:
  - `qdrant`: `qdrant/qdrant:latest` image, port `6333:6333`, named volume `ac_qdrant_data`, healthcheck using `wget /readyz`.
  - `rag`: built from `apps/rag/Dockerfile`, port `8000:8000`, depends on both `db` and `qdrant` (condition: `service_healthy`), healthcheck hitting `GET /health`. Added `RAG_SERVICE_URL=http://rag:8000` to the existing `api` service env. Updated `api`'s `depends_on` to include `rag` (condition: `service_healthy`).

- **`.env.example`** *(modified)* — Added three new variables: `GOOGLE_API_KEY` (for Gemini embeddings and LLM in the rag service), `QDRANT_URL` (default `http://localhost:6333` for local-without-Docker dev), and `RAG_SERVICE_URL` (default `http://localhost:8000`).

### Why

**Why are the new tables in a second migration file (not the init)?**
The `20260128120000_init.ts` migration is the baseline for the original codebase. Patching it would corrupt environments that already ran the original migration (e.g., team members with existing local databases). A new timestamped migration file is the correct Knex convention: it is additive and reversible, and `db:migrate` will skip it if it has already run.

**Why is `error_details` column nullable in `ingestion_jobs`?**
It is only populated on failure (malformed line details) or when there are skipped records. Defaulting to `null` instead of `{}` makes it easy to check for the presence of errors with a simple `IS NOT NULL` condition, avoiding an extra parse step.

**Why does `api` depend on `rag` (condition: `service_healthy`) in docker-compose?**
The api service proxies chat streaming and ingest calls directly to the rag service. If api starts before rag is ready, the first upload or chat request after a cold start would fail silently. Requiring the rag healthcheck to pass before api starts ensures cold start works end-to-end without needing manual retries.

**Why use `wget` for healthchecks instead of `curl`?**
`qdrant/qdrant:latest` and `python:3.11-slim` base images typically include `wget` but not `curl`. Using `wget -qO-` works across both without adding dependencies.

**Why add `QDRANT_URL` and `RAG_SERVICE_URL` to `.env.example` with localhost defaults?**
Inside Docker Compose the rag service uses container-internal hostnames (`http://qdrant:6333`, `http://rag:8000`). The `.env.example` localhost defaults let developers run the rag service and qdrant directly on their machine without Docker for faster iteration during Python development.

**Seed idempotency check:** The existing `packages/db/seeds/01_seed_core.ts` performs a hard `knex("table").del()` wipe before re-inserting. This is intentional for development scaffolding. The four new tables (`conversations`, `messages`, `message_sources`, `ingestion_jobs`) have no seed data and are not touched by the seed files, so no changes to the seed were necessary.

### Alternative Approach

Instead of a `depends_on` chain (`api` → `rag` → `db`, `qdrant`), an alternative is to make each service retry independently — add exponential backoff inside the api and rag startup code, so services start in any order and wait for their dependencies themselves. This is more resilient in production Kubernetes-style deployments. We chose the `depends_on` approach because Docker Compose's built-in healthcheck dependencies are zero-code, straightforward to reason about, and sufficient for the dev/test environment this project targets.

---

## Milestone 4 — Python FastAPI RAG Service

### What Changed

- **`apps/rag/requirements.txt`** *(new)* — Python dependencies: `fastapi`, `uvicorn[standard]`, `qdrant-client>=1.9.0`, `google-genai>=0.8.0`, `pydantic>=2.0.0`, `python-dotenv`.

- **`apps/rag/Dockerfile`** *(new)* — Uses `python:3.11-slim` as base. Build context is the repo root (matches docker-compose), so `COPY apps/rag/requirements.txt .` and `COPY apps/rag/ .` work correctly. CMD runs `uvicorn main:app`.

- **`apps/rag/main.py`** *(new)* — Full FastAPI RAG service with:
  - **`lifespan` context manager**: initialises `genai` (Gemini), `AsyncQdrantClient`, and calls `ensure_collection()` once at startup.
  - **`ensure_collection()`**: creates `document_chunks` collection with `{"dense": VectorParams(size=3072, distance=Cosine)}` and `{"sparse": SparseVectorParams(...)}` if it doesn't already exist.
  - **`GET /health`**: returns `{"status": "ok"}` — satisfies docker-compose healthcheck.
  - **`POST /ingest`**: for each input line, creates 1 parent chunk (full content) + N child chunks (paragraph-/word-based splitting). Batch-embeds all chunks needing upsert via `asyncio.to_thread(genai.embed_content, ...)`. Deduplicates via `qdrant.retrieve(ids=[...])` in a single batch call — compares `content_hash` per point to classify each chunk as `inserted / updated / skipped`. Upserts in batches of 100 with both dense and sparse vectors.
  - **`POST /chat`**: embeds query, runs dense and sparse searches in parallel via `asyncio.gather()`, merges top-5 child hits, fetches their parent chunks for richer LLM context, builds a grounded prompt, streams `gemini-2.5-flash` response as SSE (`data: {"type":"text","content":"..."}`), then yields a final `data: {"type":"citations",...}` event after the stream ends.

### Why

**Why use `asyncio.to_thread` for Gemini embedding instead of a native async call?**
The `google-genai` SDK's `embed_content` function is synchronous. Calling it directly from an `async def` handler would block the entire event loop. Wrapping it with `asyncio.to_thread` runs it in a thread pool, keeping the FastAPI server non-blocking and able to serve concurrent requests while embedding is in progress.

**Why derive point IDs deterministically from `source_id` + position (`uuid.uuid5`)?**
Using `uuid.uuid5(NAMESPACE_DNS, f"{source_id}:child:{idx}")` gives each chunk a stable, reproducible ID. This means Qdrant's native `upsert` handles insert vs. update transparently — we just check whether the existing point's `content_hash` matches the incoming one. No separate "find existing point by source_id" query is needed, and the deduplication batch retrieve is a single call to `qdrant.retrieve(ids=[all_point_ids])`.

**Why token-frequency sparse vectors instead of a full SPLADE/BM25 model?**
Adding `fastembed` or a model-based sparse encoder would require downloading a model at container startup (several hundred MB) and adds GPU/CPU overhead. A deterministic MD5-hash token-frequency vector gives Qdrant enough sparse signal for keyword recall in a hybrid-search context, with zero additional dependencies and zero startup time. This is appropriate for the scope of this assignment.

**Why does `/chat` fetch parent chunks after retrieving child hits?**
Child chunks are small retrieval units optimised for semantic similarity (they give precise matches). Parent chunks are the full document content from which the child was derived — giving the LLM the full context window rather than a truncated excerpt. Retrieval uses children; generation uses parents. This is the standard "small-to-big retrieval" pattern.

**Why yield citations as the final SSE event rather than a separate HTTP response?**
Citations need to be delivered after the full stream completes, because we only know which source chunks contributed to the response after the retrieval step. Embedding them as a terminal SSE event on the same stream keeps the API surface simple (one request, one streaming response) and avoids a second round-trip.

### Alternative Approach

An alternative to building custom sparse vectors is to use **Qdrant's built-in sparse encoder via the `fastembed` integration** (`qdrant_client.async_qdrant_fastembed`). This provides SPLADE sparse embeddings that are semantically aware (not just term-frequency). We did not use this approach because `fastembed` adds a large model download at container startup, which conflicts with fast cold-start requirements and adds unnecessary complexity for an assignment context where approximate sparse retrieval is sufficient.

---

## Milestone 5 — Node.js Backend Routes

### What Changed

- **`apps/api/src/routes/knowledgeAssistant.ts`** *(new)* — Express `Router` implementing all eight Knowledge Assistant routes. The file is 481 lines and self-contained: multer configuration, JSONL parsing helper, Gemini conversation-naming helper, and all eight route handlers are defined here.

- **`apps/api/src/server.ts`** *(modified)* — Added one import (`knowledgeAssistantRouter`) and one mount line: `app.use('/knowledge-assistant', requireAuth, knowledgeAssistantRouter)`. No other changes were needed.

- **`apps/api/package.json`** *(verified, no change needed)* — `multer ^2.0.2` and `@types/multer ^2.0.0` were already present as production/dev dependencies from a prior setup step. No install was required.

### Why

**Why does `POST /upload` return `{ job_id }` immediately (HTTP 202) and continue processing asynchronously?**
The JSONL parsing step, the call to `RAG_SERVICE_URL/ingest`, and the subsequent DB update can take several seconds for large files. Holding the HTTP connection open for that duration would cause client-side timeouts and give no feedback about intermediate progress. Returning the job ID immediately lets the frontend poll `GET /jobs/:id` to watch `status` progress from `pending → running → succeeded/failed`, which is exactly the UX spec in CONTEXT.md Section 9.

**Why use `setImmediate` for the async fire-and-forget instead of detaching a child process or worker thread?**
`setImmediate` defers execution to the next iteration of the Node.js event loop — after the HTTP response is flushed to the client. Since the async work (fetch to RAG service, DB updates) is I/O‐bound and not CPU-bound, it will not block the event loop or starve other requests. A worker thread would add unnecessary complexity without a throughput benefit for this workload.

**Why does `parseJsonlBuffer` skip blank lines silently but record lines that fail JSON.parse or are missing required fields as malformed?**
Blank lines are a normal artefact of how many editors save JSONL files (trailing newline, blank separators). They carry no data and are unambiguously empty, so skipping them makes the ingestion tolerant of real-world files. A line that has content but is not valid JSON, or is missing `content`/`source_id`/`module`, is a genuine data quality issue that an admin needs to be aware of — so it is recorded with its 1-indexed line number and a human-readable reason in `error_details`.

**Why does `POST /conversations/:id/chat` accumulate SSE bytes from the RAG service and pipe them to the client simultaneously rather than buffering the full response first?**
Buffering the full LLM response before forwarding would eliminate the streaming user experience — the user would see nothing until the entire answer was ready, which can be 5–15 seconds. By reading from `ragResp.body.getReader()` and writing each chunk to `res` immediately (`res.write(chunk)`), the browser receives tokens as the LLM generates them. The buffer is maintained in parallel only to parse `type: text` and `type: citations` events so the assistant message and `message_sources` rows can be saved to the DB after the stream ends.

**Why call Gemini directly via the REST API (`generativelanguage.googleapis.com`) for conversation naming instead of the `google-genai` SDK?**
The `google-genai` SDK is a Python library used in the RAG service. The Node.js API service does not have the SDK installed — adding it for a single, optional, non-critical naming call would bloat the dependency tree. The REST API call is a straightforward `fetch` with well-documented JSON bodies, and it fails gracefully (falls back to the first 60 characters of the query) if the key is missing or the call errors.

**Why verify conversation ownership (`WHERE id = ? AND user_id = ?`) on every conversation endpoint instead of a shared middleware?**
A dedicated ownership-check middleware would be clean but would require injecting the `user_id` into every query via a shared context. The current approach co-locates the ownership assertion with the DB query in each handler — if the row doesn't exist or belongs to a different user, the same `NOT_FOUND` 404 is returned either way, which intentionally avoids leaking whether a conversation exists for another user.

### Alternative Approach

An alternative to the fire-and-forget `setImmediate` pattern would be to use a persistent job queue (e.g., BullMQ backed by Redis) — the upload handler enqueues a job and a separate worker process handles ingestion. This architecture is more resilient (survives a server crash mid-job, supports retries, priority queuing, and horizontal scaling) and is the standard approach in production services. We did not choose it here because it requires adding a Redis container and a worker process to the Docker Compose setup, which is out of scope for this assignment and would add significant complexity without changing the observable behaviour for the test scenarios.

---

## Milestone 6 — Chat UI + Streaming Frontend

### What Changed

- **`apps/web/app/(dashboard)/dashboard/knowledge-assistant/page.tsx`** *(modified)* — Replaced the `ChatbotPanel` stub function with a full two-panel chat UI (~420 lines added). Added four new types (`Conversation`, `Source`, `Message`, `Citation`) and two new sub-components (`CitationList`, `MessageBubble`) defined inline in the same file. The `ForbiddenPanel` and `UploaderPanel` stubs, tab bar, and main page structure were preserved unchanged.

### Why

**Why keep everything in one file instead of separate component files?**
The existing codebase pattern — `dashboard/page.tsx` is ~200 lines, self-contained with helper components defined locally — shows that per-page complexity lives in the page file itself. The only files in `components/` are domain-agnostic primitives (`Button`, `Card`, `Table`, `Page`). `ChatbotPanel` is very much domain-specific to this page and has no reuse candidates elsewhere, so adding it to `components/` would break the pattern. The `CitationList` and `MessageBubble` sub-components are defined at the top of the file, still easily extractable later if the pattern evolves.

**Why use native `fetch` for the chat endpoint instead of `apiFetch`?**
`apiFetch` calls `res.text()` on the response body before returning, which fully buffers the response. For a streaming `text/event-stream` response, buffering defeats the entire purpose. Native `fetch` gives access to `resp.body.getReader()` for chunk-by-chunk reading. All non-streaming calls (list conversations, create, delete, rename, load messages) still use `apiFetch` as instructed.

**Why use `setImmediate`-style optimistic updates for user messages?**
Adding the user's message to `messages` state immediately (before the network call returns) prevents the UI from feeling laggy — the user sees their message appear the moment they hit Send. A placeholder object with a `tmp-` ID is inserted, and after the stream completes the authoritative message list is not re-fetched (the assistant message is appended locally too), keeping a single source of truth in component state per session.

**Why refresh the conversation list after the stream ends?**
The Node.js backend auto-generates a conversation name via Gemini on the first message saved. Since this fires asynchronously after the stream completes, the name change is not returned with the stream. Re-fetching `GET /conversations` after the stream ends ensures the left panel reflects the server-assigned name without requiring a manual refresh.

**Why the `streamingCitations` state pattern for the in-flight bubble?**
The `type: citations` SSE event arrives at the very end of the stream but before the stream closes. Storing it in a separate `streamingCitations` state (not in `messages`) lets the streaming bubble show a live preview of citations even while the text is still arriving, then the fully assembled `Message` object (with `sources`) is committed to `messages` state after the stream ends.

**Why `h-[calc(100vh-8rem)]` for the chat panel height?**
The dashboard's `<Page>` component wraps content in a `p-4` container below a `Topbar`. A fixed viewport-relative height with an 8rem offset correctly sizes the chat panel to fill the available screen without the page itself scrolling, giving scroll to the message list and making the input bar always visible at the bottom.

### Alternative Approach

An alternative streaming approach is to use the browser's native `EventSource` API instead of `fetch` + `ReadableStream`. `EventSource` handles reconnection, event-type routing, and `data:` parsing automatically. We did not use it because `EventSource` only supports `GET` requests — the chat endpoint is `POST` (it sends the query in the request body). The `fetch` + `ReadableStream` approach is the standard workaround for POST-based SSE.

---

## Milestone 7 — Knowledge Uploader UI

### What Changed

- **`apps/web/app/(dashboard)/dashboard/knowledge-assistant/page.tsx`** *(modified)* — Replaced the `UploaderPanel` stub with a fully functional uploader UI. New additions in the same file:
  - **`IngestionJob` type** — covers `id`, `status`, `filename`, `inserted`, `updated`, `skipped`, and `error_details` (with optional `malformed_lines[]`, `rag_error`, and `message`)
  - **`validateFile()` helper** — checks extension (`.jsonl`/`.ndjson`), empty file, and >10 MB, returning a string error or `null`
  - **`StatusBadge` component** — renders a color-coded pill: pending=grey, running=blue with spinner, succeeded=green, failed=red
  - **`UploaderPanel` component** — full UI with drag-and-drop drop zone, file picker, client-side validation errors, multipart upload, and a polling job-status card
  - **Polling** — a `useEffect` watching `job.id` and `job.status` starts a `setInterval` every 3 s that calls `GET /knowledge-assistant/jobs/:id` via `apiFetch`; the interval is cleared when status reaches `succeeded` or `failed`, and on component unmount via the cleanup function
  - **5 new lucide icons** added to the existing import: `UploadCloud`, `FileText`, `XCircle`, `CheckCircle2`, `AlertCircle`

### Why

**Why use native `fetch` for the upload instead of `apiFetch`?**
The upload endpoint requires a `multipart/form-data` body (a `FormData` object). `apiFetch` sets `Content-Type: application/json` explicitly, which would corrupt the multipart boundary. Using native `fetch` with `credentials: "include"` and no explicit `Content-Type` header lets the browser set the correct `multipart/form-data; boundary=...` header automatically from the `FormData` object.

**Why poll with `setInterval` instead of WebSocket or SSE?**
The job status endpoint is a simple `GET /jobs/:id` resource that fits the request-response model perfectly. WebSocket would require server-side socket infrastructure. SSE from the job endpoint could work but would be an asymmetric pattern (upload is REST, status is streaming). Polling every 3 seconds matches the expected job duration (typically 5–30 seconds for typical JSONL files) without excessive load.

**Why seed an initial `pending` job object immediately after the POST returns?**
The `POST /upload` response returns `{ job_id }` as an HTTP 202 — the job may already be `running` by the time the first poll fires 3 seconds later. Showing the job panel immediately with `pending` status (rather than hiding it until the first poll response) gives instant feedback that the upload was accepted and work is in progress, preventing the user from double-clicking Upload.

**Why validate client-side at all if the server also validates?**
Client-side validation provides instant, zero-latency feedback for the most common mistakes (wrong file type, empty file, oversized file) without requiring a round trip. The server still validates as authoritative, so both layers are complementary, not redundant.

### Alternative Approach

An alternative to `setInterval` polling would be to start a long-poll or use the browser's `EventSource` (SSE) on a dedicated `GET /jobs/:id/stream` endpoint. That would give push-based real-time updates with no wasted polling intervals when the job is slow. The downside is that it requires a new server-side streaming endpoint (more complexity), a more complex connection lifecycle (reconnects, cleanup), and offers marginal benefit for a job that typically completes in under 30 seconds. Polling at 3-second intervals is simpler, sufficient, and consistent with how other admin dashboards in similar projects handle background job monitoring.

---

---

## Milestone 8 — Cold Start Test & 22 Scenario Verification

### What Changed

- **Full Project Verification** — Validated the entire project from a clean state (cold start).
- **22 Scenarios Tested** — Systematically tested all functional requirements across Navigation, Uploader/Ingestion, Chatbot, and Conversation Management.
- **`communication_document.md`** *(modified)* — Appended this Milestone 8 summary.

### Why

**Why perform a `docker compose down -v` before verification?**
A cold start verification is the only way to ensure that all automation (migrations, collection creation, service dependencies) works as intended for a new developer or production deployment. It catches "it works on my machine" issues caused by residual data in volumes or manually applied schema changes.

**Why test malformed JSONL and specific deduplication cases?**
Data quality and efficiency are critical for RAG systems. Malformed line reporting ensures admins can fix data issues quickly. Deduplication via stable UUIDs and content hashes prevents bloating the vector database and LLM context with redundant information, directly improving performance and reducing API costs.

**Why verify RAG streaming and citations end-to-end?**
Streaming is essential for a "grounded" AI experience (low perceived latency). Citations are non-negotiable for RAG trust — the user must be able to verify where the assistant's information came from. Testing this ensures the SSE pipeline correctly carries citations as the terminal event and the UI renders them faithfully.

### Scenario Results

| Category | Pass/Fail | Key Verified Behavior |
|----------|-----------|------------------------|
| **Navigation** | **PASS** (4/4) | Sidebar persistence (N1), Auth guard redirects (N2), Tab layout (N3), Role-based 403 UI (N4). |
| **Uploader**   | **PASS** (9/9) | Format/size/empty validations (U1-U3), Async job lifecycle (U4), Error detail reporting (U5, U6), Metadata/Deduplication in Qdrant (U7, U8), Accurate counts (U9). |
| **Chatbot**    | **PASS** (3/3) | SSE streaming + Citations (C1), Clear "no information" response for unknown queries (C2), Error handling (C3). |
| **Conv Mgmt**  | **PASS** (6/6) | List/Open/Delete/Rename CRUD (V1-V4), Gemini-powered auto-naming (V5), Persistent source storage (V6). |

### Conclusion
The Knowledge Assistant module is fully integrated, stable, and meets all requirements specified in `CONTEXT.md`. The system handles the "small-to-big" retrieval pattern correctly and provides a premium, responsive AI experience within the Adamant SaaS dashboard.
