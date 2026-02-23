"""
apps/rag/main.py — Knowledge Assistant RAG Service

Endpoints:
  GET  /health      — Docker healthcheck
  POST /ingest      — JSONL chunk ingestion with parent-child chunking
  POST /chat        — Hybrid-RAG chat, streams via SSE
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
import uuid
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    PointStruct,
    SparseIndexParams,
    SparseVector,
    SparseVectorParams,
    VectorParams,
)

load_dotenv()

# ─── Constants ────────────────────────────────────────────────────────────────

COLLECTION = "document_chunks"
EMBED_MODEL = "gemini-embedding-001"
LLM_MODEL = "gemini-2.5-flash"
VECTOR_SIZE = 3072
CHILD_MAX_WORDS = 250  # target child chunk size
EMBED_BATCH_SIZE = 50  # max texts per Gemini embed call

# ─── Global clients (initialised in lifespan) ────────────────────────────────

qdrant: AsyncQdrantClient | None = None
gemini: genai.Client | None = None


# ─── Utilities ────────────────────────────────────────────────────────────────


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def compute_sparse_vector(text: str) -> tuple[list[int], list[float]]:
    """
    Token-frequency sparse vector for BM25-style retrieval.
    Uses deterministic hashing to map tokens → stable dimension indices.
    """
    tokens = re.findall(r"\b[a-z]{2,}\b", text.lower())
    freq = Counter(tokens)
    total = max(sum(freq.values()), 1)

    seen: set[int] = set()
    indices: list[int] = []
    values: list[float] = []

    for token, count in freq.items():
        # Deterministic index in a 500 000-dim sparse space
        idx = int(hashlib.md5(token.encode()).hexdigest(), 16) % 500_000
        if idx not in seen:
            seen.add(idx)
            indices.append(idx)
            values.append(round(count / total, 6))

    return indices, values


def create_child_chunks(text: str) -> list[str]:
    """
    Split text into child chunks of ≤ CHILD_MAX_WORDS words.
    Prefers paragraph boundaries; falls back to word-count splitting.
    """
    # Try paragraph-based splitting first
    paragraphs = [p.strip() for p in re.split(r"\n\n+", text) if p.strip()]

    chunks: list[str] = []
    current: list[str] = []
    current_words = 0

    for para in paragraphs:
        para_words = len(para.split())
        if current_words + para_words > CHILD_MAX_WORDS and current:
            chunks.append("\n\n".join(current))
            current = [para]
            current_words = para_words
        else:
            current.append(para)
            current_words += para_words

    if current:
        chunks.append("\n\n".join(current))

    # If the whole text was a single paragraph, split by word count
    if not chunks or (len(chunks) == 1 and len(text.split()) > CHILD_MAX_WORDS * 2):
        words = text.split()
        step = CHILD_MAX_WORDS
        overlap = 40
        chunks = []
        i = 0
        while i < len(words):
            chunks.append(" ".join(words[i : i + step]))
            i += step - overlap

    return chunks if chunks else [text]


async def embed_batch(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """
    Batch-embed texts using Gemini gemini-embedding-001 (3072-dim).
    Uses the new google-genai SDK's native async client — no thread pool needed.
    """
    assert gemini is not None
    if not texts:
        return []

    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[i : i + EMBED_BATCH_SIZE]
        response = await gemini.aio.models.embed_content(
            model=EMBED_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(task_type=task_type),
        )
        for embedding_obj in response.embeddings:
            all_embeddings.append(embedding_obj.values)

    return all_embeddings


async def ensure_collection() -> None:
    """Create the document_chunks collection if it does not already exist."""
    assert qdrant is not None
    exists = await qdrant.collection_exists(COLLECTION)
    if not exists:
        await qdrant.create_collection(
            collection_name=COLLECTION,
            vectors_config={"dense": VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)},
            sparse_vectors_config={
                "sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False))
            },
        )


# ─── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global qdrant, gemini

    gemini = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

    qdrant = AsyncQdrantClient(url=os.environ.get("QDRANT_URL", "http://localhost:6333"))

    await ensure_collection()

    yield

    await qdrant.close()


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="Knowledge Assistant RAG Service", lifespan=lifespan)


# ─── Request / Response models ────────────────────────────────────────────────


class IngestLine(BaseModel):
    content: str
    source_id: str
    module: str
    model_config = {"extra": "allow"}  # accept any additional fields from the JSONL


class IngestRequest(BaseModel):
    job_id: str
    filename: str
    lines: list[IngestLine]


class IngestResponse(BaseModel):
    inserted: int
    updated: int
    skipped: int


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    query: str
    conversation_history: list[ChatMessage] = []


# ─── Endpoints ────────────────────────────────────────────────────────────────


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest", response_model=IngestResponse)
async def ingest(req: IngestRequest) -> IngestResponse:
    """
    For each line:
      - Create 1 parent chunk (full content)
      - Create N child chunks (semantic sub-chunks)
    Batch-embed all chunks, then upsert to Qdrant with deduplication by content_hash.
    """
    assert qdrant is not None

    await ensure_collection()

    now = datetime.now(timezone.utc).isoformat()

    # ── Build all chunks ───────────────────────────────────────────────────────
    # Each entry: (point_id, content_hash, content, payload_dict)
    all_chunks: list[tuple[str, str, str, dict[str, Any]]] = []

    for line in req.lines:
        parent_key = f"{line.source_id}:parent"
        parent_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, parent_key))
        parent_hash = sha256(line.content)

        parent_payload: dict[str, Any] = {
            "content": line.content,
            "content_hash": parent_hash,
            "source_id": line.source_id,
            "filename": req.filename,
            "module": line.module,
            "chunk_type": "parent",
            "parent_id": None,
            "ingested_at": now,
            "job_id": req.job_id,
        }
        all_chunks.append((parent_id, parent_hash, line.content, parent_payload))

        children = create_child_chunks(line.content)
        for idx, child_text in enumerate(children):
            child_key = f"{line.source_id}:child:{idx}"
            child_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, child_key))
            child_hash = sha256(child_text)

            child_payload: dict[str, Any] = {
                "content": child_text,
                "content_hash": child_hash,
                "source_id": line.source_id,
                "filename": req.filename,
                "module": line.module,
                "chunk_type": "child",
                "parent_id": parent_id,
                "ingested_at": now,
                "job_id": req.job_id,
            }
            all_chunks.append((child_id, child_hash, child_text, child_payload))

    if not all_chunks:
        return IngestResponse(inserted=0, updated=0, skipped=0)

    # ── Batch look up existing points by deterministic ID ─────────────────────
    point_ids = [c[0] for c in all_chunks]
    existing_points = await qdrant.retrieve(
        collection_name=COLLECTION,
        ids=point_ids,
        with_payload=["content_hash"],
    )
    existing_hash_by_id: dict[str, str] = {
        str(p.id): p.payload.get("content_hash", "") for p in existing_points
    }

    # ── Classify each chunk ───────────────────────────────────────────────────
    to_upsert: list[tuple[str, str, dict[str, Any]]] = []  # (point_id, content, payload)
    inserted = updated = skipped = 0

    for point_id, content_hash, content, payload in all_chunks:
        existing_hash = existing_hash_by_id.get(point_id)
        if existing_hash is None:
            inserted += 1
            to_upsert.append((point_id, content, payload))
        elif existing_hash == content_hash:
            skipped += 1
        else:
            updated += 1
            to_upsert.append((point_id, content, payload))

    if not to_upsert:
        return IngestResponse(inserted=inserted, updated=updated, skipped=skipped)

    # ── Batch embed all chunks that need upsert ───────────────────────────────
    texts_to_embed = [c[1] for c in to_upsert]
    embeddings = await embed_batch(texts_to_embed, task_type="retrieval_document")

    # ── Build PointStructs and upsert ─────────────────────────────────────────
    points: list[PointStruct] = []
    for (point_id, content, payload), dense_vec in zip(to_upsert, embeddings):
        sparse_indices, sparse_values = compute_sparse_vector(content)
        points.append(
            PointStruct(
                id=point_id,
                vector={
                    "dense": dense_vec,
                    "sparse": SparseVector(indices=sparse_indices, values=sparse_values),
                },
                payload=payload,
            )
        )

    # Upsert in batches of 100
    UPSERT_BATCH = 100
    for i in range(0, len(points), UPSERT_BATCH):
        await qdrant.upsert(collection_name=COLLECTION, points=points[i : i + UPSERT_BATCH])

    return IngestResponse(inserted=inserted, updated=updated, skipped=skipped)


@app.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    """
    Hybrid-RAG chat: embed query → parallel dense+sparse search → fetch parents
    → build prompt → stream Gemini response → final citations SSE event.
    """
    return StreamingResponse(
        _chat_stream(req.query, req.conversation_history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


async def _chat_stream(
    query: str,
    history: list[ChatMessage],
) -> AsyncIterator[str]:
    assert qdrant is not None
    assert gemini is not None

    # ── 1. Embed the query ────────────────────────────────────────────────────
    q_embeddings = await embed_batch([query], task_type="RETRIEVAL_QUERY")
    q_dense = q_embeddings[0]
    q_sparse_indices, q_sparse_values = compute_sparse_vector(query)

    child_filter = Filter(
        must=[FieldCondition(key="chunk_type", match=MatchValue(value="child"))]
    )

    # ── 2. Parallel dense + sparse search ────────────────────────────────────
    dense_task = qdrant.query_points(
        collection_name=COLLECTION,
        query=q_dense,
        using="dense",
        query_filter=child_filter,
        limit=5,
        with_payload=True,
    )
    sparse_task = qdrant.query_points(
        collection_name=COLLECTION,
        query=SparseVector(indices=q_sparse_indices, values=q_sparse_values),
        using="sparse",
        query_filter=child_filter,
        limit=5,
        with_payload=True,
    )

    dense_response, sparse_response = await asyncio.gather(dense_task, sparse_task)
    dense_results = dense_response.points
    sparse_results = sparse_response.points

    # ── 3. Merge + deduplicate (dense first for score priority) ───────────────
    seen_ids: set[str] = set()
    child_hits: list[Any] = []
    for hit in [*dense_results, *sparse_results]:
        hit_id = str(hit.id)
        if hit_id not in seen_ids:
            seen_ids.add(hit_id)
            child_hits.append(hit)
        if len(child_hits) == 5:
            break

    # ── 4. Fetch parent chunks for richer LLM context ─────────────────────────
    parent_ids = [
        h.payload.get("parent_id")
        for h in child_hits
        if h.payload and h.payload.get("parent_id")
    ]
    parents: list[Any] = []
    if parent_ids:
        parents = await qdrant.retrieve(
            collection_name=COLLECTION,
            ids=list(dict.fromkeys(parent_ids)),  # deduplicate, preserve order
            with_payload=True,
        )

    # ── 5. Build prompt ────────────────────────────────────────────────────────
    context_parts: list[str] = []
    for p in parents:
        if p.payload:
            fname = p.payload.get("filename", "")
            module = p.payload.get("module", "")
            content = p.payload.get("content", "")
            context_parts.append(f"[{fname} / {module}]\n{content}")

    if not context_parts:
        for hit in child_hits:
            if hit.payload:
                context_parts.append(hit.payload.get("content", ""))

    context = "\n\n---\n\n".join(context_parts)

    history_text = ""
    for turn in history[-6:]:
        history_text += f"{turn.role.capitalize()}: {turn.content}\n"

    if context:
        prompt = (
            "You are a helpful knowledge assistant. Answer the user's question "
            "based ONLY on the provided context. If the context lacks relevant "
            "information, say so clearly and suggest what kind of documents might help.\n\n"
            f"Context:\n{context}\n\n"
            f"{history_text}"
            f"User: {query}\nAssistant:"
        )
    else:
        prompt = (
            "You are a helpful knowledge assistant. The knowledge base appears to be "
            "empty or contains no content relevant to this question. Let the user know "
            "clearly and suggest they upload relevant documents first.\n\n"
            f"{history_text}"
            f"User: {query}\nAssistant:"
        )

    # ── 6. Stream LLM response ─────────────────────────────────────────────────
    try:
        stream = await gemini.aio.models.generate_content_stream(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )
        async for chunk in stream:
            if chunk.text:
                payload = json.dumps({"type": "text", "content": chunk.text})
                yield f"data: {payload}\n\n"
    except Exception as exc:
        error_payload = json.dumps({"type": "error", "message": str(exc)})
        yield f"data: {error_payload}\n\n"
        return

    # ── 7. Yield citations as final SSE event ─────────────────────────────────
    citations = [
        {
            "qdrant_chunk_id": str(hit.id),
            "source_id": hit.payload.get("source_id") if hit.payload else None,
            "filename": hit.payload.get("filename") if hit.payload else None,
            "module": hit.payload.get("module") if hit.payload else None,
            "content_preview": (hit.payload.get("content", "")[:200] if hit.payload else ""),
        }
        for hit in child_hits
        if hit.payload
    ]
    citations_payload = json.dumps({"type": "citations", "citations": citations})
    yield f"data: {citations_payload}\n\n"
