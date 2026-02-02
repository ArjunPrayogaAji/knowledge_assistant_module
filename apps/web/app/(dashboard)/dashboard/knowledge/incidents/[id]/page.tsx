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
    severity?: string;
    status?: string;
    duration_minutes?: number;
    impact?: string;
    root_cause?: string;
    remediation?: string;
    follow_ups?: string[];
    timeline?: Array<{ time: string; event: string }>;
  };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        const res = await apiFetch<{ item: KnowledgeItem }>(`/knowledge/incidents/${id}`);
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

  const severityColor = (sev?: string) => {
    switch (sev) {
      case "critical": return "bg-red-100 text-red-700";
      case "major": return "bg-orange-100 text-orange-700";
      case "minor": return "bg-yellow-100 text-yellow-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <Page title={item?.title ?? "Incident"} breadcrumbs="Operations / Incidents & Postmortems / Detail">
      <Card>
        <CardHeader
          title={item?.title ?? "Loading…"}
          subtitle={item ? `${item.category} • ${new Date(item.updated_at).toLocaleString()}` : ""}
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
                <span className={`rounded px-2 py-0.5 text-xs ${severityColor(item.metadata_json.severity)}`}>
                  {item.metadata_json.severity || "Unknown"} severity
                </span>
                {item.metadata_json.duration_minutes && (
                  <span className="text-sm text-slate-600">Duration: {item.metadata_json.duration_minutes} minutes</span>
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
                <h3 className="text-sm font-medium mb-2">Summary</h3>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{item.body}</pre>
              </div>

              {item.metadata_json.impact && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Impact</h3>
                  <p className="text-sm text-slate-700">{item.metadata_json.impact}</p>
                </div>
              )}

              {item.metadata_json.timeline && item.metadata_json.timeline.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Timeline</h3>
                  <div className="border-l-2 border-slate-200 pl-4 space-y-2">
                    {item.metadata_json.timeline.map((entry, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-mono text-slate-500">{entry.time}</span>
                        <span className="mx-2">—</span>
                        <span className="text-slate-700">{entry.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.metadata_json.root_cause && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Root Cause</h3>
                  <p className="text-sm text-slate-700 bg-red-50 p-3 rounded">{item.metadata_json.root_cause}</p>
                </div>
              )}

              {item.metadata_json.remediation && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Remediation</h3>
                  <p className="text-sm text-slate-700 bg-green-50 p-3 rounded">{item.metadata_json.remediation}</p>
                </div>
              )}

              {item.metadata_json.follow_ups && item.metadata_json.follow_ups.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Follow-ups</h3>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {item.metadata_json.follow_ups.map((fu, i) => (
                      <li key={i}>{fu}</li>
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
