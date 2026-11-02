import {
  Compass,
  Database,
  Home,
  Lightbulb,
  LayoutDashboard,
  MessageSquare,
  Play,
  Search,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** step number in the intelligence loop (badge), if any */
  step?: number;
}

/** Global navigation — always present. */
export const GLOBAL_NAV: NavItem[] = [
  { label: "Workspace", href: "/app", icon: Home },
  { label: "Datasets", href: "/data", icon: Database },
];

/** Dataset-scoped navigation — the intelligence loop + tools. */
export function datasetNav(id: string): NavItem[] {
  const base = `/d/${id}`;
  return [
    { label: "Overview", href: base, icon: LayoutDashboard },
    { label: "Explorer", href: `${base}/explore`, icon: Compass },
    { label: "What happened", href: `${base}/insights`, icon: Sparkles, step: 1 },
    { label: "Why", href: `${base}/why`, icon: Search, step: 2 },
    { label: "What's next", href: `${base}/forecast`, icon: TrendingUp, step: 3 },
    { label: "What to do", href: `${base}/decide`, icon: Lightbulb, step: 4 },
    { label: "Ask", href: `${base}/ask`, icon: MessageSquare },
    { label: "Present", href: `${base}/story`, icon: Play },
  ];
}
