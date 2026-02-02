# Adamant SaaS Dashboard

A knowledge base dashboard built with Next.js (App Router) + Express REST API + PostgreSQL (Knex migrations/seeds).

This repository contains realistic knowledge modules that can be exported as JSONL documents for building AI knowledge bases.

## Quick Start (Docker)

Prerequisites: Docker Desktop (or Docker Engine + Compose).

```bash
docker compose up --build
```

Then open:
- Web: `http://localhost:3000`
- API health: `http://localhost:4000/healthz`

Demo login:
- Email: `admin@ac.local`
- Password: `password`

### Stop / Reset

```bash
docker compose down
```

To wipe the database volume:

```bash
docker compose down -v
```

## Local Development (without Docker)

Prerequisites: Node.js 20+, npm, Postgres 16+.

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
cp env.example .env
```

3. Run migrations and seed data:
```bash
npm run db:migrate
npm run db:seed
```

4. Start both apps:
```bash
npm run dev
```

## Knowledge Modules

The dashboard contains 9 knowledge modules, each with realistic seed data:

| Module | Description | Items |
|--------|-------------|-------|
| **Docs Library** | Product documentation, onboarding guides, how-tos, glossary | ~20 |
| **Policies & Compliance** | Privacy policy, data retention, security guidelines, SLAs | ~15 |
| **API Reference** | Endpoint definitions, auth methods, rate limits, examples | ~25 |
| **Changelog** | Version releases, breaking changes, migration notes | ~15 |
| **Incidents & Postmortems** | Incident timelines, impact, root cause, remediation | ~10 |
| **Support Conversations** | Anonymized support threads with resolutions | ~15 |
| **Feature Flags** | Flag configs, rollout percentages, target segments | ~15 |
| **Analytics Events** | Event schemas, when fired, sample payloads | ~15 |
| **Internal Playbooks** | On-call runbooks, deployment checklists, troubleshooting | ~12 |

## Database Schema

All knowledge is stored in a single `knowledge_items` table:

```sql
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,          -- docs, policies, api_reference, etc.
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  body TEXT NOT NULL,          -- markdown content
  metadata_json JSONB,         -- structured data per type
  tags TEXT[],
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Indexes for filtering
CREATE INDEX ON knowledge_items (type);
CREATE INDEX ON knowledge_items (category);
CREATE INDEX ON knowledge_items (updated_at);
CREATE INDEX ON knowledge_items (type, category);
```

## Exporting Data as JSONL

Each module can be exported as JSONL (JSON Lines) format for ingestion into AI systems.

### Via UI

1. Navigate to any module (e.g., `/dashboard/knowledge/docs`)
2. Click the "Export JSONL" button
3. File downloads automatically

### Via API

```bash
# Export all docs
curl -H "Cookie: ac_session=YOUR_SESSION" \
  http://localhost:4000/exports/docs

# Export with filters
curl -H "Cookie: ac_session=YOUR_SESSION" \
  "http://localhost:4000/exports/docs?category=getting-started"

# Export specific items
curl -H "Cookie: ac_session=YOUR_SESSION" \
  "http://localhost:4000/exports/docs?ids=uuid1,uuid2"

# Export items updated after a date
curl -H "Cookie: ac_session=YOUR_SESSION" \
  "http://localhost:4000/exports/docs?updated_after=2026-01-01"
```

### JSONL Format

Each line is a complete JSON object:

```jsonl
{"id":"abc123","type":"docs","title":"Getting Started","category":"getting-started","body":"# Welcome...","tags":["onboarding"],"metadata_json":{"reading_time_minutes":5},"created_at":"2026-01-01T00:00:00.000Z","updated_at":"2026-01-15T00:00:00.000Z"}
{"id":"def456","type":"docs","title":"API Quickstart","category":"getting-started","body":"# API Guide...","tags":["api"],"metadata_json":{"reading_time_minutes":8},"created_at":"2026-01-02T00:00:00.000Z","updated_at":"2026-01-16T00:00:00.000Z"}
```

## API Endpoints

### Knowledge Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/knowledge/:type` | List items with pagination and filters |
| GET | `/knowledge/:type/:id` | Get single item |
| GET | `/knowledge/stats/counts` | Get item counts per type |
| GET | `/knowledge/recent/all` | Get recent items across all types |

### Export Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exports/:type` | Export items as JSONL |

Query parameters for exports:
- `ids` - Comma-separated UUIDs to export specific items
- `category` - Filter by category
- `updated_after` - ISO date string for incremental exports

Valid types: `docs`, `policies`, `api_reference`, `changelog`, `incidents`, `support`, `feature_flags`, `analytics_events`, `playbooks`

## Project Structure

```
├── apps/
│   ├── api/              # Express REST API
│   │   └── src/
│   │       ├── routes/   # API routes
│   │       │   ├── knowledge.ts
│   │       │   └── exports.ts
│   │       └── server.ts
│   └── web/              # Next.js dashboard
│       ├── app/
│       │   └── (dashboard)/dashboard/knowledge/
│       │       ├── docs/
│       │       ├── policies/
│       │       ├── api-reference/
│       │       ├── changelog/
│       │       ├── incidents/
│       │       ├── support/
│       │       ├── feature-flags/
│       │       ├── analytics-events/
│       │       └── playbooks/
│       └── components/
├── packages/
│   └── db/               # Database migrations and seeds
│       ├── migrations/
│       │   ├── 20260128120000_init.ts
│       │   └── 20260202000000_knowledge_modules.ts
│       └── seeds/
│           ├── 01_seed_core.ts
│           └── 02_seed_knowledge.ts
└── docker-compose.yml
```

## Testing

Run API tests:

```bash
cd apps/api
npm test
```

## License

ISC
