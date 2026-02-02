"use client";

import { useEffect, useState } from "react";
import { Page } from "../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Pagination } from "../../../../components/ui/Pagination";
import { Table, TableInner, Td, Th } from "../../../../components/ui/Table";
import { apiFetch } from "../../../../lib/apiClient";

type ActivityItem = {
  id: string;
  action: string;
  created_at: string;
  actor_email: string | null;
  actor_name: string | null;
  metadata_json: any;
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (query) qs.set("query", query);
        const res = await apiFetch<{ items: ActivityItem[]; total: number; page: number; pageSize: number }>(`/activity?${qs}`);
        if (!mounted) return;
        setItems(res.items);
        setTotal(res.total);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [page, pageSize, query]);

  return (
    <Page title="Activity Log" breadcrumbs="Dashboard / Activity Log">
      <Card>
        <CardHeader title="Activity Log" subtitle="Server-side pagination + filter" />
        <CardBody>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Filter by action or actor email…"
              className="w-full max-w-md rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-3">
            <Table>
              <TableInner>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Action</Th>
                    <Th>Actor</Th>
                    <Th>Meta</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <Td colSpan={4} className="text-slate-500">
                        Loading…
                      </Td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <Td colSpan={4} className="text-slate-500">
                        No results
                      </Td>
                    </tr>
                  ) : (
                    items.map((a) => (
                      <tr key={a.id}>
                        <Td>{new Date(a.created_at).toLocaleString()}</Td>
                        <Td className="font-mono text-xs">{a.action}</Td>
                        <Td>{a.actor_email ?? a.actor_name ?? "—"}</Td>
                        <Td className="font-mono text-xs text-slate-600">{JSON.stringify(a.metadata_json)}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </TableInner>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
