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
  metadata_json: Record<string, unknown>;
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        const res = await apiFetch<{ item: KnowledgeItem }>(`/knowledge/policies/${id}`);
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
    <Page title={item?.title ?? "Policy"} breadcrumbs="Knowledge Base / Policies & Compliance / Detail">
      <Card>
        <CardHeader
          title={item?.title ?? "Loading…"}
          subtitle={item ? `Category: ${item.category} • Updated: ${new Date(item.updated_at).toLocaleString()}` : ""}
        />
        <CardBody>
          {loading ? (
            <div className="py-6 text-sm text-slate-500">Loading…</div>
          ) : error ? (
            <div className="py-6 text-sm text-red-600">{error}</div>
          ) : !item ? (
            <div className="py-6 text-sm text-slate-500">Not found</div>
          ) : (
            <div className="space-y-4">
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="prose prose-slate max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{item.body}</pre>
              </div>
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
