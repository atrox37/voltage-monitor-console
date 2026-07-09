import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DownOutlined, LoadingOutlined, RightOutlined } from "@ant-design/icons";
import { Checkbox, Drawer, Form, Input } from "antd";
import { drawerFooter, drawerFormItemProps } from "@/components/drawer-form";
import { showError, showSuccess } from "@/lib/api-message";
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
import { ListPageTemplate, RowBtn, DateTimeText } from "@/components/list-page-template";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import {
  buildRoleMenuTree,
  bubbleMenuTreeState,
  collectRoleMenuChanges,
  type RoleMenuTreeNode,
} from "@/features/system/lib/role-menu-tree";
import { termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { useTranslation } from "@/i18n";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { requiredInputRule, requiredSelectRule } from "@/lib/form-validation";
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
    name: po.roleName ?? "?",
    org: dto.sysDimensionPo?.name ?? "?",
    orgId: String(po.orgId ?? ""),
    updatedAt: po.updateTime ?? "?",
    raw: dto,
  };
}

function RolesPage() {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const [formApi] = Form.useForm<{ name: string; orgId: string }>();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;
  const [filterDraft, setFilterDraft] = useState({ name: "", orgId: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "", orgId: "" });

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
      const terms = [];
      const { name, orgId } = filterApplied;
      if (name) terms.push(termLike("t.role_name", name));
      if (orgId) terms.push(termEq("t.org_id", toDbId(orgId)));

      const result = await pageRoles({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapRoleRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      showError(err instanceof Error ? err.message : t("roles.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied, page, pageSize, t]);

  useEffect(() => {
    void getDimensionTree()
      .then((root) => setOrgNodes(dimensionToOrgNodes(root)))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
        showError(err instanceof Error ? err.message : t("roles.loadOrgFailed"));
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
      showSuccess(t("roles.menuSaved"));
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
      showSuccess(t("roles.permSaved"));
      setPermNode(null);
    } finally {
      setSaving(false);
    }
  };

  const saveAdd = async () => {
    try {
      await formApi.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await saveRole({ roleName: draft.name.trim(), orgId: toDbId(draft.orgId) });
      showSuccess(t("roles.addSuccess"));
      setAddOpen(false);
      setDraft({ name: "", orgId: "" });
      formApi.resetFields();
      setPage(1);
      await fetchRoles();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: RoleRow) => {
    await deleteRole(row.id);
    showSuccess(t("common.deleteSuccess"));
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
        onSearch={() => {
          setFilterApplied({ ...filterDraft });
          setPage(1);
        }}
        onReset={() => {
          const empty = { name: "", orgId: "" };
          setFilterDraft(empty);
          setFilterApplied(empty);
          setPage(1);
        }}
        filterValues={filterDraft}
        onFilterValuesChange={(draft) =>
          setFilterDraft({ name: draft.name ?? "", orgId: draft.orgId ?? "" })
        }
        filters={[
          { type: "text", key: "name", label: t("roles.name") },
          {
            type: "orgTree",
            key: "orgId",
            label: t("roles.org"),
            nodes: orgNodes,
          },
        ]}
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
            render: (r) => <DateTimeText value={r.updatedAt} />,
          },
        ]}
        onAdd={() => {
          const next = { name: "", orgId: "" };
          setDraft(next);
          formApi.setFieldsValue(next);
          setAddOpen(true);
        }}
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

      <Drawer
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          formApi.resetFields();
        }}
        title={t("roles.add")}
        size={480}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={drawerFooter([
          { key: "close", label: t("common.close"), onClick: () => setAddOpen(false) },
          {
            key: "save",
            label: t("common.save"),
            type: "primary",
            disabled: saving,
            onClick: () => void saveAdd(),
          },
        ])}
      >
        <Form form={formApi} layout="horizontal">
          <Form.Item
            name="name"
            label={t("roles.name")}
            required
            {...drawerFormItemProps}
            rules={[requiredInputRule(t, t("roles.name"))]}
          >
            <Input
              placeholder={ph.input(t("roles.name"))}
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value });
                formApi.setFieldValue("name", e.target.value);
              }}
            />
          </Form.Item>
          <Form.Item
            name="orgId"
            label={t("users.org")}
            required
            {...drawerFormItemProps}
            rules={[requiredSelectRule(t, t("users.org"))]}
          >
            <OrgTreeSelect
              nodes={orgNodes}
              value={draft.orgId}
              placeholder={ph.select(t("users.org"))}
              onChange={(v) => {
                setDraft({ ...draft, orgId: v });
                formApi.setFieldValue("orgId", v);
              }}
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        open={!!menuRole}
        onClose={() => {
          setMenuRole(null);
          setPermNode(null);
        }}
        title={t("roles.menuDrawer")}
        size={permNode ? 480 : 420}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={drawerFooter([
          { key: "close", label: t("common.close"), onClick: () => { setMenuRole(null); setPermNode(null); } },
          {
            key: "save",
            label: t("common.saveSubmit"),
            type: "primary",
            disabled: saving,
            onClick: () => void saveMenu(),
          },
        ])}
      >
        {menuLoading ? (
          <div className="flex justify-center py-12">
            <LoadingOutlined spin className="text-2xl text-text-muted" />
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

        <Drawer
          open={!!permNode}
          onClose={() => setPermNode(null)}
          title={t("roles.permDrawer")}
          size={560}
          destroyOnHidden
          styles={{ body: { paddingTop: 8 } }}
          footer={drawerFooter([
            { key: "cancel", label: t("common.cancel"), onClick: () => setPermNode(null) },
            {
              key: "save",
              label: t("common.save"),
              type: "primary",
              disabled: saving,
              onClick: () => void savePerm(),
            },
          ])}
        >
          {permLoading ? (
            <div className="flex justify-center py-12">
              <LoadingOutlined spin className="text-2xl text-text-muted" />
            </div>
          ) : permNode ? (
            <>
              <Form.Item label={t("roles.menuName")} {...drawerFormItemProps}>
                <Input value={permNode.label} disabled />
              </Form.Item>
              <Form.Item label={t("roles.menuPath")} {...drawerFormItemProps}>
                <Input value={permNode.path ?? "?"} disabled />
              </Form.Item>
              <Form.Item label={t("roles.permission")} {...drawerFormItemProps}>
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
                        <Checkbox
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
              </Form.Item>
            </>
          ) : null}
        </Drawer>
      </Drawer>
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
            {open ? <DownOutlined className="text-xs" /> : <RightOutlined className="text-xs" />}
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
