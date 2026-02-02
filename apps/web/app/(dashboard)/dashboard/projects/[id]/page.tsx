"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Page } from "../../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Table, TableInner, Td, Th } from "../../../../../components/ui/Table";
import { apiFetch } from "../../../../../lib/apiClient";

type Project = { id: string; name: string; status: string; created_at: string };
type ActivityItem = { id: string; action: string; created_at: string; metadata_json: any; actor_user_id: string | null };

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const sp = useSearchParams();
  const tab = (sp.get("tab") ?? "summary") as "summary" | "data" | "activity";

  const [project, setProject] = useState<Project | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch<{ project: Project; recentActivity: ActivityItem[] }>(`/projects/${params.id}`);
        if (!mounted) return;
        setProject(res.project);
        setRecentActivity(res.recentActivity);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  const tabs = useMemo(
    () => [
      { id: "summary", label: "Summary" },
      { id: "data", label: "Data" },
      { id: "activity", label: "Activity" }
    ],
    []
  );

  return (
    <Page title={project?.name ?? "Project"} breadcrumbs="Dashboard / Projects / Detail">
      <Card>
        <CardHeader title="Project detail" subtitle={project ? `Status: ${project.status}` : "Loading…"} />
        <CardBody>
          <div className="flex items-center gap-2 border-b pb-3">
            {tabs.map((t) => (
              <a
                key={t.id}
                href={`/dashboard/projects/${params.id}?tab=${t.id}`}
                className={
                  "rounded-md px-3 py-1.5 text-sm border " +
                  (tab === t.id ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50")
                }
              >
                {t.label}
              </a>
            ))}
          </div>

          {loading ? (
            <div className="py-6 text-sm text-slate-500">Loading…</div>
          ) : !project ? (
            <div className="py-6 text-sm text-slate-500">Not found</div>
          ) : tab === "summary" ? (
            <div className="grid gap-3 py-4">
              <div className="text-sm">
                <span className="text-slate-500">Project ID:</span> <span className="font-mono">{project.id}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Created:</span> {new Date(project.created_at).toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">
                This is a dummy detail view meant to show UI patterns (tabs, detail pages, related activity).
              </div>
            </div>
          ) : tab === "data" ? (
            <div className="py-4 text-sm text-slate-600">
              Placeholder tab. Candidates can model additional data views here (e.g., ingestion, connectors, etc.).
            </div>
          ) : (
            <div className="py-4">
              <Table>
                <TableInner>
                  <thead>
                    <tr>
                      <Th>When</Th>
                      <Th>Action</Th>
                      <Th>Meta</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.length === 0 ? (
                      <tr>
                        <Td colSpan={3} className="text-slate-500">
                          No activity
                        </Td>
                      </tr>
                    ) : (
                      recentActivity.map((a) => (
                        <tr key={a.id}>
                          <Td>{new Date(a.created_at).toLocaleString()}</Td>
                          <Td className="font-mono text-xs">{a.action}</Td>
                          <Td className="font-mono text-xs text-slate-600">{JSON.stringify(a.metadata_json)}</Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </TableInner>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
