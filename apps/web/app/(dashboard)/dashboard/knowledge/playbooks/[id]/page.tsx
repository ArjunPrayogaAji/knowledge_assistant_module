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
    type?: string;
    last_reviewed?: string;
    owner?: string;
    steps?: Array<{ title: string; description: string }>;
    prerequisites?: string[];
    related_playbooks?: string[];
  };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function PlaybookDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        const res = await apiFetch<{ item: KnowledgeItem }>(`/knowledge/playbooks/${id}`);
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
    <Page title={item?.title ?? "Playbook"} breadcrumbs="Operations / Internal Playbooks / Detail">
      <Card>
        <CardHeader
          title={item?.title ?? "Loading…"}
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
              <div className="flex flex-wrap gap-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{item.category}</span>
                {item.metadata_json.owner && (
                  <span className="text-sm text-slate-600">Owner: {item.metadata_json.owner}</span>
                )}
                {item.metadata_json.last_reviewed && (
                  <span className="text-sm text-slate-600">Last reviewed: {item.metadata_json.last_reviewed}</span>
                )}
              </div>

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">{tag}</span>
                  ))}
                </div>
              )}

              {item.metadata_json.prerequisites && item.metadata_json.prerequisites.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Prerequisites</h3>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {item.metadata_json.prerequisites.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-2">Content</h3>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{item.body}</pre>
              </div>

              {item.metadata_json.steps && item.metadata_json.steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Steps</h3>
                  <div className="space-y-3">
                    {item.metadata_json.steps.map((step, i) => (
                      <div key={i} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                            {i + 1}
                          </span>
                          <h4 className="font-medium text-sm">{step.title}</h4>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 ml-8">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.metadata_json.related_playbooks && item.metadata_json.related_playbooks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Related Playbooks</h3>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {item.metadata_json.related_playbooks.map((p, i) => (
                      <li key={i}>{p}</li>
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
