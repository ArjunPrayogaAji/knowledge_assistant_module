"use client";

import { useMemo } from "react";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < pageCount;

  const label = useMemo(() => `${page} / ${pageCount}`, [page, pageCount]);

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="text-xs text-slate-500">Total: {total}</div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        <div className="text-sm text-slate-700">{label}</div>
        <button
          className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
