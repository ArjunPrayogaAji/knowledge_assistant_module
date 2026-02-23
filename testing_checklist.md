# Testing Checklist
## Knowledge Assistant — Adamant SaaS

> Manual verification checklist per milestone. Check each item before marking a milestone as DONE.

---

## Milestone 3 — DB Migrations + Docker Compose Update

### Docker Services
- [x] `docker compose up` — all 5 services start without error: `db`, `qdrant`, `rag`, `api`, `web`
  ```bash
  docker compose up
  # Semua service harus muncul tanpa exit code error
  ```
- [x] `db` — healthy (postgres:16 running on port 5432)
  ```bash
  docker ps | grep db
  # Status harus "healthy"
  ```
- [x] `qdrant` — running on port 6333, UI accessible at `http://localhost:6333/dashboard`
  ```bash
  open http://localhost:6333/dashboard
  ```
- [x] `rag` — running on port 8000, health check passes
  ```bash
  curl http://localhost:8000/health
  # Expected: {"status": "ok"}
  ```
- [x] `api` — running on port 4000
  ```bash
  curl http://localhost:4000
  # Harus respond (apapun responsnya, tidak connection refused)
  ```
- [x] `web` — running on port 3000, dashboard accessible
  ```bash
  open http://localhost:3000
  ```

### Database Migrations
- [x] 4 new tables exist in PostgreSQL
  ```bash
  docker exec -it adamant-code-candidate-assignment-db-1 psql -U postgres -d ac_dev -c "\dt"
  # Harus ada: conversations, messages, message_sources, ingestion_jobs
  ```

### Environment Variables
- [x] `GOOGLE_API_KEY` is available in rag container
  ```bash
  docker exec adamant-code-candidate-assignment-rag-1 env | grep GOOGLE
  ```
- [x] `QDRANT_URL` is available in rag container
  ```bash
  docker exec adamant-code-candidate-assignment-rag-1 env | grep QDRANT
  ```
- [x] `RAG_SERVICE_URL` is available in api container
  ```bash
  docker exec adamant-code-candidate-assignment-api-1 env | grep RAG
  ```
- [x] `.env.example` contains the 3 new variables
  ```bash
  grep -E "GOOGLE_API_KEY|QDRANT_URL|RAG_SERVICE_URL" .env.example
  # Harus muncul ketiga variable
  ```

### Cold Start
- [x] `docker compose down -v` → `docker compose up` — everything works from scratch
  ```bash
  docker compose down -v
  docker compose up
  # Ulangi semua cek di atas
  ```

---

## Milestone 4 — Python FastAPI RAG Service

> Test endpoints directly via curl — no UI available yet at this milestone.

### Service Health
- [x] `GET http://localhost:8000/health` → `{ "status": "ok" }`
  ```bash
  curl http://localhost:8000/health
  ```

### POST /ingest
- [x] Upload a valid JSONL payload → returns `{ inserted, updated, skipped }`
  ```bash
  curl -X POST http://localhost:8000/ingest \
    -H "Content-Type: application/json" \
    -d '{
      "job_id": "test-job-001",
      "filename": "testing.jsonl",
      "lines": [
        {"content": "Adamant is a SaaS platform for managing client data.", "source_id": "doc-001", "module": "general"},
        {"content": "The dashboard provides real-time analytics and reporting tools.", "source_id": "doc-002", "module": "dashboard"}
      ]
    }'
  # Expected: {"inserted": 2, "updated": 0, "skipped": 0}
  ```
- [x] Qdrant collection `document_chunks` is created automatically on first ingest
  ```bash
  curl http://localhost:6333/collections/document_chunks
  # Expected: status green, points_count > 0
  ```
- [x] Check Qdrant dashboard — collection exists with points
  ```bash
  open http://localhost:6333/dashboard
  # Klik collection document_chunks, lihat points
  ```
- [x] Each point has correct payload fields
  ```bash
  curl "http://localhost:6333/collections/document_chunks/points?limit=1"
  # Cek payload: content, content_hash, source_id, filename, module, chunk_type, parent_id, ingested_at, job_id
  ```
- [x] Vector dimension is 3072 (matches gemini-embedding-001 default)
  ```bash
  curl http://localhost:6333/collections/document_chunks
  # Lihat config.params.vectors.dense.size — harus 3072
  ```
