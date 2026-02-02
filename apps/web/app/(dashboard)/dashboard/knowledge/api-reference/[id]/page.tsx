"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "../../../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../../../components/ui/Card";
import { Button } from "../../../../../../components/ui/Button";
import { apiFetch } from "../../../../../../lib/apiClient";

type KnowledgeItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  body: string;
  metadata_json: {
    method?: string;
    path?: string;
    request_schema?: object;
    response_schema?: object;
    example_request?: object;
    example_response?: object;
  };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function ApiReferenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        const res = await apiFetch<{ item: KnowledgeItem }>(`/knowledge/api_reference/${id}`);
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
    <Page title={item?.title ?? "API Endpoint"} breadcrumbs="Knowledge Base / API Reference / Detail">
      <Card>
        <CardHeader
          title={item?.title ?? "Loading…"}
          subtitle={item ? `${item.metadata_json.method || ""} ${item.metadata_json.path || ""} • Updated: ${new Date(item.updated_at).toLocaleString()}` : ""}
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
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{item.body}</pre>
              </div>

              {item.metadata_json.example_request && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Example Request</h3>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(item.metadata_json.example_request, null, 2)}
                  </pre>
                </div>
              )}

              {item.metadata_json.example_response && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Example Response</h3>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(item.metadata_json.example_response, null, 2)}
                  </pre>
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
