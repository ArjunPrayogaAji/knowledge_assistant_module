"use client";

import { useEffect, useState } from "react";
import { Page } from "../../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Table, TableInner, Td, Th } from "../../../../../components/ui/Table";
import { apiFetch } from "../../../../../lib/apiClient";

type User = { id: string; email: string; name: string; role: "admin" | "member"; created_at: string };

export default function AdminUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ items: User[] }>("/admin/users");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setRole(id: string, role: User["role"]) {
    await apiFetch<{ user: User }>(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
    await load();
  }

  return (
    <Page title="Users & Roles" breadcrumbs="Dashboard / Admin / Users & Roles">
      <Card>
        <CardHeader title="Users & Roles" subtitle="RBAC enforced by API (admin-only)" />
        <CardBody>
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <Table>
            <TableInner>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Role</Th>
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
                      No users
                    </Td>
                  </tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id}>
                      <Td className="font-mono text-xs">{u.email}</Td>
                      <Td>{u.name}</Td>
                      <Td>
                        <select value={u.role} onChange={(e) => setRole(u.id, e.target.value as any)} className="rounded-md border px-2 py-1 text-sm bg-white">
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                        </select>
                      </Td>
                      <Td>{new Date(u.created_at).toLocaleDateString()}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableInner>
          </Table>
        </CardBody>
      </Card>
    </Page>
  );
}
