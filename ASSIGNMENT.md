# Assignment Brief: AI Copilot Module (RAG Knowledge Base)

You’re joining an existing dummy SaaS dashboard codebase (Next.js + Express + PostgreSQL/Knex) and implementing a new module under:

- `/dashboard/ai/copilot`

The dashboard shell, auth, and existing CRUD patterns already exist. Your job is to add a production-style feature that demonstrates frontend, backend, DB, and AI integration.

## Goal
Build a “Knowledge Base Copilot” that lets a user:
- Create a knowledge base
- Ingest documents into it (async job)
- Chat with an assistant that answers using RAG
- Show citations / traceability
- Capture feedback (thumbs up/down + optional reason/comment)

## Core user flows
- **Knowledge Bases**: create/list KBs, view KB detail (tabs recommended: Documents, Chat, Feedback)
- **Document ingestion**: upload text/markdown (PDF/URL optional), chunk + embed + store; ingestion should return a `job_id` and expose a status endpoint
- **RAG chat (streaming)**: stream assistant output to the browser; retrieve top-k chunks and generate a grounded answer
- **Citations + traceability**: for each assistant message, store/display retrieved chunk IDs + doc names (quotes optional)
- **Feedback**: store thumbs up/down per assistant message, tied to KB + conversation/message

## Output format requirements (AI)
Use structured outputs / tool calling so the model returns a strict JSON object with at least:
- `answer: string`
- `citations: Array<{ chunk_id: string; doc_id: string; quote?: string }>`
- `confidence?: "low" | "medium" | "high"` (or a numeric score)

## Technical requirements
- **Frontend**: loading/empty/error states, accessible forms, sensible UX
- **Backend**: endpoints for KB CRUD, upload+job creation, job status, chat (streaming), feedback; validate input and return consistent errors
- **Database**: migrations for tables such as `knowledge_bases`, `documents`, `chunks`, `conversations`, `messages`, `message_citations`, `feedback`, `jobs`; add sensible indexes and constraints
- **Security basics**: include at least one explicit prompt-injection mitigation (treat retrieved text as untrusted; isolate instructions vs data; validate structured outputs)

## Deliverables
- Working Copilot module reachable from the sidebar
- Migrations + seed data for a demo
- README updates describing setup, usage, and key tradeoffs
- Tests (pick one): 1–2 backend integration tests OR 1–2 frontend component tests

---

## Epic: Adamant SaaS — Knowledge Assistant Module

### Story: Add “Knowledge Assistant” module entry point in Adamant SaaS dashboard
- **Priority**: high
- **Design story**: no

#### Description
As a logged-in user of Adamant SaaS, I want to access a dedicated “Knowledge Assistant” area, so that I can work with knowledge bases inside the dashboard.

#### Acceptance criteria
- **Scenario: Module is accessible from the dashboard navigation**
  - Given I am authenticated in Adamant SaaS
  - When I open the dashboard navigation
  - Then I can see an entry for “Knowledge Assistant”
  - And selecting it navigates me to the module landing page

- **Scenario: Unauthenticated users cannot access the module**
  - Given I am not authenticated
  - When I attempt to open the module route directly
  - Then I am denied access according to the existing app authentication behavior

- **Scenario: Module has two tabs (Chatbot and Feedbacks)**
  - Given I am authenticated and viewing the Knowledge Assistant module
  - Then I can see two tabs: “Chatbot” and “Feedbacks”
  - And the “Chatbot” tab lets me ask questions
  - And the “Feedbacks” tab lets me review feedback left on answers

---

### Story: Create a knowledge base and ingest all Adamant SaaS module data via JSONL exports
- **Priority**: high
- **Design story**: no

#### Description
As a dashboard user, I want a knowledge base to exist and be populated by ingesting JSONL exports from Adamant SaaS modules (using the existing “Export JSONL” buttons), so that I can query the chatbot against the ingested dashboard data.

#### Acceptance criteria
- **Scenario: Create a knowledge base**
  - When I create a knowledge base with a name
  - Then the knowledge base is saved
  - And empty/whitespace-only names are rejected with a clear validation message

- **Scenario: Ingest exported JSONL into the knowledge base (all modules)**
  - Given I have created a knowledge base
  - And I have exported JSONL from the Adamant SaaS modules (docs, policies, API reference, changelog, incidents, support conversations, feature flags, analytics events, playbooks/runbooks)
  - When I ingest those JSONL documents into the knowledge base
  - Then the knowledge base becomes queryable by the chatbot using the ingested dashboard data

---

### Story: Ask questions against a knowledge base and see answers with source references
- **Priority**: high
- **Design story**: no

#### Description
As a dashboard user, I want to ask questions against a selected knowledge base and receive answers with source references, so that I can trust where the information came from.

#### Acceptance criteria
- **Scenario: Ask a question with a ready knowledge base**
  - Given I am on the Knowledge Assistant module
  - When I submit a question that should be present in the knowledge base
  - Then I receive an answer
  - And the answer includes references to the underlying sources used (at least document-level references)

- **Scenario: Ask a question with no ingested content**
  - Given I am on the Knowledge Assistant module
  - When I submit a question that is not present in the knowledge base
  - Then the system informs me that it cannot answer from that knowledge base
  - And it provides a clear next step (e.g., ingest sources or select a different knowledge base)

- **Scenario: Upstream failure during answering**
  - Given the system encounters an error while generating an answer (e.g., timeout or provider failure)
  - When I submit a question
  - Then I see a clear error message
  - And the system does not display or store a partial answer as if it were successful

---

### Story: Conversation history and traceability
- **Priority**: normal
- **Design story**: no

#### Description
As a dashboard user, I want conversation history and traceability of answers, so I can review what was asked and which sources supported the answers.

#### Acceptance criteria
- **Scenario: View conversation history**
  - Given I have asked at least one question in a knowledge base
  - When I return to the Knowledge Assistant module later
  - Then I can see prior conversations for that knowledge base
  - And I can open a conversation to view its messages in chronological order

- **Scenario: Traceability per answer**
  - Given an answer was generated using sources
  - When I view that answer
  - Then I can see the associated source references
  - And each reference can be mapped back to its originating module and entry via stored metadata

---

### Story: Capture feedback on answers
- **Priority**: normal
- **Design story**: no

#### Description
As a dashboard user, I want to rate answers and optionally add feedback, so that answer quality can be reviewed and improved.

#### Acceptance criteria
- **Scenario: Submit a rating**
  - Given an answer is displayed
  - When I provide a positive or negative rating
  - Then the rating is saved and linked to the answer
  - And the UI reflects my submitted rating

- **Scenario: Optional feedback detail**
  - Given I am submitting feedback
  - When I provide an optional reason and/or comment
  - Then it is saved with the feedback
  - And it is visible when viewing the answer details

- **Scenario: Update existing feedback**
  - Given I have already submitted feedback for an answer
  - When I submit feedback again for the same answer
  - Then the system applies one consistent behavior: it updates the existing feedback or blocks duplicates with a clear message
  - And the UI reflects the stored final state

- **Scenario: Feedback submission failure**
  - Given the system cannot save feedback due to an error
  - When I submit feedback
  - Then I see a clear error message
  - And the UI does not incorrectly show feedback as saved
