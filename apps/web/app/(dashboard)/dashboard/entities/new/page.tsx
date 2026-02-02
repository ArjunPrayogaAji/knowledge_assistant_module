"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "../../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Button } from "../../../../../components/ui/Button";
import { apiFetch } from "../../../../../lib/apiClient";

export default function EntityCreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emailOrKey, setEmailOrKey] = useState("");
  const [status, setStatus] = useState<"open" | "pending" | "closed">("open");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ entity: { id: string } }>("/entities", {
        method: "POST",
        body: JSON.stringify({ name, email_or_key: emailOrKey, status })
      });
      router.push(`/dashboard/entities/${res.entity.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title="Create Entity" breadcrumbs="Dashboard / Entities / New">
      <Card>
        <CardHeader title="Create entity" subtitle="Simple create form" />
        <CardBody>
          <form className="grid gap-3 max-w-xl" onSubmit={submit}>
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Email / Key</label>
              <input
                value={emailOrKey}
                onChange={(e) => setEmailOrKey(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 rounded-md border px-3 py-2 text-sm bg-white">
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </Page>
  );
}
