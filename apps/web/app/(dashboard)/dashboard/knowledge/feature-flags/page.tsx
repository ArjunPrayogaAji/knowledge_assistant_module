"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Page } from "../../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Pagination } from "../../../../../components/ui/Pagination";
import { Table, TableInner, Td, Th } from "../../../../../components/ui/Table";
import { Button } from "../../../../../components/ui/Button";
import { apiFetch, apiBaseUrl } from "../../../../../lib/apiClient";

type KnowledgeItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  body: string;
  metadata_json: { flag_key?: string; rollout_percentage?: number; status?: string; target_segment?: string };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function FeatureFlagsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"updated_at_desc" | "updated_at_asc" | "title_asc" | "title_desc">("title_asc");

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const s = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
    if (query) s.set("query", query);
    if (category) s.set("category", category);
    return s.toString();
  }, [page, pageSize, sort, query, category]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await apiFetch<{ items: KnowledgeItem[]; total: number }>(`/knowledge/feature_flags?${qs}`);
        if (!mounted) return;
        setItems(res.items);
        setTotal(res.total);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [qs]);

  const handleExport = () => {
    const exportQs = new URLSearchParams();
    if (category) exportQs.set("category", category);
    window.open(`${apiBaseUrl()}/exports/feature_flags?${exportQs.toString()}`, "_blank");
  };

  const statusColor = (status?: string) => {
    switch (status) {
      case "enabled": return "bg-green-100 text-green-700";
      case "disabled": return "bg-slate-100 text-slate-700";
      case "partial": return "bg-yellow-100 text-yellow-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <Page
      title="Feature Flags"
      breadcrumbs="Product / Feature Flags"
      primaryAction={<Button onClick={handleExport}>Export JSONL</Button>}
    >
      <Card>
        <CardHeader title="Feature Flags & Experiments" subtitle="Flag configurations, rollout percentages, target segments, and status" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value); }}
              placeholder="Search flags…"
              className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(e) => { setPage(1); setCategory(e.target.value); }}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="">All statuses</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="partial">Partial Rollout</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="title_asc">Name (A→Z)</option>
              <option value="title_desc">Name (Z→A)</option>
              <option value="updated_at_desc">Recently Updated</option>
              <option value="updated_at_asc">Oldest Updated</option>
            </select>
          </div>

          <div className="mt-3">
            {error ? (
              <div className="py-6 text-sm text-red-600">{error}</div>
            ) : (
              <Table>
                <TableInner>
                  <thead>
                    <tr>
                      <Th>Flag</Th>
                      <Th>Status</Th>
                      <Th>Rollout</Th>
                      <Th>Segment</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><Td colSpan={4} className="text-slate-500">Loading…</Td></tr>
                    ) : items.length === 0 ? (
                      <tr><Td colSpan={4} className="text-slate-500">No flags found</Td></tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <Td>
                            <Link className="font-medium hover:underline" href={`/dashboard/knowledge/feature-flags/${item.id}`}>
                              <span className="font-mono text-sm">{item.metadata_json.flag_key || item.title}</span>
                            </Link>
                          </Td>
                          <Td>
                            <span className={`rounded px-2 py-0.5 text-xs ${statusColor(item.metadata_json.status)}`}>
                              {item.metadata_json.status || item.category}
                            </span>
                          </Td>
                          <Td className="font-mono text-sm">
                            {item.metadata_json.rollout_percentage != null ? `${item.metadata_json.rollout_percentage}%` : "—"}
                          </Td>
                          <Td className="text-xs text-slate-500">{item.metadata_json.target_segment || "All users"}</Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </TableInner>
              </Table>
            )}
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
