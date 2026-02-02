"use client";

import { Page } from "../../../../components/layout/Page";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";

export default function DataPage() {
  return (
    <Page title="Data" breadcrumbs="Dashboard / Data">
      <Card>
        <CardHeader title="Data" subtitle="Placeholder page" />
        <CardBody>
          <div className="text-sm text-slate-600">
            This page is intentionally minimal. Candidates can use existing patterns in Entities/Projects to extend data workflows.
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
