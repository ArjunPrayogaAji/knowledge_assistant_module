export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-white shadow-sm">{children}</div>;
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-4 border-b">
      <div className="text-sm text-slate-500">{subtitle}</div>
      <div className="text-base font-semibold">{title}</div>
    </div>
  );
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-4">{children}</div>;
}
