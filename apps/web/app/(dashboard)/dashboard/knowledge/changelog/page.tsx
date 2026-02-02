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
  metadata_json: { version?: string; breaking?: boolean };
  tags: string[];
  updated_at: string;
  created_at: string;
};

export default function ChangelogPage() {
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
        const res = await apiFetch<{ items: KnowledgeItem[]; total: number }>(`/knowledge/changelog?${qs}`);
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
    window.open(`${apiBaseUrl()}/exports/changelog?${exportQs.toString()}`, "_blank");
  };

  return (
    <Page
      title="Changelog"
      breadcrumbs="Knowledge Base / Changelog"
      primaryAction={<Button onClick={handleExport}>Export JSONL</Button>}
    >
      <Card>
        <CardHeader title="Changelog & Release Notes" subtitle="Version releases, breaking changes, and migration notes" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value); }}
              placeholder="Search releases…"
              className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(e) => { setPage(1); setCategory(e.target.value); }}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="">All types</option>
              <option value="major">Major Release</option>
              <option value="minor">Minor Release</option>
              <option value="patch">Patch</option>
              <option value="security">Security Update</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="updated_at_desc">Newest First</option>
              <option value="updated_at_asc">Oldest First</option>
              <option value="title_asc">Version (A→Z)</option>
              <option value="title_desc">Version (Z→A)</option>
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
                      <Th>Version</Th>
                      <Th>Type</Th>
                      <Th>Breaking</Th>
                      <Th>Released</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><Td colSpan={4} className="text-slate-500">Loading…</Td></tr>
                    ) : items.length === 0 ? (
                      <tr><Td colSpan={4} className="text-slate-500">No releases found</Td></tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <Td>
                            <Link className="font-medium hover:underline font-mono" href={`/dashboard/knowledge/changelog/${item.id}`}>
                              {item.metadata_json.version || item.title}
                            </Link>
                          </Td>
                          <Td><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{item.category}</span></Td>
                          <Td>
                            {item.metadata_json.breaking ? (
                              <span className="rounded bg-red-100 text-red-700 px-2 py-0.5 text-xs">Yes</span>
                            ) : (
                              <span className="text-slate-400">—</span>
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
