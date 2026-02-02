"use client";

import { Bell, Search, UserCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { apiFetch } from "../../lib/apiClient";
import { useRouter } from "next/navigation";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Topbar({ title, breadcrumbs, primaryAction }: { title: string; breadcrumbs?: string; primaryAction?: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const workspaces = useMemo(() => ["Default Workspace", "Sandbox Workspace"], []);

  async function logout() {
    await apiFetch<{ ok: true }>("/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <div className="h-14 px-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search…"
              className="w-full rounded-md border px-9 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>
        </div>

        <div className="relative">
          <button className="rounded-md p-2 hover:bg-slate-100" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setWorkspaceOpen((v) => !v)}
            className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
          >
            Workspace ▾
          </button>
          {workspaceOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-sm z-10">
              {workspaces.map((w) => (
                <button
                  key={w}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => setWorkspaceOpen(false)}
                >
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-2 hover:bg-slate-100"
            aria-label="User menu"
          >
            <UserCircle2 className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-sm z-10">
              <div className="px-3 py-2 text-xs text-slate-500 border-b">Signed in</div>
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                Profile
              </button>
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => router.push("/dashboard/settings")}>
                Settings
              </button>
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-red-600" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">{breadcrumbs}</div>
          <div className="text-lg font-semibold">{title}</div>
        </div>
        <div className={cx(!primaryAction && "hidden")}>{primaryAction}</div>
      </div>
    </header>
  );
}
