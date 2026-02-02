"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Page } from "../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Pagination } from "../../../../components/ui/Pagination";
import { Table, TableInner, Td, Th } from "../../../../components/ui/Table";
import { Button } from "../../../../components/ui/Button";
import { apiFetch } from "../../../../lib/apiClient";

type Entity = { id: string; name: string; status: "open" | "pending" | "closed"; email_or_key: string; created_at: string };

export default function EntitiesPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | Entity["status"]>("");
  const [sort, setSort] = useState<"created_at_desc" | "created_at_asc" | "name_asc" | "name_desc">("created_at_desc");

  const [items, setItems] = useState<Entity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const qs = useMemo(() => {
    const s = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
    if (query) s.set("query", query);
    if (status) s.set("status", status);
    return s.toString();
  }, [page, pageSize, sort, query, status]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch<{ items: Entity[]; total: number; page: number; pageSize: number }>(`/entities?${qs}`);
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
  }, [qs]);

  return (
    <Page
      title="Entities"
      breadcrumbs="Dashboard / Entities"
      primaryAction={
        <Link href="/dashboard/entities/new">
          <Button>Create</Button>
        </Link>
      }
    >
      <Card>
        <CardHeader title="Entities" subtitle="Dummy CRUD: list → detail → create/edit" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Search entities…"
              className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as any);
              }}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-md border px-3 py-2 text-sm bg-white">
              <option value="created_at_desc">Newest</option>
              <option value="created_at_asc">Oldest</option>
              <option value="name_asc">Name (A→Z)</option>
              <option value="name_desc">Name (Z→A)</option>
            </select>
          </div>

          <div className="mt-3">
            <Table>
              <TableInner>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Status</Th>
                    <Th>Contact</Th>
                    <Th>Created</Th>
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
                    items.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <Td>
                          <Link className="font-medium hover:underline" href={`/dashboard/entities/${e.id}`}>
                            {e.name}
                          </Link>
                        </Td>
                        <Td>{e.status}</Td>
                        <Td className="font-mono text-xs">{e.email_or_key}</Td>
                        <Td>{new Date(e.created_at).toLocaleDateString()}</Td>
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
