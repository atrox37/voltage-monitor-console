import type { RoleMenuNode } from "@/types";

export interface RoleMenuTreeNode {
  id: number | string;
  label: string;
  children: RoleMenuTreeNode[];
  state: number;
  statusSource: number;
  roleMenuId?: number | string;
  path?: string;
}

export function buildRoleMenuTree(apiNodes: RoleMenuNode[]): {
  tree: RoleMenuTreeNode[];
  rootIds: Set<number | string>;
  checkedKeys: (number | string)[];
} {
  const rootIds = new Set<number | string>();
  for (const item of apiNodes) {
    if (item.children?.length) {
      rootIds.add(item.id);
    }
  }

  const tree = apiNodes.map((item) => mapMenuNode(item));
  const checkedKeys: (number | string)[] = [];
  collectCheckedKeys(apiNodes, rootIds, checkedKeys);
  return { tree, rootIds, checkedKeys };
}

function mapMenuNode(item: RoleMenuNode): RoleMenuTreeNode {
  const node: RoleMenuTreeNode = {
    id: item.id,
    label: item.name,
    children: [],
    state: item.state,
    statusSource: item.state,
    roleMenuId: item.roleMenuId,
  };

  if (item.children?.length) {
    node.children = item.children.map((child) => mapMenuNode(child));
  } else {
    node.path = item.path;
  }

  return node;
}

function collectCheckedKeys(
  nodes: RoleMenuNode[],
  rootIds: Set<number | string>,
  checkedKeys: (number | string)[],
) {
  for (const item of nodes) {
    if (rootIds.has(item.id) && item.state === 1) {
      checkedKeys.push(item.id);
    }
    if (item.children?.length) {
      collectCheckedKeys(item.children, rootIds, checkedKeys);
    }
  }
}

export function bubbleMenuTreeState(nodes: RoleMenuTreeNode[]): void {
  for (const node of nodes) {
    if (node.children.length) {
      bubbleMenuTreeState(node.children);
      node.state = node.children.some((child) => child.state === 1) ? 1 : 0;
    }
  }
}

export function findRoleMenuNode(
  nodes: RoleMenuTreeNode[],
  id: number | string,
): RoleMenuTreeNode | null {
  for (const node of nodes) {
    if (String(node.id) === String(id)) return node;
    if (node.children.length) {
      const hit = findRoleMenuNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function collectRoleMenuCheckedKeys(
  nodes: RoleMenuTreeNode[],
  rootIds: Set<number | string>,
  menuChecked: Set<number | string>,
): (number | string)[] {
  const keys: (number | string)[] = [];
  const walk = (list: RoleMenuTreeNode[]) => {
    for (const node of list) {
      const isRoot = rootIds.has(node.id);
      const checked = isRoot ? menuChecked.has(node.id) : node.state === 1;
      if (checked) keys.push(node.id);
      if (node.children.length) walk(node.children);
    }
  };
  walk(nodes);
  return keys;
}

export function collectRoleMenuChanges(
  nodes: RoleMenuTreeNode[],
  roleId: number | string,
  result: Array<{
    id?: number | string;
    roleId: number | string;
    menuId: number | string;
    state: number;
  }>,
) {
  for (const node of nodes) {
    if (node.state !== node.statusSource) {
      result.push({
        id: node.roleMenuId,
        roleId,
        menuId: node.id,
        state: node.state,
      });
    }
    if (node.children.length) {
      collectRoleMenuChanges(node.children, roleId, result);
    }
  }
}