- [x] Re-upload same payload → `inserted=0`, all skipped (deduplication works)
  ```bash
  # Jalankan curl ingest yang sama lagi
  # Expected: {"inserted": 0, "updated": 0, "skipped": 2}
  ```
- [x] Upload modified content with same `source_id` → `updated > 0`
  ```bash
  curl -X POST http://localhost:8000/ingest \
    -H "Content-Type: application/json" \
    -d '{
      "job_id": "test-job-002",
      "filename": "testing.jsonl",
      "lines": [
        {"content": "Adamant is a SaaS platform. UPDATED content.", "source_id": "doc-001", "module": "general"}
      ]
    }'
  # Expected: {"inserted": 0, "updated": 1, "skipped": 0}
  ```

### POST /chat
- [x] Send a query → receives streaming SSE response
  ```bash
  curl -X POST http://localhost:8000/chat \
    -H "Content-Type: application/json" \
    -d '{"query": "What is Adamant?", "conversation_history": []}'
  # Expected: stream of data: {...} events
  ```
- [x] Final SSE event contains citations
  ```bash
  # Lihat output curl di atas — event terakhir harus:
  # data: {"type": "citations", "citations": [...]}
  ```
- [x] Empty KB query → returns clear message (no hallucination)
  ```bash
  docker compose down -v && docker compose up
  curl -X POST http://localhost:8000/chat \
    -H "Content-Type: application/json" \
    -d '{"query": "What is Adamant?", "conversation_history": []}'
  # Expected: pesan bahwa KB kosong, bukan jawaban palsu
  ```

---

## Milestone 5 — Node.js Backend Routes

> Untuk semua curl di bawah, dapatkan session cookie dengan login via browser
> lalu copy dari DevTools → Application → Cookies → ac_session

### Upload
- [x] `POST /knowledge-assistant/upload` with valid JSONL → returns `{ job_id }` immediately
  ```bash
  curl -X POST http://localhost:4000/knowledge-assistant/upload \
    -H "Cookie: ac_session=<session_cookie_admin>" \
    -F "file=@testing.jsonl"
  # Expected: {"job_id": "..."}
  Response: {"job_id": "..."}
  ```
- [x] Non-admin user hits upload → 403
  ```bash
  curl -X POST http://localhost:4000/knowledge-assistant/upload \
    -H "Cookie: ac_session=<session_cookie_non_admin>" \
    -F "file=@testing.jsonl"
  # Expected: 403
  Response: {"error":{"code":"FORBIDDEN","message":"Forbidden"}}
  ```
- [x] Upload non-JSONL file → rejected with clear error message
  ```bash
  echo "hello" > test.txt
  curl -X POST http://localhost:4000/knowledge-assistant/upload \
    -H "Cookie: ac_session=<session_cookie_admin>" \
    -F "file=@test.txt"
  # Expected: error message tentang format file
  Response: {"error":{"code":"VALIDATION_ERROR","message":"Only .jsonl or .ndjson files are accepted"}}%        
  ```
- [x] Upload empty file → rejected with clear error message
  ```bash
  touch empty.jsonl
  curl -X POST http://localhost:4000/knowledge-assistant/upload \
    -H "Cookie: ac_session=<session_cookie_admin>" \
    -F "file=@empty.jsonl"
  # Expected: error message file kosong
  Response: {"error":{"code":"VALIDATION_ERROR","message":"File is empty"}}
  ```
- [x] Upload file > 10MB → rejected with clear error message
  ```bash
  dd if=/dev/zero of=big.jsonl bs=1M count=11
  curl -X POST http://localhost:4000/knowledge-assistant/upload \
    -H "Cookie: ac_session=<session_cookie_admin>" \
    -F "file=@big.jsonl"
  # Expected: error message file terlalu besar
  Response: {"error":{"code":"VALIDATION_ERROR","message":"File exceeds 10MB limit"}}
  ```
- [x] Upload JSONL with 1 malformed line → job succeeds, `error_details` contains line number + reason
  ```bash
  printf '{"content": "valid line", "source_id": "doc-001", "module": "general"}\nINVALID JSON HERE\n{"content": "another valid", "source_id": "doc-002", "module": "general"}' > malformed.jsonl
  curl -X POST http://localhost:4000/knowledge-assistant/upload \
    -H "Cookie: ac_session=<session_cookie_admin>" \
    -F "file=@malformed.jsonl"
  # Ambil job_id, lalu cek GET /jobs/:id → error_details berisi line 2 + reason
  Response: {"data":{"job":{"id":"c1f70df1-65b5-4596-a3b3-bf38b739198d","filename":"malformed.jsonl","status":"succeeded","error_details":{"malformed_lines":[{"line":2,"reason":"Invalid JSON"}]},"inserted":0,"updated":0,"skipped":4,"created_at":"2026-02-23T05:06:08.683Z","updated_at":"2026-02-23T05:06:09.024Z"}}}%   
  ```

