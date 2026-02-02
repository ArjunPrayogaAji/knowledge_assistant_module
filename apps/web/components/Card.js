export default function Card({ title, value, helper }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-400">{helper}</div> : null}
    </div>
  );
}
