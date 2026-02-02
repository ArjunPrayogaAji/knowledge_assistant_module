"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Page } from "../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Table, TableInner, Td, Th } from "../../../components/ui/Table";
import { apiFetch } from "../../../lib/apiClient";
import {
  BookOpen,
  Shield,
  FileText,
  ScrollText,
  AlertTriangle,
  HeadphonesIcon,
  Flag,
  BarChart3,
  Wrench
} from "lucide-react";

type ModuleCounts = Record<string, number>;

type RecentItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  updated_at: string;
};

const moduleConfig: Record<string, { label: string; icon: React.ElementType; href: string; color: string }> = {
  docs: { label: "Docs Library", icon: BookOpen, href: "/dashboard/knowledge/docs", color: "bg-blue-50 text-blue-700" },
  policies: { label: "Policies & Compliance", icon: Shield, href: "/dashboard/knowledge/policies", color: "bg-purple-50 text-purple-700" },
  api_reference: { label: "API Reference", icon: FileText, href: "/dashboard/knowledge/api-reference", color: "bg-green-50 text-green-700" },
  changelog: { label: "Changelog", icon: ScrollText, href: "/dashboard/knowledge/changelog", color: "bg-amber-50 text-amber-700" },
  incidents: { label: "Incidents", icon: AlertTriangle, href: "/dashboard/knowledge/incidents", color: "bg-red-50 text-red-700" },
  support: { label: "Support", icon: HeadphonesIcon, href: "/dashboard/knowledge/support", color: "bg-teal-50 text-teal-700" },
  feature_flags: { label: "Feature Flags", icon: Flag, href: "/dashboard/knowledge/feature-flags", color: "bg-indigo-50 text-indigo-700" },
  analytics_events: { label: "Analytics Events", icon: BarChart3, href: "/dashboard/knowledge/analytics-events", color: "bg-pink-50 text-pink-700" },
  playbooks: { label: "Playbooks", icon: Wrench, href: "/dashboard/knowledge/playbooks", color: "bg-orange-50 text-orange-700" }
};

export default function OverviewPage() {
  const [counts, setCounts] = useState<ModuleCounts>({});
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [countsRes, recentRes] = await Promise.all([
          apiFetch<{ counts: ModuleCounts }>("/knowledge/stats/counts"),
          apiFetch<{ items: RecentItem[] }>("/knowledge/recent/all?limit=10")
        ]);

        if (!mounted) return;
        setCounts(countsRes.counts);
        setRecentItems(recentRes.items);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Page title="Dashboard" breadcrumbs="Adamant SaaS / Overview">
      <div className="grid gap-4">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardBody>
              <div className="text-xs text-slate-500">Total Knowledge Items</div>
              <div className="text-2xl font-semibold">{loading ? "—" : totalItems}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-slate-500">Knowledge Modules</div>
              <div className="text-2xl font-semibold">9</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-slate-500">Export Format</div>
              <div className="text-2xl font-semibold">JSONL</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-slate-500">Status</div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Operational</span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Module Cards */}
        <Card>
          <CardHeader title="Knowledge Modules" subtitle="Browse and export documentation by module" />
          <CardBody>
            {error ? (
              <div className="py-6 text-sm text-red-600">{error}</div>
            ) : loading ? (
              <div className="py-6 text-sm text-slate-500">Loading modules…</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(moduleConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  const count = counts[key] || 0;
                  return (
                    <Link
                      key={key}
                      href={config.href}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-slate-500">{count} items</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Updates */}
        <Card>
          <CardHeader title="Recent Updates" subtitle="Latest changes across all modules" />
          <CardBody>
            <Table>
              <TableInner>
                <thead>
                  <tr>
                    <Th>Title</Th>
                    <Th>Module</Th>
                    <Th>Category</Th>
                    <Th>Updated</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <Td colSpan={4} className="text-slate-500">Loading…</Td>
                    </tr>
                  ) : recentItems.length === 0 ? (
                    <tr>
                      <Td colSpan={4} className="text-slate-500">No items yet</Td>
                    </tr>
                  ) : (
                    recentItems.map((item) => {
                      const config = moduleConfig[item.type];
                      const detailHref = config
                        ? `${config.href}/${item.id}`
                        : `/dashboard/knowledge/${item.type}/${item.id}`;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <Td>
                            <Link className="font-medium hover:underline" href={detailHref}>
                              {item.title}
                            </Link>
                          </Td>
                          <Td>
                            <span className={`rounded px-2 py-0.5 text-xs ${config?.color || "bg-slate-100"}`}>
                              {config?.label || item.type}
                            </span>
                          </Td>
                          <Td className="text-xs text-slate-500">{item.category}</Td>
                          <Td>{new Date(item.updated_at).toLocaleDateString()}</Td>
                        </tr>
                      );
                    })
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