### Job Status
- [x] `GET /knowledge-assistant/jobs/:id` → returns job row with correct status
  ```bash
  curl http://localhost:4000/knowledge-assistant/jobs/<job_id> \
    -H "Cookie: ac_session=<session_cookie>"
  # Expected: job row dengan status field
  Response: {"data":{"job":{"id":"a7fa237b-e0c0-468e-90d1-46c6bbed7f02","filename":"malformed.jsonl","status":"succeeded","error_details":{"malformed_lines":[{"line":2,"reason":"Invalid JSON"}]},"inserted":0,"updated":4,"skipped":0,"created_at":"2026-02-23T05:00:46.313Z","updated_at":"2026-02-23T05:00:48.365Z"}}}
  ```
- [x] Job lifecycle visible: `pending` → `running` → `succeeded`
  ```bash
  # Upload file, langsung poll berulang kali
  watch -n 1 "curl -s http://localhost:4000/knowledge-assistant/jobs/<job_id> -H 'Cookie: ac_session=<session_cookie>'"
  # Lihat status berubah dari pending → running → succeeded
  # follow up code
  python3 -c "
    import json
    with open('big_valid.jsonl', 'w') as f:
        for i in range(5000):
            f.write(json.dumps({'content': f'Document {i} about Adamant SaaS platform features and capabilities.', 'source_id': f'doc-{i}', 'module': 'general'}) + '\n')
    " && \
    export JOB_ID=$(curl -s -b cookies.txt -X POST http://localhost:4000/knowledge-assistant/upload \
      -F "file=@big_valid.jsonl" | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])") && \
    echo "Job ID: $JOB_ID" && \
    while true; do curl -s -b cookies.txt http://localhost:4000/knowledge-assistant/jobs/$JOB_ID; echo; sleep 1; done

  Respond: status=failed or status=pending or status=running or succeeded
  ```
- [x] Failed job → `status=failed`, `error_details` contains reason
  ```bash
  # Stop rag container sebelum upload agar job gagal
  docker stop adamant-code-candidate-assignment-rag-1
  # Upload file, lalu cek job status
  curl http://localhost:4000/knowledge-assistant/jobs/<job_id> \
    -H "Cookie: ac_session=<session_cookie>"
  # Expected: status=failed, error_details berisi reason
  docker start adamant-code-candidate-assignment-rag-1
  Respond: done with previous testing, reason: gemini api limit.
  ```

### Conversations
- [x] `POST /knowledge-assistant/conversations` → returns `{ conversation_id }`
  ```bash
  curl -X POST http://localhost:4000/knowledge-assistant/conversations \
    -H "Cookie: ac_session=<session_cookie>"
  # Expected: {"conversation_id": "..."}
  Respond: {"conversation_id":"83dac90a-1e45-48b2-ad24-203f58056e14"}
  ```
- [x] `GET /knowledge-assistant/conversations` → returns list ordered by `created_at desc`
  ```bash
  curl http://localhost:4000/knowledge-assistant/conversations \
    -H "Cookie: ac_session=<session_cookie>"
  # Expected: array conversations, urutan terbaru di atas
  Respond: {"data":{"conversations":[{"id":"83dac90a-1e45-48b2-ad24-203f58056e14","user_id":"bb247e5b-f655-432e-bdca-a0477f79eac4","name":"New Conversation","created_at":"2026-02-23T05:26:51.891Z"}]}}% 
  ```
- [x] `DELETE /knowledge-assistant/conversations/:id` → conversation removed
  ```bash
  curl -X DELETE http://localhost:4000/knowledge-assistant/conversations/<id> \
    -H "Cookie: ac_session=<session_cookie>"
  # Lalu GET /conversations — harus sudah tidak ada
  Respond: {"data":{"ok":true}} # DELETE
  Respond: {"data":{"conversations":[]}} # GET
  ```
