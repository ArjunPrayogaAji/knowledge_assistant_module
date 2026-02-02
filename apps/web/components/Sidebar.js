import Link from "next/link";

const navGroups = [
  {
    label: "Core",
    items: [
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/projects", label: "Projects" },
      { href: "/dashboard/data", label: "Data" },
      { href: "/dashboard/entities", label: "Entities" },
      { href: "/dashboard/activity", label: "Activity Log" }
    ]
  },
  {
    label: "Admin",
    items: [
      { href: "/dashboard/admin/users", label: "Users & Roles" },
      { href: "/dashboard/settings", label: "Settings" }
    ]
  }
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-4 text-lg font-semibold">
        Atlas Console
      </div>
      <nav className="space-y-6 p-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
