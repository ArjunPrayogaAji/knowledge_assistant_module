export default function Topbar() {
  return (
    <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
          Search...
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">
          🔔
        </button>
        <div className="rounded-md border border-slate-200 px-2 py-1">
          Workspace ▼
        </div>
        <div className="rounded-md border border-slate-200 px-2 py-1">
          User ▼
        </div>
      </div>
    </div>
  );
}