- [x] `PATCH /knowledge-assistant/conversations/:id` → name updated
  ```bash
  curl -X PATCH http://localhost:4000/knowledge-assistant/conversations/<id> \
    -H "Cookie: ac_session=<session_cookie>" \
    -H "Content-Type: application/json" \
    -d '{"name": "New Name"}'
  # Expected: 200, name terupdate
  Respond: {"data":{"conversations":[{"id":"a95e1255-c8f6-4686-9d2e-5f33b7430fe8","user_id":"bb247e5b-f655-432e-bdca-a0477f79eac4","name":"What is Adamant?","created_at":"2026-02-23T05:33:38.382Z"}]}}% 
  ```
- [x] `GET /knowledge-assistant/conversations/:id/messages` → returns messages with sources
  ```bash
  curl http://localhost:4000/knowledge-assistant/conversations/<id>/messages \
    -H "Cookie: ac_session=<session_cookie>"
  # Expected: array messages, tiap assistant message punya message_sources
  Respond:
    {"data":{"messages":[{"id":"684d565d-688e-455d-9d86-cafb8c9bdeca","conversation_id":"a95e1255-c8f6-4686-9d2e-5f33b7430fe8","role":"user","content":"What is Adamant?","created_at":"2026-02-23T05:35:41.527Z","sources":[]},{"id":"2a6bb772-180c-40f9-a01e-76cae2b520dd","conversation_id":"a95e1255-c8f6-4686-9d2e-5f33b7430fe8","role":"assistant","content":"The provided context does not contain any information about \"Adamant\". To learn about \"Adamant\", you would need documents such as a dictionary, an encyclopedia, or a text that discusses the term in detail.","created_at":"2026-02-23T05:35:44.947Z","sources":[{"id":"8524ab92-7054-43a4-be75-f9c93df947a3","message_id":"2a6bb772-180c-40f9-a01e-76cae2b520dd","qdrant_chunk_id":"826a5ae2-d5f1-5b2a-ba3c-c71c991be34d","metadata":{"module":"general","filename":"malformed.jsonl","source_id":"doc-002","content_preview":"another valid"}},{"id":"5458a10d-ddb8-4c91-bb51-c7094ffafa44","message_id":"2a6bb772-180c-40f9-a01e-76cae2b520dd","qdrant_chunk_id":"3de8467d-3239-506e-8d4d-920e3a8fe0f0","metadata":{"module":"general","filename":"malformed.jsonl","source_id":"doc-001","content_preview":"valid line"}}]}]}}

  ```

### Chat via API
- [x] `POST /knowledge-assistant/conversations/:id/chat` → SSE stream received
  ```bash
  curl -X POST http://localhost:4000/knowledge-assistant/conversations/<id>/chat \
    -H "Cookie: ac_session=<session_cookie>" \
    -H "Content-Type: application/json" \
    -d '{"message": "What is Adamant?"}'
  # Expected: streaming SSE response
  Respond: 
    data: {"type": "text", "content": "The provided context does not contain any information about \"Adamant\".\n\nTo find information about \"Adamant\", you would need documents such as a dictionary, an encyclopedia, or a text related to minerals, materials science"}
    data: {"type": "text", "content": ", or mythology."}
    data: {"type": "citations", "citations": [{"qdrant_chunk_id": "826a5ae2-d5f1-5b2a-ba3c-c71c991be34d", "source_id": "doc-002", "filename": "malformed.jsonl", "module": "general", "content_preview": "another valid"}, {"qdrant_chunk_id": "3de8467d-3239-506e-8d4d-920e3a8fe0f0", "source_id": "doc-001", "filename": "malformed.jsonl", "module": "general", "content_preview": "valid line"}]}
  ```
