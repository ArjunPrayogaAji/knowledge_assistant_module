"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { navGroups } from "./nav";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const groups = useMemo(() => navGroups, []);

  return (
    <aside
      className={cx(
        "h-screen border-r bg-white",
        "sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between px-3 border-b">
        <div className={cx("font-semibold tracking-tight", collapsed && "sr-only")}>Adamant SaaS</div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-md p-2 hover:bg-slate-100"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="p-2 space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <div className={cx("px-2 pb-1 text-xs text-slate-500 uppercase", collapsed && "sr-only")}>{g.label}</div>
            <ul className="space-y-1">
              {g.items.map((it) => {
                const active = pathname === it.href || (it.href !== "/dashboard" && pathname?.startsWith(it.href));
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cx(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={cx(collapsed && "sr-only")}>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
