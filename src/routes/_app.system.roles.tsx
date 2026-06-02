import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteRole,
  getDimensionTree,
  getMenuPermissions,
  getRoleMenuTree,
  getUserPermissions,
  pageRoles,
  saveRole,
  saveRoleMenus,
  saveRolePermissions,
} from "@/api/sys";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import {
  buildRoleMenuTree,
  bubbleMenuTreeState,
  collectRoleMenuChanges,
  type RoleMenuTreeNode,
} from "@/lib/role-menu-tree";
import { toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import type { PageQuery, SysRolePageDto, SysRolePermissionDto } from "@/types";

export const Route = createFileRoute("/_app/system/roles")({
  component: RolesPage,
});

type RoleRow = {
  id: string;
  name: string;
  org: string;
  orgId: string;
  updatedAt: string;
  raw: SysRolePageDto;
};

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.update_time", order: "desc" }];

function mapRoleRow(dto: SysRolePageDto): RoleRow {
  const po = dto.sysRolePo;
  return {
    id: String(po.id ?? ""),
    name: po.roleName ?? "—",
    org: dto.sysDimensionPo?.name ?? "—",
    orgId: String(po.orgId ?? ""),
    updatedAt: po.updateTime ?? "—",
    raw: dto,
  };
}

function RolesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", orgId: "" });
  const [saving, setSaving] = useState(false);

  const [menuRole, setMenuRole] = useState<RoleRow | null>(null);
  const [menuTree, setMenuTree] = useState<RoleMenuTreeNode[]>([]);
  const [menuRootIds, setMenuRootIds] = useState<Set<number | string>>(new Set());
  const [menuChecked, setMenuChecked] = useState<Set<number | string>>(new Set());
  const [menuLoading, setMenuLoading] = useState(false);

  const [permNode, setPermNode] = useState<RoleMenuTreeNode | null>(null);
  const [permOptions, setPermOptions] = useState<SysRolePermissionDto[]>([]);
  const [permChecked, setPermChecked] = useState<Set<number | string>>(new Set());
  const [permLoading, setPermLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pageRoles({
        current: page,
        size: pageSize,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapRoleRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      toast.error(err instanceof Error ? err.message : t("roles.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void getDimensionTree()
      .then((root) => setOrgNodes(dimensionToOrgNodes(root)))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
        toast.error(err instanceof Error ? err.message : t("roles.loadOrgFailed"));
      });
    void fetchRoles();
  }, [fetchRoles]);

  const openMenu = async (row: RoleRow) => {
    setMenuRole(row);
    setPermNode(null);
    setMenuLoading(true);
    try {
      const apiNodes = await getRoleMenuTree({ roleId: row.id });
      const built = buildRoleMenuTree(apiNodes);
      setMenuTree(built.tree);
      setMenuRootIds(built.rootIds);
      setMenuChecked(new Set(built.checkedKeys));
    } finally {
      setMenuLoading(false);
    }
  };

  const toggleMenu = (node: RoleMenuTreeNode, checked: boolean) => {
    if (menuRootIds.has(node.id)) {
      node.state = checked ? 1 : 0;
      bubbleMenuTreeState(menuTree);
      setMenuTree([...menuTree]);
      setMenuChecked((prev) => {
        const next = new Set(prev);
        if (checked) next.add(node.id);
        else next.delete(node.id);
        return next;
      });
    } else {
      node.state = checked ? 1 : 0;
      bubbleMenuTreeState(menuTree);
      setMenuTree([...menuTree]);
    }
  };

  const openPerm = async (node: RoleMenuTreeNode) => {
    if (!menuRole || node.children.length) return;
    setPermNode(node);
    setPermLoading(true);
    try {
      const [menuPerms, rolePerms] = await Promise.all([
        getMenuPermissions({ menuId: node.id, roleId: menuRole.id }),
        getUserPermissions({ menuId: node.id, roleId: menuRole.id }),
      ]);
      const options: SysRolePermissionDto[] = [];
      const checked = new Set<number | string>();
      for (const perm of menuPerms) {
        const matched = rolePerms.find((item) => item.id === perm.id);
        if (matched) {
          options.push(matched);
          if (matched.permissionStatus === 1 && matched.id != null) {
            checked.add(matched.id);
          }
        }
      }
      setPermOptions(options);
      setPermChecked(checked);
    } finally {
      setPermLoading(false);
    }
  };

  const saveMenu = async () => {
    if (!menuRole) return;
    const changes: Array<{
      id?: number | string;
      roleId: number | string;
      menuId: number | string;
      state: number;
    }> = [];
    collectRoleMenuChanges(menuTree, menuRole.id, changes);
    if (!changes.length) {
      setMenuRole(null);
      return;
    }
    setSaving(true);
    try {
      await saveRoleMenus(changes);
      toast.success(t("roles.menuSaved"));
      setMenuRole(null);
      await fetchRoles();
    } finally {
      setSaving(false);
    }
  };

  const savePerm = async () => {
    if (!menuRole || !permNode) return;
    const submitData = permOptions.map((item) => ({
      id: item.rolePermissionId,
      roleId: menuRole.id,
      permissionId: item.id!,
      state: permChecked.has(item.id!) ? 1 : 0,
    }));
    setSaving(true);
    try {
      await saveRolePermissions(submitData);
      toast.success(t("roles.permSaved"));
      setPermNode(null);
    } finally {
      setSaving(false);
    }
  };

  const saveAdd = async () => {
    if (!draft.name.trim() || !draft.orgId) {
      toast.error(t("common.requiredHint"));
      return;
    }
    setSaving(true);
    try {
      await saveRole({ roleName: draft.name.trim(), orgId: toDbId(draft.orgId) });
      toast.success(t("roles.addSuccess"));
      setAddOpen(false);
      setDraft({ name: "", orgId: "" });
      setPage(1);
      await fetchRoles();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: RoleRow) => {
    await deleteRole(row.id);
    toast.success(t("common.deleteSuccess"));
    await fetchRoles();
  };

  return (
    <>
      <ListPageTemplate<RoleRow>
        title={t("roles.title")}
        loading={loading}
        serverSide
        rows={rows}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        columns={[
          {
            key: "name",
            title: t("roles.name"),
            align: "center",
            render: (r) => (
              <button
                type="button"
                onClick={() => void openMenu(r)}
                className="text-foreground transition hover:text-primary"
              >
                {r.name}
              </button>
            ),
          },
          { key: "org", title: t("roles.org"), align: "center" },
          {
            key: "updatedAt",
            title: t("roles.updatedAt"),
            align: "center",
            render: (r) => (
              <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span>
            ),
          },
        ]}
        onAdd={() => setAddOpen(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => void openMenu(r)}>{t("roles.menuPerm")}</RowBtn>
            <RowBtn
              danger
              confirm={{
                description: (
                  <>
                    {t("common.confirmDeleteDesc", { target: t("roles.deleteTarget"), name: r.name })}
                  </>
                ),
              }}
              onClick={() => void handleDelete(r)}
            >
              {t("common.delete")}
            </RowBtn>
          </>
        )}
      />

      <VtDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("roles.add")}
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setAddOpen(false)}>{t("common.close")}</VtBtn>
            <VtBtn onClick={() => void saveAdd()} disabled={saving}>{t("common.save")}</VtBtn>
          </>
        }
      >
        <VtField label={t("roles.name")} required>
          <input
            className={vtInputCls}
            placeholder={t("roles.namePlaceholder")}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </VtField>
        <VtField label={t("users.org")} required>
          <OrgTreeSelect
            nodes={orgNodes}
            value={draft.orgId}
            onChange={(v) => setDraft({ ...draft, orgId: v })}
          />
        </VtField>
      </VtDrawer>

      <VtDrawer
        open={!!menuRole}
        onClose={() => {
          setMenuRole(null);
          setPermNode(null);
        }}
        title={t("roles.menuDrawer")}
        width={420}
        zIndex={50}
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setMenuRole(null)}>{t("common.close")}</VtBtn>
            <VtBtn onClick={() => void saveMenu()} disabled={saving}>{t("common.saveSubmit")}</VtBtn>
          </>
        }
      >
        {menuLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="text-xs">
            {menuTree.map((node) => (
              <MenuTreeNode
                key={String(node.id)}
                node={node}
                rootIds={menuRootIds}
                menuChecked={menuChecked}
                activeId={permNode?.id ?? null}
                onToggle={toggleMenu}
                onLeafClick={(n) => void openPerm(n)}
              />
            ))}
          </div>
        )}
      </VtDrawer>

      <VtDrawer
        open={!!permNode}
        onClose={() => setPermNode(null)}
        title={t("roles.permDrawer")}
        width={560}
        zIndex={60}
        hideOverlay
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setPermNode(null)}>{t("common.cancel")}</VtBtn>
            <VtBtn onClick={() => void savePerm()} disabled={saving}>{t("common.save")}</VtBtn>
          </>
        }
      >
        {permLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : permNode ? (
          <>
            <VtField label={t("roles.menuName")}>
              <input className={vtInputCls} value={permNode.label} disabled />
            </VtField>
            <VtField label={t("roles.menuPath")}>
              <input className={vtInputCls} value={permNode.path ?? "—"} disabled />
            </VtField>
            <VtField label={t("roles.permission")}>
              <div className="flex flex-wrap gap-2">
                {permOptions.map((p) => {
                  const active = permChecked.has(p.id!);
                  return (
                    <label
                      key={String(p.id)}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition ${
                        active
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-panel-border bg-panel/40 text-text-secondary hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={active}
                        onChange={() => {
                          setPermChecked((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id!)) next.delete(p.id!);
                            else next.add(p.id!);
                            return next;
                          });
                        }}
                      />
                      {permNode.label}-{p.name}
                    </label>
                  );
                })}
              </div>
            </VtField>
          </>
        ) : null}
      </VtDrawer>
    </>
  );
}

