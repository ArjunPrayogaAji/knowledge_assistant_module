"use client";

import { Topbar } from "./Topbar";

export function Page({
  title,
  breadcrumbs,
  primaryAction,
  children
}: {
  title: string;
  breadcrumbs?: string;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Topbar title={title} breadcrumbs={breadcrumbs} primaryAction={primaryAction} />
      <div className="p-4">{children}</div>
    </div>
  );
}
