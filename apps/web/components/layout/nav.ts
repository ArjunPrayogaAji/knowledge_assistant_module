import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  FileText,
  Flag,
  HeadphonesIcon,
  LayoutDashboard,
  MessageCircle,
  ScrollText,
  Settings,
  Shield,
  Users,
  Wrench
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }
    ]
  },
  {
    label: "Knowledge Base",
    items: [
      { label: "Docs Library", href: "/dashboard/knowledge/docs", icon: BookOpen },
      { label: "Policies & Compliance", href: "/dashboard/knowledge/policies", icon: Shield },
      { label: "API Reference", href: "/dashboard/knowledge/api-reference", icon: FileText },
      { label: "Changelog", href: "/dashboard/knowledge/changelog", icon: ScrollText }
    ]
  },
  {
    label: "Operations",
    items: [
      { label: "Incidents & Postmortems", href: "/dashboard/knowledge/incidents", icon: AlertTriangle },
      { label: "Support Conversations", href: "/dashboard/knowledge/support", icon: HeadphonesIcon },
      { label: "Internal Playbooks", href: "/dashboard/knowledge/playbooks", icon: Wrench }
    ]
  },
  {
    label: "Product",
    items: [
      { label: "Feature Flags", href: "/dashboard/knowledge/feature-flags", icon: Flag },
      { label: "Analytics Events", href: "/dashboard/knowledge/analytics-events", icon: BarChart3 }
    ]
  },
  {
    label: "Assistant",
    items: [
      { label: "Knowledge Assistant", href: "/dashboard/knowledge-assistant", icon: MessageCircle }
    ]
  },
  {
    label: "Admin",
    items: [
      { label: "Users & Roles", href: "/dashboard/admin/users", icon: Users },
      { label: "Activity Log", href: "/dashboard/activity", icon: Activity },
      { label: "Settings", href: "/dashboard/settings", icon: Settings }
    ]
  }
];

export const adminBadgeIcon = Shield;
