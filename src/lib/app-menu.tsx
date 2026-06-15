import type { MenuProps } from "antd";
import type { ComponentType } from "react";
import {
  ApiOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BellOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  GatewayOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { SysMenuPo } from "@/types";

type MenuIcon = ComponentType<{ className?: string }>;

/** 旧项目菜单 path → 新项目路由 */
export const LEGACY_PATH_TO_ROUTE: Record<string, string> = {
  "/userPage": "/system/users",
  "/role": "/system/roles",
  "/organization": "/system/orgs",
  "/devicePage": "/devices/list",
  "/productPage": "/devices/products",
  "/networkPage": "/ingest/components",
  "/gatewayPage": "/ingest/gateways",
  "/protocol": "/ingest/protocols",
  "/notifyConfigPage": "/notif/configs",
  "/notifyTemplatePage": "/notif/templates",
};

/** 不在侧边栏展示的详情/向导路由 */
const HIDDEN_MENU_PATHS = new Set([
  "/deviceInstance",
  "/productInstance",
  "/networkInstance",
  "/notifyAdd",
  "/notifyTemplateInfo",
]);

const ROUTE_ICON: Record<string, MenuIcon> = {
  "/system/users": UserOutlined,
  "/system/roles": SafetyCertificateOutlined,
  "/system/orgs": ApartmentOutlined,
  "/devices/list": CloudServerOutlined,
  "/devices/products": AppstoreOutlined,
  "/ingest/components": ApiOutlined,
  "/ingest/gateways": GatewayOutlined,
  "/ingest/protocols": ApiOutlined,
  "/notif/configs": BellOutlined,
  "/notif/templates": FileTextOutlined,
};

const GROUP_ICON_BY_KEYWORD: { keys: string[]; icon: MenuIcon }[] = [
  { keys: ["系统", "设置", "sys"], icon: SettingOutlined },
  { keys: ["设备", "device"], icon: CloudServerOutlined },
  { keys: ["网络", "接入", "network", "ingest"], icon: ApiOutlined },
  { keys: ["通知", "notify"], icon: BellOutlined },
];

function menuLabel(item: SysMenuPo): string {
  return item.title ?? item.name ?? "";
}

export function resolveMenuRoute(path?: string): string | null {
  if (!path?.trim()) return null;
  const p = path.trim();
  if (HIDDEN_MENU_PATHS.has(p)) return null;
  if (LEGACY_PATH_TO_ROUTE[p]) return LEGACY_PATH_TO_ROUTE[p];
  if (
    p.startsWith("/devices/") ||
    p.startsWith("/system/") ||
    p.startsWith("/ingest/") ||
    p.startsWith("/notif/")
  ) {
    return p;
  }
  return null;
}

function iconForRoute(route: string, groupName: string): MenuIcon {
  if (ROUTE_ICON[route]) return ROUTE_ICON[route];
  const g = groupName.toLowerCase();
  for (const { keys, icon } of GROUP_ICON_BY_KEYWORD) {
    if (keys.some((k) => g.includes(k.toLowerCase()))) return icon;
  }
  return CloudServerOutlined;
}

function iconForGroup(name: string): MenuIcon {
  const n = name.toLowerCase();
  for (const { keys, icon } of GROUP_ICON_BY_KEYWORD) {
    if (keys.some((k) => n.includes(k.toLowerCase()))) return icon;
  }
  return SettingOutlined;
}

export type AppMenuItem = NonNullable<MenuProps["items"]>[number];

export function buildMenuItemsFromTree(tree: SysMenuPo[]): AppMenuItem[] {
  const items: AppMenuItem[] = [];

  for (const group of tree) {
    const groupLabel = menuLabel(group);
    const subItems: AppMenuItem[] = [];

    const walk = (nodes: SysMenuPo[]) => {
      for (const node of nodes) {
        if (node.children?.length) {
          walk(node.children);
          continue;
        }
        const route = resolveMenuRoute(node.path);
        if (!route) continue;
        const Icon = iconForRoute(route, groupLabel);
        subItems.push({
          key: route,
          label: menuLabel(node),
          icon: <Icon />,
        });
      }
    };
    walk(group.children ?? []);

    if (subItems.length === 0) continue;

    const GroupIcon = iconForGroup(groupLabel);
    items.push({
      key: String(group.id ?? groupLabel),
      label: groupLabel,
      icon: <GroupIcon />,
      children: subItems,
    });
  }

  return items;
}

export function getFirstMenuRoute(tree: SysMenuPo[]): string {
  for (const group of tree) {
    const walk = (nodes: SysMenuPo[]): string | null => {
      for (const node of nodes) {
        if (node.children?.length) {
          const hit = walk(node.children);
          if (hit) return hit;
          continue;
        }
        const route = resolveMenuRoute(node.path);
        if (route) return route;
      }
      return null;
    };
    const hit = walk(group.children ?? []);
    if (hit) return hit;
  }
  return "/system/users";
}

export function resolveActiveMenuKey(pathname: string): string {
  if (pathname.startsWith("/devices/list/")) return "/devices/list";
  if (pathname.startsWith("/devices/products/") && pathname !== "/devices/products") {
    return "/devices/products";
  }
  return pathname;
}

export function collectOpenKeysFromItems(items: AppMenuItem[], selectedKey: string): string[] {
  const keys: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || !("children" in item)) continue;
    const children = item.children as AppMenuItem[] | undefined;
    if (!children?.length) continue;
    const groupKey = String(item.key ?? "");
    if (children.some((c) => c && typeof c === "object" && c.key === selectedKey)) {
      keys.push(groupKey);
    }
  }
  return keys;
}

export function flattenMenuForSearch(
  tree: SysMenuPo[],
): { to: string; label: string; group: string }[] {
  const out: { to: string; label: string; group: string }[] = [];
  for (const group of tree) {
    const groupLabel = menuLabel(group);
    const walk = (nodes: SysMenuPo[]) => {
      for (const node of nodes) {
        if (node.children?.length) {
          walk(node.children);
          continue;
        }
        const route = resolveMenuRoute(node.path);
        if (!route) continue;
        out.push({ to: route, label: menuLabel(node), group: groupLabel });
      }
    };
    walk(group.children ?? []);
  }
  return out;
}
