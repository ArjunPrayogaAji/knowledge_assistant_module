import Link from "next/link";

export default function PageHeader({
  title,
  breadcrumbs = [],
  actionLabel,
  actionHref
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="space-y-1">
        <div className="text-xs text-slate-500">
          {breadcrumbs.join(" / ")}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
