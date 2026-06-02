import type { SysDimensionPo } from "@/types";
import type { OrgNode } from "@/components/org-tree-select";

export interface TreeSelectNode {
  value: number | string;
  label: string;
  children?: TreeSelectNode[];
}

export function mapDimensionToTreeSelect(po: SysDimensionPo): TreeSelectNode {
  const node: TreeSelectNode = {
    value: po.id ?? "",
    label: po.name,
    children: [],
  };
  if (po.children?.length) {
    node.children = po.children.map(mapDimensionToTreeSelect);
  }
  return node;
}

export function wrapDimensionFilterTree(root: SysDimensionPo, allLabel = "全部"): TreeSelectNode[] {
  return [
    {
      value: -1,
      label: allLabel,
      children: [mapDimensionToTreeSelect(root)],
    },
  ];
}

export function wrapDimensionFormTree(root: SysDimensionPo): TreeSelectNode[] {
  return [mapDimensionToTreeSelect(root)];
}

export function dimensionToOrgNodes(root: SysDimensionPo): OrgNode[] {
  const mapNode = (po: SysDimensionPo): OrgNode => ({
    id: String(po.id ?? ""),
    label: po.name,
    parentId: po.parentId != null ? String(po.parentId) : undefined,
    children: po.children?.map(mapNode),
  });
  return [mapNode(root)];
}

export function flattenDimensionTree(root: SysDimensionPo): SysDimensionPo[] {
  const out: SysDimensionPo[] = [];
  const walk = (node: SysDimensionPo) => {
    out.push(node);
    node.children?.forEach(walk);
  };
  walk(root);
  return out;
}

export function findDimensionById(root: SysDimensionPo, id: number | string): SysDimensionPo | null {
  if (String(root.id) === String(id)) return root;
  for (const child of root.children ?? []) {
    const found = findDimensionById(child, id);
    if (found) return found;
  }
  return null;
}