function MenuTreeNode({
  node,
  rootIds,
  menuChecked,
  activeId,
  onToggle,
  onLeafClick,
  depth = 0,
}: {
  node: RoleMenuTreeNode;
  rootIds: Set<number | string>;
  menuChecked: Set<number | string>;
  activeId: number | string | null;
  onToggle: (node: RoleMenuTreeNode, checked: boolean) => void;
  onLeafClick: (node: RoleMenuTreeNode) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const isRoot = rootIds.has(node.id);
  const checked = isRoot ? menuChecked.has(node.id) : node.state === 1;

  return (
    <div className="mb-1" style={{ marginLeft: depth * 12 }}>
      <div className="flex items-center gap-1.5 py-1">
        {hasChildren ? (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-text-muted">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <input
          type="checkbox"
          className="accent-primary"
          checked={checked}
          onChange={(e) => onToggle(node, e.target.checked)}
        />
        <button
          type="button"
          onClick={() => !hasChildren && onLeafClick(node)}
          className={`text-left transition ${
            hasChildren ? "cursor-default text-foreground" : "cursor-pointer hover:text-primary"
          } ${activeId === node.id ? "text-primary" : ""}`}
        >
          {node.label}
        </button>
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <MenuTreeNode
              key={String(child.id)}
              node={child}
              rootIds={rootIds}
              menuChecked={menuChecked}
              activeId={activeId}
              onToggle={onToggle}
              onLeafClick={onLeafClick}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
