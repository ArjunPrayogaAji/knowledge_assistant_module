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
    flag_key?: string;
    rollout_percentage?: number;
    status?: string;
    target_segment?: string;
    notes?: string;
    created_by?: string;
    variants?: Array<{ name: string; weight: number }>;
  };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function FeatureFlagDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        const res = await apiFetch<{ item: KnowledgeItem }>(`/knowledge/feature_flags/${id}`);
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

  const statusColor = (status?: string) => {
    switch (status) {
      case "enabled": return "bg-green-100 text-green-700";
      case "disabled": return "bg-slate-100 text-slate-700";
      case "partial": return "bg-yellow-100 text-yellow-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <Page title={item?.title ?? "Feature Flag"} breadcrumbs="Product / Feature Flags / Detail">
      <Card>
        <CardHeader
          title={item?.metadata_json.flag_key || item?.title || "Loading…"}
          subtitle={item ? `Updated: ${new Date(item.updated_at).toLocaleString()}` : ""}
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
                <span className={`rounded px-2 py-0.5 text-xs ${statusColor(item.metadata_json.status)}`}>
                  {item.metadata_json.status || "Unknown"}
                </span>
                {item.metadata_json.rollout_percentage != null && (
                  <span className="text-sm font-mono text-slate-600">
                    {item.metadata_json.rollout_percentage}% rollout
                  </span>
                )}
              </div>

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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium mb-2">Target Segment</h3>
                  <p className="text-sm text-slate-700">{item.metadata_json.target_segment || "All users"}</p>
                </div>
                {item.metadata_json.created_by && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Created By</h3>
                    <p className="text-sm text-slate-700">{item.metadata_json.created_by}</p>
                  </div>
                )}
              </div>

              {item.metadata_json.variants && item.metadata_json.variants.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Variants</h3>
                  <div className="space-y-2">
                    {item.metadata_json.variants.map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                        <span className="font-mono">{v.name}</span>
                        <span className="text-slate-600">{v.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.metadata_json.notes && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Notes</h3>
                  <p className="text-sm text-slate-700 bg-amber-50 p-3 rounded">{item.metadata_json.notes}</p>
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
