"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Page } from "../../../../components/layout/Page";
import { Button } from "../../../../components/ui/Button";
import { apiFetch, apiBaseUrl } from "../../../../lib/apiClient";
import type { MeUser } from "../../../../components/auth/RequireAuth";
import {
  Plus,
  Trash2,
  Send,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Loader2,
  UploadCloud,
  FileText,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "chatbot" | "uploader";

type Conversation = {
  id: string;
  name: string | null;
  created_at: string;
};

type Source = {
  id: string;
  qdrant_chunk_id: string;
  metadata: {
    source_id?: string;
    filename?: string;
    module?: string;
    content_preview?: string;
  };
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  sources?: Source[];
};

type IngestionJob = {
  id: string;
  status: "pending" | "running" | "succeeded" | "failed";
  filename: string;
  inserted: number;
  updated: number;
  skipped: number;
  error_details:
  | null
  | {
    malformed_lines?: { line: number; reason: string }[];
    rag_error?: string;
    message?: string;
  };
  created_at: string;
  updated_at: string;
};

type Citation = {
  qdrant_chunk_id: string;
  source_id?: string;
  filename?: string;
  module?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── CitationList ──────────────────────────────────────────────────────────────

function CitationList({ citations }: { citations: Citation[] | Source[] }) {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;

  // Normalise: handle both Citation (from streaming) and Source (from DB load)
  const items = citations.map((c) => {
    if ("metadata" in c) {
      const s = c as Source;
      return {
        qdrant_chunk_id: s.qdrant_chunk_id,
        source_id: s.metadata?.source_id,
        filename: s.metadata?.filename,
        module: s.metadata?.module,
      };
    }
    return c as Citation;
  });

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {items.length} source{items.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {items.map((c, i) => (
            <div
              key={c.qdrant_chunk_id ?? i}
              className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
            >
              {c.filename && (
                <span className="font-medium text-slate-700">{c.filename}</span>
              )}
              {c.module && (
                <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-slate-500">
                  {c.module}
                </span>
              )}
              {c.source_id && (
                <div className="mt-0.5 font-mono text-slate-400">
                  {c.source_id}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isStreaming,
}: {
  msg: Message & { streamingCitations?: Citation[] };
  isStreaming?: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cx("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cx("max-w-[75%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cx(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-slate-900 text-white rounded-br-sm"
              : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
          )}
        >
          {msg.content}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-0.5 bg-slate-400 animate-pulse align-text-bottom" />
          )}
        </div>
        {!isUser && (
          <CitationList
            citations={
              (msg.streamingCitations ?? msg.sources ?? []) as Citation[]
            }
          />
        )}
      </div>
    </div>
  );
}

// ─── ChatbotPanel ─────────────────────────────────────────────────────────────

function ChatbotPanel() {
  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  // Streaming
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);

  // Input
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Scroll anchor
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load conversations ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    apiFetch<{ conversations: Conversation[] }>(
      "/knowledge-assistant/conversations"
    )
      .then((d) => {
        if (!mounted) return;
        setConversations(d.conversations);
        if (d.conversations.length > 0) setSelectedId(d.conversations[0].id);
      })
      .catch(() => { })
      .finally(() => {
        if (mounted) setConvsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ── Load messages when selection changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setMsgsLoading(true);
    setError(null);
    apiFetch<{ messages: Message[] }>(
      `/knowledge-assistant/conversations/${selectedId}/messages`
    )
      .then((d) => setMessages(d.messages))
      .catch((e) => setError(e.message))
      .finally(() => setMsgsLoading(false));
  }, [selectedId]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // ── Textarea auto-resize ───────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // ── Rename focus ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createConversation = useCallback(async () => {
    try {
      // POST /conversations returns { conversation_id } directly — not wrapped
      // in { data: ... }, so we bypass apiFetch and read the JSON body ourselves.
      const resp = await fetch(
        `${apiBaseUrl()}/knowledge-assistant/conversations`,
        { method: "POST", credentials: "include", headers: { "content-type": "application/json" } }
      );
      if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
      const json = (await resp.json()) as { conversation_id: string };
      const newConv: Conversation = {
        id: json.conversation_id,
        name: "New Conversation",
        created_at: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setSelectedId(json.conversation_id);
      setMessages([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create conversation");
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/knowledge-assistant/conversations/${id}`, {
          method: "DELETE",
        });
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (selectedId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          setSelectedId(remaining[0]?.id ?? null);
          setMessages([]);
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to delete conversation"
        );
      }
    },
    [selectedId, conversations]
  );

  const commitRename = useCallback(
    async (id: string) => {
      const name = renameValue.trim();
      if (!name) {
        setRenamingId(null);
        return;
      }
      setRenamingId(null);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name } : c))
      );
      try {
        await apiFetch(`/knowledge-assistant/conversations/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
      } catch {
        // Revert optimistic update on failure
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, name: c.name } : c
          )
        );
      }
    },
    [renameValue]
  );

  const sendMessage = useCallback(async () => {
    const query = input.trim();
    if (!query || !selectedId || streaming) return;

    setInput("");
    setError(null);

    // Optimistic user message
    const tempId = `tmp-${Date.now()}`;
    const userMsg: Message = {
      id: tempId,
      role: "user",
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setStreaming(true);
    setStreamingText("");
    setStreamingCitations([]);

    try {
      const resp = await fetch(
        `${apiBaseUrl()}/knowledge-assistant/conversations/${selectedId}/chat`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            conversation_history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        throw new Error(`Server returned ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let fullText = "";
      let finalCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as {
              type: string;
              content?: string;
              citations?: Citation[];
              message?: string;
            };
            if (evt.type === "text" && evt.content) {
              fullText += evt.content;
              setStreamingText(fullText);
            } else if (evt.type === "citations" && evt.citations) {
              finalCitations = evt.citations;
              setStreamingCitations(finalCitations);
            } else if (evt.type === "error") {
              throw new Error(evt.message ?? "Stream error");
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue; // malformed SSE line
            throw parseErr;
          }
        }
      }

      // Commit the completed assistant message
      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: fullText,
        created_at: new Date().toISOString(),
        sources: finalCitations.map((c, i) => ({
          id: `src-${i}`,
          qdrant_chunk_id: c.qdrant_chunk_id,
          metadata: {
            source_id: c.source_id,
            filename: c.filename,
            module: c.module,
          },
        })),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-update conversation name in list if the server renamed it
      // (fetch latest conversations to reflect auto-name)
      apiFetch<{ conversations: Conversation[] }>(
        "/knowledge-assistant/conversations"
      )
        .then((d) => setConversations(d.conversations))
        .catch(() => { });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStreaming(false);
      setStreamingText("");
      setStreamingCitations([]);
    }
  }, [input, selectedId, streaming, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px]">
      {/* ── Left panel: conversation list ────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-200">
          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-2 text-xs"
            onClick={createConversation}
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="flex items-center justify-center py-8 text-xs text-slate-400">
              Loading…
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
              <MessageSquare className="h-6 w-6 text-slate-300" />
              <p className="text-xs text-slate-400">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    if (renamingId !== conv.id) setSelectedId(conv.id);
                  }}
                  className={cx(
                    "group relative flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none border-b border-slate-100 transition-colors",
                    isSelected
                      ? "bg-slate-100 text-slate-900"
                      : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    {renamingId === conv.id ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(conv.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-900 outline-none focus:border-slate-500"
                      />
                    ) : (
                      <div
                        className="truncate text-xs font-medium"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(conv.id);
                          setRenameValue(conv.name ?? "New Conversation");
                        }}
                        title="Double-click to rename"
                      >
                        {conv.name ?? "New Conversation"}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(conv.created_at)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: message thread + input ──────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedId === null ? (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">
                No conversation selected
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Create a new chat or select one from the left
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
              {msgsLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-400 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading messages…
                </div>
              ) : messages.length === 0 && !streaming ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">
                      No messages yet
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Ask a question about the knowledge base
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}

                  {/* Streaming bubble */}
                  {streaming && (
                    <MessageBubble
                      msg={{
                        id: "streaming",
                        role: "assistant",
                        content: streamingText || "",
                        created_at: new Date().toISOString(),
                        streamingCitations: streamingCitations.length
                          ? streamingCitations
                          : undefined,
                      } as Message & { streamingCitations?: Citation[] }}
                      isStreaming={true}
                    />
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-4 mb-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 flex items-center justify-between gap-3">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="shrink-0 text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Input bar */}
            <div className="border-t border-slate-200 px-4 py-3 flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
                className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none disabled:opacity-60 transition-colors"
                style={{ maxHeight: 160 }}
              />
              <Button
                variant="primary"
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="shrink-0 h-9 w-9 p-0 flex items-center justify-center"
                title="Send"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ForbiddenPanel ───────────────────────────────────────────────────────────

function ForbiddenPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
        <span className="text-2xl">🔒</span>
      </div>
      <div>
        <div className="text-base font-semibold text-slate-900">
          Access Denied
        </div>
        <div className="mt-1 text-sm text-slate-500">
          The Knowledge Uploader is only available to admins.
          <br />
          Contact your administrator to request access.
        </div>
      </div>
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
        403 — Forbidden
      </div>
    </div>
  );
}

// ─── UploaderPanel ────────────────────────────────────────────────────────────

const MAX_BYTES = 10 * 1024 * 1024;
const VALID_EXTS = ["jsonl", "ndjson"];

function validateFile(f: File): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!VALID_EXTS.includes(ext)) return "Only .jsonl or .ndjson files are accepted.";
  if (f.size === 0) return "File is empty.";
  if (f.size > MAX_BYTES) return "File exceeds 10 MB limit.";
  return null;
}

function StatusBadge({ status }: { status: IngestionJob["status"] }) {
  const map = {
    pending: { cls: "bg-slate-100 text-slate-600", label: "Pending", Icon: Loader2, spin: false },
    running: { cls: "bg-blue-50 text-blue-700", label: "Running", Icon: Loader2, spin: true },
    succeeded: { cls: "bg-green-50 text-green-700", label: "Succeeded", Icon: CheckCircle2, spin: false },
    failed: { cls: "bg-red-50 text-red-700", label: "Failed", Icon: AlertCircle, spin: false },
  };
  const { cls, label, Icon, spin } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      <Icon className={`h-3.5 w-3.5 ${spin ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function UploaderPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!job) return;
    if (job.status === "succeeded" || job.status === "failed") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(async () => {
      try {
        const d = await apiFetch<{ job: IngestionJob }>(`/knowledge-assistant/jobs/${job.id}`);
        setJob(d.job);
      } catch {
        // silently ignore transient poll errors
      }
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [job?.id, job?.status]);

  // ── File selection ─────────────────────────────────────────────────────────
  function handleFiles(files: FileList | null) {
    setUploadError(null);
    setJob(null);
    const f = files?.[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      setValidationError(err);
      setFile(null);
    } else {
      setValidationError(null);
      setFile(f);
    }
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch(`${apiBaseUrl()}/knowledge-assistant/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await resp.json() as { job_id?: string; error?: { message?: string } };
      if (!resp.ok) {
        throw new Error(json.error?.message ?? `Upload failed (${resp.status})`);
      }
      // Seed initial job state so the panel renders immediately
      setJob({
        id: json.job_id!,
        status: "pending",
        filename: file.name,
        inserted: 0, updated: 0, skipped: 0,
        error_details: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setValidationError(null);
    setUploadError(null);
    setJob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Knowledge Uploader</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Upload a JSONL / NDJSON file. Each line must have <code className="font-mono text-xs bg-slate-100 px-1 rounded">content</code>,{" "}
          <code className="font-mono text-xs bg-slate-100 px-1 rounded">source_id</code>, and{" "}
          <code className="font-mono text-xs bg-slate-100 px-1 rounded">module</code> fields.
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        className={cx(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors select-none",
          isDragging ? "border-slate-400 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jsonl,.ndjson"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <>
            <FileText className="h-8 w-8 text-slate-400" />
            <div className="text-center">
              <div className="text-sm font-medium text-slate-700 truncate max-w-xs">{file.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <span className="text-xs text-slate-400">Click to choose a different file</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-slate-300" />
            <div className="text-center">
              <div className="text-sm font-medium text-slate-700">Drop a file here or click to browse</div>
              <div className="text-xs text-slate-400 mt-0.5">.jsonl or .ndjson — max 10 MB</div>
            </div>
          </>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{validationError}</span>
          <button type="button" onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Upload button */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={!file || uploading || !!job}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
          ) : (
            <><UploadCloud className="h-4 w-4" /> Upload</>
          )}
        </Button>
        {(file || job) && (
          <Button variant="secondary" onClick={reset} disabled={uploading}>
            Clear
          </Button>
        )}
      </div>

      {/* Job status panel */}
      {job && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate">{job.filename}</div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">Job: {job.id}</div>
            </div>
            <StatusBadge status={job.status} />
          </div>

          {/* Counts — show once terminal */}
          {(job.status === "succeeded" || job.status === "failed") && (
            <div className="flex gap-4 px-4 py-3 border-b border-slate-100">
              {([
                { label: "Inserted", value: job.inserted, color: "text-green-700 bg-green-50" },
                { label: "Updated", value: job.updated, color: "text-blue-700 bg-blue-50" },
                { label: "Skipped", value: job.skipped, color: "text-slate-600 bg-slate-100" },
              ] as const).map(({ label, value, color }) => (
                <div key={label} className={`flex-1 rounded-lg px-3 py-2 text-center ${color}`}>
                  <div className="text-lg font-semibold">{value}</div>
                  <div className="text-xs">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Malformed lines table */}
          {job.error_details?.malformed_lines && job.error_details.malformed_lines.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-xs font-medium text-slate-500 mb-2">
                Malformed lines ({job.error_details.malformed_lines.length})
              </div>
              <div className="overflow-x-auto rounded border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium text-slate-500 w-16">Line</th>
                      <th className="text-left px-3 py-1.5 font-medium text-slate-500">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.error_details.malformed_lines.map((m) => (
                      <tr key={m.line} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-mono text-slate-700">{m.line}</td>
                        <td className="px-3 py-1.5 text-slate-600">{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RAG / generic error message */}
          {(job.error_details?.rag_error || job.error_details?.message) && (
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-red-600 mb-1">Error detail</div>
              <pre className="whitespace-pre-wrap rounded bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 font-mono">
                {job.error_details.rag_error ?? job.error_details.message}
              </pre>
            </div>
          )}

          {/* Pending / running message */}
          {(job.status === "pending" || job.status === "running") && (
            <div className="px-4 py-3 text-xs text-slate-400">
              Processing… this page polls automatically every 3 seconds.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function KnowledgeAssistantPage() {
  const [activeTab, setActiveTab] = useState<Tab>("chatbot");
  const [user, setUser] = useState<MeUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    apiFetch<{ user: MeUser }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => { })
      .finally(() => setLoadingUser(false));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "chatbot", label: "Chatbot" },
    { key: "uploader", label: "Knowledge Uploader" },
  ];

  function renderTabContent() {
    if (activeTab === "chatbot") return <ChatbotPanel />;

    if (loadingUser) {
      return (
        <div className="flex items-center justify-center py-24 text-sm text-slate-500">
          Loading…
        </div>
      );
    }

    if (user?.role !== "admin") return <ForbiddenPanel />;
    return <UploaderPanel />;
  }

  return (
    <Page title="Knowledge Assistant" breadcrumbs="Dashboard / Knowledge Assistant">
      {/* Tab bar */}
      <div className="border-b border-slate-200 mb-4">
        <nav className="-mb-px flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cx(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {renderTabContent()}
      </div>
    </Page>
  );
}
