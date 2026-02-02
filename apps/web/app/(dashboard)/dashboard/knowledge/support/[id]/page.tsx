"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "../../../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../../../components/ui/Card";
import { Button } from "../../../../../../components/ui/Button";
import { apiFetch } from "../../../../../../lib/apiClient";

type Message = {
  role: "customer" | "agent";
  content: string;
  timestamp?: string;
};

type KnowledgeItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  body: string;
  metadata_json: {
    resolved?: boolean;
    ticket_id?: string;
    resolution?: string;
    messages?: Message[];
  };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function SupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch<{ item: KnowledgeItem }>(`/knowledge/support/${id}`);
        if (!mounted) return;
        setItem(res.item);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  return (
    <Page title={item?.title ?? "Support Conversation"} breadcrumbs="Operations / Support Conversations / Detail">
      <Card>
        <CardHeader
          title={item?.title ?? "Loading…"}
          subtitle={item ? `${item.category} • ${item.metadata_json.ticket_id ? `#${item.metadata_json.ticket_id}` : ""} • ${new Date(item.updated_at).toLocaleString()}` : ""}
        />
        <CardBody>
          {loading ? (
            <div className="py-6 text-sm text-slate-500">Loading…</div>
          ) : error ? (
            <div className="py-6 text-sm text-red-600">{error}</div>
          ) : !item ? (
            <div className="py-6 text-sm text-slate-500">Not found</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                {item.metadata_json.resolved ? (
                  <span className="rounded bg-green-100 text-green-700 px-2 py-0.5 text-xs">Resolved</span>
                ) : (
                  <span className="rounded bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs">Open</span>
                )}
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{item.category}</span>
              </div>

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">{tag}</span>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-2">Summary</h3>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{item.body}</pre>
              </div>

              {item.metadata_json.messages && item.metadata_json.messages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Conversation Thread</h3>
                  <div className="space-y-3">
                    {item.metadata_json.messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg text-sm ${
                          msg.role === "customer"
                            ? "bg-slate-100 ml-0 mr-12"
                            : "bg-blue-50 ml-12 mr-0"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">
                            {msg.role === "customer" ? "Customer" : "Support Agent"}
                          </span>
                          {msg.timestamp && (
                            <span className="text-xs text-slate-400">{msg.timestamp}</span>
                          )}
                        </div>
                        <p className="text-slate-700">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.metadata_json.resolution && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Resolution</h3>
                  <p className="text-sm text-slate-700 bg-green-50 p-3 rounded">{item.metadata_json.resolution}</p>
                </div>
              )}

              <div className="pt-4 border-t flex items-center gap-2">
                <Button variant="secondary" onClick={() => router.back()}>Back</Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
