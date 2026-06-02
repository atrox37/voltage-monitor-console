import { useMemo } from "react";
import { NAV } from "@/lib/nav-config";
import { useTranslation } from "./index";
import type { NavSearchItem } from "./types";

export type ResolvedNavGroup = {
  key: string;
  label: string;
  icon: (typeof NAV)[number]["icon"];
  children: {
    to: string;
    label: string;
    icon: (typeof NAV)[number]["children"][number]["icon"];
    labelKey: string;
  }[];
};

export function useNavGroups(): ResolvedNavGroup[] {
  const { t } = useTranslation();
  return useMemo(
    () =>
      NAV.map((g) => ({
        key: g.key,
        icon: g.icon,
        label: t(g.labelKey),
        children: g.children.map((c) => ({
          to: c.to,
          icon: c.icon,
          labelKey: c.labelKey,
          label: t(c.labelKey),
        })),
      })),
    [t],
  );
}

export function searchNavItems(groups: ResolvedNavGroup[], query: string): NavSearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: NavSearchItem[] = [];
  for (const g of groups) {
    for (const c of g.children) {
      const keywords = `${g.label} ${c.label} ${c.to}`.toLowerCase();
      if (keywords.includes(q)) {
        out.push({ to: c.to, label: c.label, group: g.label, keywords });
      }
    }
  }
  return out;
}
