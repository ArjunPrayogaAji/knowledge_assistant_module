# Assignment Brief: Knowledge Assistant Module (RAG Knowledge Base)

You’re joining an existing dummy SaaS dashboard codebase (Next.js + Express + PostgreSQL/Knex) and implementing a new module called “Knowledge Assistant” on that dashboard.

The dashboard shell, auth, and existing CRUD patterns already exist. Your job is to add a production-style feature that demonstrates frontend, backend, DB, and AI integration.

## Goal
Build a “Knowledge Assistant” that lets a user:
- Create a knowledge base
- Ingest documents into it (async job)
- Chat with an assistant that answers using RAG
- Show citations / traceability

## Core user flows
- **Chatbot (conversations per user)**: ChatGPT-style chat UI with a conversation list/history; continue, delete, rename conversations; auto-generate conversation names
- **Knowledge Uploader (global/shared knowledge base)**: admin-only document upload flow that ingests documents into a single shared vector database; each upload updates the shared knowledge base; ingestion should return a `job_id` and the ingestion job status
- **RAG chat (streaming)**: stream assistant output to the browser; retrieve top-k chunks and generate a grounded answer from the shared knowledge base
- **Citations + traceability**: for each assistant message, store/display source references that map back to ingested documents and original module/item metadata

## Deliverables
- Working Knowledge Assistant module reachable from the sidebar
- Feature which is fully functional by just running `docker compose up`
- README updates if needed

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

- **Scenario: Module has two tabs (Chatbot and Knowledge Uploader)**
  - Given I am authenticated and viewing the Knowledge Assistant module
  - Then I can see two tabs: “Chatbot” and “Knowledge Uploader”
  - And the “Chatbot” tab lets me ask questions
  - And the “Knowledge Uploader” tab lets authorized users upload documents into the shared knowledge base

- **Scenario: Knowledge Uploader is admin-only**
  - Given I am authenticated
  - When I open the “Knowledge Uploader” tab
  - Then access is allowed only for users with the `admin` role
  - And non-admin users are blocked according to the existing app authorization behavior

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

- **Scenario: Knowledge Uploader updates the shared (global) knowledge base**
  - Given I am an admin user
  - When I upload new files/documents in the “Knowledge Uploader” tab
  - Then the shared (global) knowledge base is updated (not user-specific)
  - And newly uploaded content becomes queryable by the chatbot after ingestion completes

- **Scenario: Knowledge Uploader accepts supported formats**
  - Given I am an admin user on the “Knowledge Uploader” tab
  - When I upload one or more files
  - Then the system accepts at least one machine-readable document format (e.g., JSONL/NDJSON)
  - And rejects unsupported formats with a clear validation message

- **Scenario: Knowledge Uploader validates inputs (size, empties)**
  - Given I am an admin user on the “Knowledge Uploader” tab
  - When I attempt to upload an empty file or a file exceeding the allowed size limit
  - Then the system rejects the upload with a clear message explaining why

- **Scenario: Upload creates an ingestion job with visible lifecycle**
  - Given I am an admin user
  - When I upload files/documents
  - Then the system starts an ingestion job
  - And I can see the job status in the UI (at least: pending/running/succeeded/failed)
  - And if failed, I can see a human-readable failure reason

- **Scenario: JSONL parsing is safe and debuggable**
  - Given I upload a JSONL file
  - When the file contains malformed JSON lines
  - Then the system handles it safely (consistent behavior: fail the job or skip invalid lines)
  - And it reports which lines failed and why (at least line number + error message)

- **Scenario: Each ingested document preserves source metadata**
  - Given I upload a valid document bundle
  - When ingestion completes
  - Then each stored document includes metadata that can trace it back to its origin (e.g., filename, module/type, source_id, timestamps)
  - And that metadata can be used to show citations/source references in the chatbot

- **Scenario: Repeated uploads update without uncontrolled duplication**
  - Given I upload the same file/bundle more than once
  - When ingestion completes
  - Then the system applies a consistent strategy (dedupe/update/replace) rather than silently creating unlimited duplicates
  - And the UI or logs indicate what happened (e.g., inserted/updated/skipped counts)

- **Scenario: New uploads become available to the chatbot only after ingestion completes**
  - Given I upload new documents
  - When ingestion is still running
  - Then chatbot answers should not claim to use the new content unless it is fully ingested
  - And once ingestion succeeds, the chatbot can answer questions using the newly uploaded content

---

### Story: Ask questions against a knowledge base and see answers with source references
- **Priority**: high
- **Design story**: no

#### Description
As a dashboard user, I want to ask questions against the shared (global) knowledge base and receive answers with source references, so that I can trust where the information came from.

#### Acceptance criteria
- **Scenario: Ask a question with a ready knowledge base**
  - Given I am on the Knowledge Assistant module
  - When I submit a question that should be present in the shared (global) knowledge base
  - Then I receive an answer
  - And the answer includes references to the underlying sources used (at least document-level references)

- **Scenario: Ask a question with no ingested content**
  - Given I am on the Knowledge Assistant module
  - When I submit a question that is not present in the shared (global) knowledge base
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
  - Given I am authenticated
  - When I return to the Knowledge Assistant module later
  - Then I can see my prior conversations (conversations are per user)
  - And I can open a conversation to view its messages in chronological order

- **Scenario: List and continue conversations**
  - Given I am authenticated
  - When I view the conversation list
  - Then I can see a list of my previous conversations
  - And I can select one to continue the conversation

- **Scenario: Delete conversations**
  - Given I am authenticated and a conversation exists
  - When I delete the conversation
  - Then it is removed from my conversation list

- **Scenario: Rename conversations**
  - Given I am authenticated and a conversation exists
  - When I rename the conversation
  - Then the updated name is saved and shown in the conversation list

- **Scenario: Automatically create a conversation name**
  - Given I start a new conversation
  - When I send my first message
  - Then the system automatically generates a conversation name (e.g., based on the first message)

- **Scenario: Traceability per answer**
  - Given an answer was generated using sources
  - When I view that answer
  - Then I can see the associated source references
  - And each reference can be mapped back to its originating module and entry via stored metadata

---
