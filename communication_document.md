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
_To be filled by Antigravity after milestone is completed._

### Why
_To be filled by Antigravity after milestone is completed._

### Alternative Approach
_To be filled by Antigravity after milestone is completed._

---

## Milestone 5 — Node.js Backend Routes

### What Changed
_To be filled by Antigravity after milestone is completed._

### Why
_To be filled by Antigravity after milestone is completed._

### Alternative Approach
_To be filled by Antigravity after milestone is completed._

---

## Milestone 6 — Chat UI + Streaming Frontend

### What Changed
_To be filled by Antigravity after milestone is completed._

### Why
_To be filled by Antigravity after milestone is completed._

### Alternative Approach
_To be filled by Antigravity after milestone is completed._

---

## Milestone 7 — Knowledge Uploader UI

### What Changed
_To be filled by Antigravity after milestone is completed._

### Why
_To be filled by Antigravity after milestone is completed._

### Alternative Approach
_To be filled by Antigravity after milestone is completed._

---

## Milestone 8 — Cold Start Test & 22 Scenario Verification

### What Changed
_To be filled by Antigravity after milestone is completed._

### Why
_To be filled by Antigravity after milestone is completed._

### Scenario Results
_To be filled by Antigravity after milestone is completed._
