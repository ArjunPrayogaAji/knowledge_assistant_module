"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "../../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Button } from "../../../../../components/ui/Button";
import { apiFetch } from "../../../../../lib/apiClient";

type Entity = { id: string; name: string; status: "open" | "pending" | "closed"; email_or_key: string; created_at: string };

export default function EntityDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [emailOrKey, setEmailOrKey] = useState("");
  const [status, setStatus] = useState<Entity["status"]>("open");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch<{ entity: Entity }>(`/entities/${params.id}`);
        if (!mounted) return;
        setEntity(res.entity);
        setName(res.entity.name);
        setEmailOrKey(res.entity.email_or_key);
        setStatus(res.entity.status);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await apiFetch<{ entity: Entity }>(`/entities/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, email_or_key: emailOrKey, status })
      });
      setEntity(res.entity);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page title={entity?.name ?? "Entity"} breadcrumbs="Dashboard / Entities / Detail">
      <Card>
        <CardHeader title="Entity detail" subtitle={entity ? `Created: ${new Date(entity.created_at).toLocaleString()}` : "Loading…"} />
        <CardBody>
          {loading ? (
            <div className="py-6 text-sm text-slate-500">Loading…</div>
          ) : !entity ? (
            <div className="py-6 text-sm text-slate-500">Not found</div>
          ) : (
            <div className="grid gap-3 max-w-xl">
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
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.back()}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
