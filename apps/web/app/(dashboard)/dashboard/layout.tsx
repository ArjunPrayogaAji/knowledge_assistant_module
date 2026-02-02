import { Sidebar } from "../../../components/layout/Sidebar";
import { RequireAuth } from "../../../components/auth/RequireAuth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </RequireAuth>
  );
}
