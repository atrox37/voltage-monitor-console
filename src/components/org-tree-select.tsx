import { useMemo } from "react";
import { TreeSelect } from "antd";
import type { TreeSelectProps } from "antd";
import { useTranslation } from "@/i18n";

export type OrgNode = {
  id: string;
  label: string;
  parentId?: string;
  userCount?: number;
  children?: OrgNode[];
};

export function findOrg(id: string, tree: OrgNode[]): OrgNode | undefined {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const r = findOrg(id, n.children);
      if (r) return r;
    }
  }
}

export function flattenOrgs(tree: OrgNode[]): OrgNode[] {
  const out: OrgNode[] = [];
  const walk = (ns: OrgNode[]) =>
    ns.forEach((n) => {
      out.push(n);
      if (n.children) walk(n.children);
    });
  walk(tree);
  return out;
}

export function orgLabelById(tree: OrgNode[], id: string): string {
  if (!id) return "";
  return findOrg(id, tree)?.label ?? id;
}

function toTreeData(
  nodes: OrgNode[],
  matchBy: "id" | "label",
): NonNullable<TreeSelectProps["treeData"]> {
  return nodes.map((n) => ({
    title: n.label,
    value: matchBy === "label" ? n.label : n.id,
    key: n.id,
    children: n.children?.length ? toTreeData(n.children, matchBy) : undefined,
  }));
}

export function OrgTreeSelect({
  value,
  onChange,
  nodes = [],
  placeholder,
  // allowAll 保留 prop 定义以兼容调用方，行为改为始终 allowClear（清除=选择全部）
  allowAll: _allowAll,
  disabled,
  matchBy = "id",
  className,
  style,
}: {
  value?: string;
  onChange?: (v: string) => void;
  nodes?: OrgNode[];
  placeholder?: string;
  allowAll?: boolean;
  disabled?: boolean;
  matchBy?: "id" | "label";
  className?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder =
    placeholder ?? t("validation.requiredSelect", { label: t("common.orgLabel") });

  const treeData = useMemo(() => {
    return toTreeData(nodes, matchBy);
  }, [matchBy, nodes]);

  return (
    <TreeSelect
      className={["vt-select-control", className].filter(Boolean).join(" ")}
      classNames={{ popup: { root: "vt-select-popup" } }}
      style={{ width: "100%", ...style }}
      value={value === "" || value == null ? undefined : value}
      placeholder={resolvedPlaceholder}
      disabled={disabled}
      allowClear
      treeDefaultExpandAll
      treeLine
      showSearch
      treeNodeFilterProp="title"
      treeData={treeData}
      onChange={(v) => {
        onChange?.(v == null ? "" : String(v));
      }}
    />
  );
}
