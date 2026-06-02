import {
  LayoutDashboard, Settings, Users, ShieldCheck, Building2,
  Server, Boxes, Network, Plug, Cable, Router as RouterIcon,
  Bell, BellRing, FileText,
  type LucideIcon,
} from "lucide-react";

export type NavLeaf = {
  /** i18n key, e.g. nav.system.users */
  labelKey: string;
  to: string;
  icon: LucideIcon;
};

export type NavGroup = {
  labelKey: string;
  key: string;
  icon: LucideIcon;
  children: NavLeaf[];
};

export const NAV: NavGroup[] = [
  {
    labelKey: "nav.overview.group",
    key: "overview",
    icon: LayoutDashboard,
    children: [{ labelKey: "nav.overview.monitor", to: "/", icon: LayoutDashboard }],
  },
  {
    labelKey: "nav.devices.group",
    key: "devices",
    icon: Server,
    children: [
      { labelKey: "nav.devices.products", to: "/devices/products", icon: Boxes },
      { labelKey: "nav.devices.list", to: "/devices/list", icon: Server },
    ],
  },
  {
    labelKey: "nav.ingest.group",
    key: "ingest",
    icon: Network,
    children: [
      { labelKey: "nav.ingest.components", to: "/ingest/components", icon: Cable },
      { labelKey: "nav.ingest.gateways", to: "/ingest/gateways", icon: RouterIcon },
      { labelKey: "nav.ingest.protocols", to: "/ingest/protocols", icon: Plug },
    ],
  },
  {
    labelKey: "nav.notif.group",
    key: "notif",
    icon: Bell,
    children: [
      { labelKey: "nav.notif.configs", to: "/notif/configs", icon: BellRing },
      { labelKey: "nav.notif.templates", to: "/notif/templates", icon: FileText },
    ],
  },
  {
    labelKey: "nav.system.group",
    key: "system",
    icon: Settings,
    children: [
      { labelKey: "nav.system.users", to: "/system/users", icon: Users },
      { labelKey: "nav.system.roles", to: "/system/roles", icon: ShieldCheck },
      { labelKey: "nav.system.orgs", to: "/system/orgs", icon: Building2 },
    ],
  },
];

export function findCrumbs(
  pathname: string,
  t: (key: string) => string,
): { group?: string; page?: string } {
  for (const g of NAV) {
    for (const c of g.children) {
      const match = c.to === "/" ? pathname === "/" : pathname === c.to || pathname.startsWith(c.to + "/");
      if (match) return { group: t(g.labelKey), page: t(c.labelKey) };
    }
  }
  return {};
}