- [x] Assistant message saved to DB after stream ends
  ```bash
  curl http://localhost:4000/knowledge-assistant/conversations/<id>/messages \
    -H "Cookie: ac_session=<session_cookie>"
  # Expected: ada message baru dengan role=assistant
  Respond: 
    {"data":{"messages":[{"id":"0b6828a0-827f-47e7-9969-ea2391d3600a","conversation_id":"05d5437e-1b56-4f1d-907a-9dba3848f717","role":"user","content":"What is Adamant?","created_at":"2026-02-23T05:44:43.999Z","sources":[]},{"id":"de4c7dd4-9566-49af-990b-427dbc6e27df","conversation_id":"05d5437e-1b56-4f1d-907a-9dba3848f717","role":"assistant","content":"The provided context does not contain any information about \"Adamant\".\n\nTo find information about \"Adamant\", you would need documents such as a dictionary, an encyclopedia, or a text related to minerals, materials science, or mythology.","created_at":"2026-02-23T05:44:46.695Z","sources":[{"id":"dc9200f7-9d5e-4bcf-8cba-adde94f50779","message_id":"de4c7dd4-9566-49af-990b-427dbc6e27df","qdrant_chunk_id":"826a5ae2-d5f1-5b2a-ba3c-c71c991be34d","metadata":{"module":"general","filename":"malformed.jsonl","source_id":"doc-002","content_preview":"another valid"}},{"id":"2ab449d5-d162-476f-9950-1b7022ac8da8","message_id":"de4c7dd4-9566-49af-990b-427dbc6e27df","qdrant_chunk_id":"3de8467d-3239-506e-8d4d-920e3a8fe0f0","metadata":{"module":"general","filename":"malformed.jsonl","source_id":"doc-001","content_preview":"valid line"}}]}]}}% 
  ```
- [x] `message_sources` rows created after stream ends
  ```bash
  docker exec -it adamant-code-candidate-assignment-db-1 psql -U postgres -d ac_dev \
    -c "SELECT * FROM message_sources LIMIT 5;"
  # Expected: rows dengan qdrant_chunk_id terisi
  Respond:                  id                  |              message_id              |           qdrant_chunk_id            |                                                     metadata                                                     
    --------------------------------------+--------------------------------------+--------------------------------------+------------------------------------------------------------------------------------------------------------------
    8524ab92-7054-43a4-be75-f9c93df947a3 | 2a6bb772-180c-40f9-a01e-76cae2b520dd | 826a5ae2-d5f1-5b2a-ba3c-c71c991be34d | {"module": "general", "filename": "malformed.jsonl", "source_id": "doc-002", "content_preview": "another valid"}
    5458a10d-ddb8-4c91-bb51-c7094ffafa44 | 2a6bb772-180c-40f9-a01e-76cae2b520dd | 3de8467d-3239-506e-8d4d-920e3a8fe0f0 | {"module": "general", "filename": "malformed.jsonl", "source_id": "doc-001", "content_preview": "valid line"}
    dc9200f7-9d5e-4bcf-8cba-adde94f50779 | de4c7dd4-9566-49af-990b-427dbc6e27df | 826a5ae2-d5f1-5b2a-ba3c-c71c991be34d | {"module": "general", "filename": "malformed.jsonl", "source_id": "doc-002", "content_preview": "another valid"}
    2ab449d5-d162-476f-9950-1b7022ac8da8 | de4c7dd4-9566-49af-990b-427dbc6e27df | 3de8467d-3239-506e-8d4d-920e3a8fe0f0 | {"module": "general", "filename": "malformed.jsonl", "source_id": "doc-001", "content_preview": "valid line"}
  ```
- [x] First message in conversation → conversation name auto-generated
  ```bash
  # Buat conversation baru, kirim 1 pesan, tunggu stream selesai
  curl http://localhost:4000/knowledge-assistant/conversations \
    -H "Cookie: ac_session=<session_cookie>"
  # Expected: name conversation sudah terisi, bukan null
  Respond: 
    {"data":{"conversations":[{"id":"05d5437e-1b56-4f1d-907a-9dba3848f717","user_id":"bb247e5b-f655-432e-bdca-a0477f79eac4","name":"What is Adamant?","created_at":"2026-02-23T05:43:40.881Z"},{"id":"35beaff4-1288-47e5-a342-8cebd4e3d349","user_id":"bb247e5b-f655-432e-bdca-a0477f79eac4","name":"New Conversation","created_at":"2026-02-23T05:43:28.213Z"},{"id":"dbc3f8f1-c788-4cc0-9f46-dea95bc24fd0","user_id":"bb247e5b-f655-432e-bdca-a0477f79eac4","name":"New Conversation","created_at":"2026-02-23T05:42:47.035Z"},{"id":"a95e1255-c8f6-4686-9d2e-5f33b7430fe8","user_id":"bb247e5b-f655-432e-bdca-a0477f79eac4","name":"What is Adamant?","created_at":"2026-02-23T05:33:38.382Z"}]}}% 
  ```

---

## Milestone 6 — Chat UI + Streaming Frontend

