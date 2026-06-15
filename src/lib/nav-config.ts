import type { ComponentType } from "react";
import {
  ApiOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BellOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  GatewayOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";

type NavIcon = ComponentType<{ className?: string }>;

export type NavLeaf = {
  /** i18n key, e.g. nav.system.users */
  labelKey: string;
  to: string;
  icon: NavIcon;
};

export type NavGroup = {
  labelKey: string;
  key: string;
  icon: NavIcon;
  children: NavLeaf[];
};

/** 静态导航（面包屑/图标回退）；侧边栏以接口菜单为准 */
export const NAV: NavGroup[] = [
  {
    labelKey: "nav.devices.group",
    key: "devices",
    icon: CloudServerOutlined,
    children: [
      { labelKey: "nav.devices.products", to: "/devices/products", icon: AppstoreOutlined },
      { labelKey: "nav.devices.list", to: "/devices/list", icon: CloudServerOutlined },
    ],
  },
  {
    labelKey: "nav.ingest.group",
    key: "ingest",
    icon: ApiOutlined,
    children: [
      { labelKey: "nav.ingest.protocols", to: "/ingest/protocols", icon: ApiOutlined },
      { labelKey: "nav.ingest.components", to: "/ingest/components", icon: ApiOutlined },
      { labelKey: "nav.ingest.gateways", to: "/ingest/gateways", icon: GatewayOutlined },
    ],
  },
  {
    labelKey: "nav.notif.group",
    key: "notif",
    icon: BellOutlined,
    children: [
      { labelKey: "nav.notif.configs", to: "/notif/configs", icon: BellOutlined },
      { labelKey: "nav.notif.templates", to: "/notif/templates", icon: FileTextOutlined },
    ],
  },
  {
    labelKey: "nav.system.group",
    key: "system",
    icon: SettingOutlined,
    children: [
      { labelKey: "nav.system.users", to: "/system/users", icon: UserOutlined },
      { labelKey: "nav.system.roles", to: "/system/roles", icon: SafetyCertificateOutlined },
      { labelKey: "nav.system.orgs", to: "/system/orgs", icon: ApartmentOutlined },
      { labelKey: "nav.system.auditLog", to: "/system/audit", icon: AuditOutlined },
    ],
  },
];

export function findCrumbs(
  pathname: string,
  t: (key: string) => string,
): { group?: string; page?: string } {
  for (const g of NAV) {
    for (const c of g.children) {
      const match = pathname === c.to || pathname.startsWith(c.to + "/");
      if (match) return { group: t(g.labelKey), page: t(c.labelKey) };
    }
  }
  return {};
}
