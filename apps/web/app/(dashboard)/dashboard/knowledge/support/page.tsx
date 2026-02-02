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
  metadata_json: { resolved?: boolean; ticket_id?: string };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function SupportPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"updated_at_desc" | "updated_at_asc" | "title_asc" | "title_desc">("updated_at_desc");

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
        const res = await apiFetch<{ items: KnowledgeItem[]; total: number }>(`/knowledge/support?${qs}`);
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
    window.open(`${apiBaseUrl()}/exports/support?${exportQs.toString()}`, "_blank");
  };

  return (
    <Page
      title="Support Conversations"
      breadcrumbs="Operations / Support Conversations"
      primaryAction={<Button onClick={handleExport}>Export JSONL</Button>}
    >
      <Card>
        <CardHeader title="Support Conversations (Anonymized)" subtitle="Customer questions, agent replies, and resolutions" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value); }}
              placeholder="Search conversations…"
              className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(e) => { setPage(1); setCategory(e.target.value); }}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="">All categories</option>
              <option value="billing">Billing</option>
              <option value="login">Login Issues</option>
              <option value="api">API Errors</option>
              <option value="feature-request">Feature Request</option>
              <option value="bug-report">Bug Report</option>
              <option value="general">General</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="updated_at_desc">Most Recent</option>
              <option value="updated_at_asc">Oldest</option>
              <option value="title_asc">Title (A→Z)</option>
              <option value="title_desc">Title (Z→A)</option>
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
                      <Th>Subject</Th>
                      <Th>Category</Th>
                      <Th>Status</Th>
                      <Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><Td colSpan={4} className="text-slate-500">Loading…</Td></tr>
                    ) : items.length === 0 ? (
                      <tr><Td colSpan={4} className="text-slate-500">No conversations found</Td></tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <Td>
                            <Link className="font-medium hover:underline" href={`/dashboard/knowledge/support/${item.id}`}>
                              {item.title}
                            </Link>
                            {item.metadata_json.ticket_id && (
                              <span className="ml-2 text-xs text-slate-400">#{item.metadata_json.ticket_id}</span>
                            )}
                          </Td>
                          <Td><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{item.category}</span></Td>
                          <Td>
                            {item.metadata_json.resolved ? (
                              <span className="rounded bg-green-100 text-green-700 px-2 py-0.5 text-xs">Resolved</span>
                            ) : (
                              <span className="rounded bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs">Open</span>
                            )}
                          </Td>
                          <Td>{new Date(item.updated_at).toLocaleDateString()}</Td>
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
