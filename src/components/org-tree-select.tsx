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

const FALLBACK_ORG_TREE: OrgNode[] = [
  {
    id: "root",
    label: "Group Root",
    children: [
      {
        id: "c1",
        label: "Group Children1",
        parentId: "root",
        children: [{ id: "c1-1", label: "Group Children1-1", parentId: "c1" }],
      },
      { id: "c2", label: "Group Children2", parentId: "root" },
      { id: "c3", label: "Group Children3", parentId: "root" },
    ],
  },
];

export const ORG_TREE = FALLBACK_ORG_TREE;

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
  const walk = (ns: OrgNode[]) => ns.forEach((n) => { out.push(n); if (n.children) walk(n.children); });
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
  nodes = FALLBACK_ORG_TREE,
  placeholder,
  allowAll,
  disabled,
  matchBy = "id",
  className,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  nodes?: OrgNode[];
  placeholder?: string;
  allowAll?: boolean;
  disabled?: boolean;
  matchBy?: "id" | "label";
  className?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("common.select");

  const treeData = useMemo(() => {
    const data = toTreeData(nodes, matchBy);
    if (allowAll) {
      return [{ title: t("common.all"), value: "", key: "__all__" }, ...data];
    }
    return data;
  }, [allowAll, matchBy, nodes, t]);

  return (
    <TreeSelect
      className={className}
      style={{ width: "100%", ...style }}
      value={value || undefined}
      placeholder={resolvedPlaceholder}
      disabled={disabled}
      allowClear={allowAll}
      treeDefaultExpandAll
      treeLine
      showSearch
      treeNodeFilterProp="title"
      treeData={treeData}
      onChange={(v) => onChange(String(v ?? ""))}
    />
  );
}