### Conversation List (Left Panel)
- [x] Conversation list visible on page load
  ```
  Buka http://localhost:3000/dashboard/knowledge-assistant
  Panel kiri harus menampilkan daftar conversations
  ```
- [x] "New conversation" button creates a new conversation
  ```
  Klik tombol New Conversation
  Conversation baru harus muncul di list
  ```
- [x] Delete button removes conversation from list
  ```
  Klik delete pada salah satu conversation
  Conversation harus hilang dari list tanpa perlu refresh
  ```
- [x] Double-click on conversation name → inline rename works
  ```
  Double-click nama conversation → input field muncul
  Ketik nama baru → tekan Enter
  Nama harus berubah
  ```
- [x] Renamed conversation name persists after page refresh
  ```
  Rename conversation → Cmd+R
  Nama baru harus tetap ada
  ```

### Chat (Right Panel)
- [x] User messages appear right-aligned
  ```
  Kirim pesan — bubble harus muncul di kanan
  ```
- [x] Assistant messages appear left-aligned
  ```
  Tunggu response — bubble harus muncul di kiri
  ```
- [x] Text streams in real time (not all at once)
  ```
  Kirim pertanyaan — teks assistant harus muncul bertahap, bukan langsung semua
  ```
- [x] Send button disabled while streaming
  ```
  Saat streaming berlangsung, tombol Send harus disabled/greyed out
  ```
- [x] Input field disabled while streaming
  ```
  Saat streaming berlangsung, input field harus tidak bisa diketik
  ```
- [x] Citations appear below assistant message as collapsible list
  ```
  Setelah response selesai, harus ada section citations yang bisa di-expand/collapse
  Isi: filename, module, source_id
  ```
- [x] Opening a previous conversation loads its full message history
  ```
  Klik conversation lama di list kiri
  Semua pesan sebelumnya harus muncul di panel kanan
  ```

### Error Handling
- [x] API failure → inline error message shown (no silent failure)
  ```bash
  docker stop adamant-code-candidate-assignment-rag-1
  # Kirim pesan di chat UI
  # Harus muncul error message di UI, bukan blank atau hang
  docker start adamant-code-candidate-assignment-rag-1
  ```

---

## Milestone 7 — Knowledge Uploader UI

### File Validation (Client-side)
- [x] Upload wrong file type → clear error message before sending to server
  ```
  Login sebagai admin → buka tab Knowledge Uploader
  Drag/pilih file .txt atau .pdf
  Error harus muncul SEBELUM file dikirim (tidak ada network request di DevTools)
  ```
- [x] Upload empty file → clear error message
  ```bash
  touch empty.jsonl
  # Upload via UI
  # Error harus muncul
  ```
- [x] Upload file > 10MB → clear error message
  ```bash
  dd if=/dev/zero of=big.jsonl bs=1M count=11
  # Upload via UI
  # Error harus muncul
  ```

### Upload Flow
- [x] Upload valid JSONL → loading state shown during upload
  ```
  Upload testing.jsonl
  Harus ada loading indicator/spinner saat upload berlangsung
  ```
- [x] After upload → `job_id` displayed
  ```
  Setelah upload selesai, job_id harus terlihat di UI
  ```
- [x] Job status polls every 3 seconds automatically
  ```
  Buka DevTools → Network tab
  Harus ada request ke GET /jobs/:id setiap ~3 detik
  ```
- [x] `pending` status → grey badge
- [x] `running` status → blue badge
- [x] `succeeded` status → green badge
- [x] `failed` status → red badge
  ```
  Observasi badge warna berubah seiring status berubah dari pending → running → succeeded
  ```

### Results
- [x] On success → `inserted`, `updated`, `skipped` counts displayed
  ```
  Setelah status succeeded, harus ada angka inserted/updated/skipped di UI
  ```
- [x] On failure → `error_details` with skipped line numbers and reasons displayed
  ```bash
  printf '{"content": "valid", "source_id": "doc-001", "module": "general"}\nINVALID\n{"content": "valid2", "source_id": "doc-002", "module": "general"}' > malformed.jsonl
  # Upload malformed.jsonl via UI
  # UI harus tampilkan line number + reason dari baris yang gagal
  ```

---

## Milestone 8 — Cold Start & 22 Scenario Verification

### Cold Start
- [ ] Full cold start sequence
  ```bash
  docker compose down -v
  docker compose up
  # Tunggu semua service healthy
  ```
