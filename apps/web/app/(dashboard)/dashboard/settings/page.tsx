"use client";

import { useEffect, useState } from "react";
import { Page } from "../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Table, TableInner, Td, Th } from "../../../../components/ui/Table";
import { apiFetch } from "../../../../lib/apiClient";

type FeatureFlag = { id: string; key: string; enabled: boolean };
type ApiKey = { id: string; name: string; last4: string; created_at: string };

export default function SettingsPage() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ featureFlags: FeatureFlag[]; apiKeys: ApiKey[] }>("/settings");
      setFeatureFlags(res.featureFlags);
      setApiKeys(res.apiKeys);
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

  async function toggleFlag(key: string, enabled: boolean) {
    await apiFetch<{ featureFlag: FeatureFlag }>(`/settings/feature-flags/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    });
    await load();
  }

  return (
    <Page title="Settings" breadcrumbs="Dashboard / Settings">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Feature flags" subtitle="Placeholder settings surface" />
          <CardBody>
            {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
            <Table>
              <TableInner>
                <thead>
                  <tr>
                    <Th>Key</Th>
                    <Th>Enabled</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <Td colSpan={2} className="text-slate-500">
                        Loading…
                      </Td>
                    </tr>
                  ) : featureFlags.length === 0 ? (
                    <tr>
                      <Td colSpan={2} className="text-slate-500">
                        No flags
                      </Td>
                    </tr>
                  ) : (
                    featureFlags.map((f) => (
                      <tr key={f.id}>
                        <Td className="font-mono text-xs">{f.key}</Td>
                        <Td>
                          <input
                            type="checkbox"
                            checked={f.enabled}
                            onChange={(e) => toggleFlag(f.key, e.target.checked)}
                            className="h-4 w-4"
                          />
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </TableInner>
            </Table>
            <div className="mt-2 text-xs text-slate-500">Note: toggling requires admin role (API enforced).</div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="API keys" subtitle="Placeholder list" />
          <CardBody>
            <Table>
              <TableInner>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Last4</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <Td colSpan={3} className="text-slate-500">
                        Loading…
                      </Td>
                    </tr>
                  ) : apiKeys.length === 0 ? (
                    <tr>
                      <Td colSpan={3} className="text-slate-500">
                        No API keys
                      </Td>
                    </tr>
                  ) : (
                    apiKeys.map((k) => (
                      <tr key={k.id}>
                        <Td>{k.name}</Td>
                        <Td className="font-mono text-xs">{k.last4}</Td>
                        <Td>{new Date(k.created_at).toLocaleDateString()}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </TableInner>
            </Table>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
