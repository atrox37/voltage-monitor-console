import {
  LayoutDashboard, Settings, Users, ShieldCheck, Building2,
  Server, Boxes, Network, Plug, Cable, Router as RouterIcon,
  Bell, BellRing, FileText,
  type LucideIcon,
} from "lucide-react";

export type NavLeaf = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  key: string;
  icon: LucideIcon;
  children: NavLeaf[];
};

export const NAV: NavGroup[] = [
  {
    label: "总览",
    key: "overview",
    icon: LayoutDashboard,
    children: [{ label: "实时监控", to: "/", icon: LayoutDashboard }],
  },
  {
    label: "系统管理",
    key: "system",
    icon: Settings,
    children: [
      { label: "用户管理", to: "/system/users", icon: Users },
      { label: "角色管理", to: "/system/roles", icon: ShieldCheck },
      { label: "机构管理", to: "/system/orgs",  icon: Building2 },
    ],
  },
  {
    label: "设备管理",
    key: "devices",
    icon: Server,
    children: [
      { label: "产品列表", to: "/devices/products", icon: Boxes },
      { label: "设备列表", to: "/devices/list",     icon: Server },
    ],
  },
  {
    label: "网络管理",
    key: "ingest",
    icon: Network,
    children: [
      { label: "网络组件", to: "/ingest/components", icon: Cable },
      { label: "网关列表", to: "/ingest/gateways",   icon: RouterIcon },
      { label: "协议库",   to: "/ingest/protocols",  icon: Plug },
    ],
  },
  {
    label: "通知管理",
    key: "notif",
    icon: Bell,
    children: [
      { label: "通知配置", to: "/notif/configs",   icon: BellRing },
      { label: "通知模板", to: "/notif/templates", icon: FileText },
    ],
  },
];

export function findCrumbs(pathname: string): { group?: string; page?: string } {
  for (const g of NAV) {
    for (const c of g.children) {
      if (c.to === pathname) return { group: g.label, page: c.label };
    }
  }
  return {};
}