- [ ] 4 new PostgreSQL tables exist
  ```bash
  docker exec -it adamant-code-candidate-assignment-db-1 psql -U postgres -d ac_dev -c "\dt"
  # Harus ada: conversations, messages, message_sources, ingestion_jobs
  ```
- [ ] Qdrant collection created on first ingest
  ```bash
  # Upload file via UI, lalu:
  curl http://localhost:6333/collections/document_chunks
  # Expected: status green, points_count > 0
  ```
- [ ] `GOOGLE_API_KEY` available in rag container
  ```bash
  docker exec adamant-code-candidate-assignment-rag-1 env | grep GOOGLE
  ```

### Feature 1 — Navigation (4 scenarios)
- [ ] Authenticated user sees "Knowledge Assistant" in sidebar
  ```
  Login → cek sidebar kiri → harus ada link "Knowledge Assistant"
  ```
- [ ] Unauthenticated user is redirected to login
  ```
  Buka http://localhost:3000/dashboard/knowledge-assistant tanpa login
  Harus redirect ke /login
  ```
- [ ] Page has two tabs: Chatbot and Knowledge Uploader
  ```
  Login → buka Knowledge Assistant → harus ada 2 tab
  ```
- [ ] Non-admin user sees 403 on Knowledge Uploader tab
  ```
  Login sebagai non-admin → klik tab Knowledge Uploader → harus tampil 403 panel
  ```

### Feature 2 — Knowledge Uploader / Ingestion (9 scenarios)
- [ ] Valid JSONL upload → job created, ingestion succeeds
- [ ] Non-JSONL file → rejected with clear message
- [ ] Empty file → rejected with clear message
- [ ] File > 10MB → rejected with clear message
- [ ] Job status visible: pending → running → succeeded
- [ ] Failed job → human-readable error reason shown
- [ ] Malformed JSONL lines → skipped, line number + reason recorded
- [ ] Re-upload same file → 0 inserted, all skipped
- [ ] New content queryable only after status = succeeded
  ```
  Semua scenario di atas ditest via UI Knowledge Uploader
  Lihat langkah detail di Milestone 7
  ```

### Feature 3 — Chatbot / RAG (3 scenarios)
- [ ] Query against ingested content → grounded answer with citations
  ```
  Upload dokumen dulu, tunggu succeeded
  Kirim query yang relevan dengan konten dokumen
  Response harus spesifik + ada citations
  ```
- [ ] Query against empty KB → clear message, no hallucination
  ```bash
  docker compose down -v && docker compose up
  # Tanpa upload apapun, kirim query di chatbot
  # Harus ada pesan jelas bahwa KB kosong
  ```
- [ ] LLM/vector DB error → clear error shown, no partial answer stored
  ```bash
  # Stop rag container saat streaming
  docker stop adamant-code-candidate-assignment-rag-1
  # Kirim pesan di chat UI — error harus tampil
  # Cek DB: partial answer tidak boleh tersimpan sebagai sukses
  docker exec -it adamant-code-candidate-assignment-db-1 psql -U postgres -d ac_dev \
    -c "SELECT role, content FROM messages ORDER BY created_at DESC LIMIT 5;"
  docker start adamant-code-candidate-assignment-rag-1
  ```

### Feature 4 — Conversation Management (6 scenarios)
- [ ] Conversation list visible on return to page
  ```
  Chat beberapa pesan → refresh halaman
  Conversation harus masih ada di list
  ```
- [ ] Previous conversation can be opened and continued
  ```
  Klik conversation lama → history muncul → kirim pesan baru → berhasil
  ```
- [ ] Conversation can be deleted
  ```
  Delete conversation → hilang dari list → refresh → tetap hilang
  ```
- [ ] Conversation can be renamed and name persists
  ```
  Rename → refresh → nama baru masih ada
  ```
- [ ] First message auto-generates conversation name
  ```
  Buat conversation baru (name kosong)
  Kirim pesan pertama, tunggu response selesai
  Lihat list — nama conversation harus ter-generate otomatis
  ```
- [ ] Each assistant message has source references stored in DB
  ```bash
  docker exec -it adamant-code-candidate-assignment-db-1 psql -U postgres -d ac_dev \
    -c "SELECT ms.* FROM message_sources ms JOIN messages m ON ms.message_id = m.id WHERE m.role = 'assistant' LIMIT 5;"
  # Harus ada rows
  ```
