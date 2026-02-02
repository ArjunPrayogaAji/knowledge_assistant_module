"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "../../../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../../../components/ui/Card";
import { Button } from "../../../../../../components/ui/Button";
import { apiFetch } from "../../../../../../lib/apiClient";

type Property = {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
};

type KnowledgeItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  body: string;
  metadata_json: {
    event_name?: string;
    properties?: Property[];
    when_fired?: string;
    sample_payload?: object;
    dashboards?: string[];
  };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function AnalyticsEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        const res = await apiFetch<{ item: KnowledgeItem }>(`/knowledge/analytics_events/${id}`);
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
    <Page title={item?.title ?? "Analytics Event"} breadcrumbs="Product / Analytics Events / Detail">
      <Card>
        <CardHeader
          title={item?.metadata_json.event_name || item?.title || "Loading…"}
          subtitle={item ? `${item.category} • Updated: ${new Date(item.updated_at).toLocaleString()}` : ""}
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
                    <span key={tag} className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">{tag}</span>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{item.body}</pre>
              </div>

              {item.metadata_json.when_fired && (
                <div>
                  <h3 className="text-sm font-medium mb-2">When Fired</h3>
                  <p className="text-sm text-slate-700">{item.metadata_json.when_fired}</p>
                </div>
              )}

              {item.metadata_json.properties && item.metadata_json.properties.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Properties Schema</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Property</th>
                          <th className="text-left px-3 py-2 font-medium">Type</th>
                          <th className="text-left px-3 py-2 font-medium">Required</th>
                          <th className="text-left px-3 py-2 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.metadata_json.properties.map((p, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                            <td className="px-3 py-2 text-slate-600">{p.type}</td>
                            <td className="px-3 py-2">{p.required ? "Yes" : "No"}</td>
                            <td className="px-3 py-2 text-slate-600">{p.description || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {item.metadata_json.sample_payload && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Sample Payload</h3>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(item.metadata_json.sample_payload, null, 2)}
                  </pre>
                </div>
              )}

              {item.metadata_json.dashboards && item.metadata_json.dashboards.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Used in Dashboards</h3>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {item.metadata_json.dashboards.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
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
