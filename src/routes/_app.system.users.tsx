import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { LockOutlined } from "@ant-design/icons";
import { Drawer, Form, Input, Select } from "antd";
import { OptionToggle } from "@/components/option-toggle";
import { drawerFooter, drawerFormItemProps } from "@/components/drawer-form";
import { showError, showSuccess } from "@/lib/api-message";
import { getDimensionTree, pageRoles, pageUsers, saveUser } from "@/api/sys";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import type { PageQuery, SysRolePo, SysUserPageDto, SysUserPo } from "@/types";

export const Route = createFileRoute("/_app/system/users")({
  component: UsersPage,
});

type UserRow = {
  id: string;
  username: string;
  role: string;
  roleId: string;
  org: string;
  orgId: string;
  email: string;
  phone?: string;
  status: "enabled" | "disabled";
  updatedAt: string;
  raw: SysUserPageDto;
};

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.update_time", order: "desc" }];

function mapUserRow(dto: SysUserPageDto): UserRow {
  const po = dto.sysUserPo;
  return {
    id: String(po.id ?? ""),
    username: po.username,
    role: dto.sysRolePo?.roleName ?? "—",
    roleId: String(po.roleId ?? ""),
    org: dto.dimensionPo?.name ?? "—",
    orgId: String(po.orgId ?? ""),
    email: po.email ?? "",
    phone: po.phone,
    status: po.state === 0 ? "disabled" : "enabled",
    updatedAt: po.updateTime ?? "—",
    raw: dto,
  };
}

type UserForm = {
  id: string;
  username: string;
  roleId: string;
  orgId: string;
  email: string;
  phone: string;
  password: string;
  status: "enabled" | "disabled";
};

function emptyForm(): UserForm {
  return {
    id: "",
    username: "",
    roleId: "",
    orgId: "",
    email: "",
    phone: "",
    password: "",
    status: "enabled",
  };
}

function UsersPage() {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<SysRolePo[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [filterDraft, setFilterDraft] = useState({ username: "", orgId: "" });
  const [filterApplied, setFilterApplied] = useState({ username: "", orgId: "" });

  const [editing, setEditing] = useState<UserForm | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [passUser, setPassUser] = useState<SysUserPo | null>(null);
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const [roleRes, root] = await Promise.all([
        pageRoles({ current: 1, size: -1 }),
        getDimensionTree(),
      ]);
      const roleRows = roleRes.records ?? roleRes.data ?? [];
      setRoles(roleRows.map((r) => r.sysRolePo).filter(Boolean) as SysRolePo[]);
      setOrgNodes(dimensionToOrgNodes(root));
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("users.loadMetaFailed"));
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const terms = [];
      const username = filterApplied.username.trim();
      if (username) terms.push(termLike("t.username", username));
      if (filterApplied.orgId) {
        terms.push(termEq("t.org_id", toDbId(filterApplied.orgId)));
      }
      const result = await pageUsers({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapUserRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      showError(err instanceof Error ? err.message : t("users.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied.orgId, filterApplied.username, page]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const openAdd = () => {
    setEditing(emptyForm());
    setIsAdd(true);
  };

  const openEdit = (row: UserRow) => {
    const po = row.raw.sysUserPo;
    setEditing({
      id: String(po.id ?? ""),
      username: po.username,
      roleId: String(po.roleId ?? ""),
      orgId: String(po.orgId ?? ""),
      email: po.email ?? "",
      phone: po.phone ?? "",
      password: "",
      status: po.state === 0 ? "disabled" : "enabled",
    });
    setIsAdd(false);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.username.trim() || !editing.roleId || !editing.orgId || !editing.email.trim()) {
      showError(t("common.requiredHint"));
      return;
    }
    if (isAdd && !editing.password.trim()) {
      showError(t("users.passwordPlaceholder"));
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<SysUserPo> = {
        id: editing.id || undefined,
        username: editing.username.trim(),
        roleId: toDbId(editing.roleId),
        orgId: toDbId(editing.orgId),
        email: editing.email.trim(),
        phone: editing.phone.trim() || undefined,
        state: editing.status === "disabled" ? 0 : 1,
      };
      if (isAdd) {
        payload.password = CryptoJS.MD5(editing.password).toString();
      }
      await saveUser(payload);
      showSuccess(t("common.saveSuccess"));
      setEditing(null);
      setPage(1);
      await fetchUsers();
    } finally {
      setSaving(false);
    }
  };

  const savePass = async () => {
    if (!passUser?.id || !newPass.trim()) return;
    setSaving(true);
    try {
      await saveUser({
        id: passUser.id,
        username: passUser.username,
        roleId: passUser.roleId,
        orgId: passUser.orgId,
        email: passUser.email,
        phone: passUser.phone,
        state: passUser.state,
        password: CryptoJS.MD5(newPass).toString(),
      });
      showSuccess(t("users.passwordUpdated"));
      setPassUser(null);
      setNewPass("");
      await fetchUsers();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageTemplate<UserRow>
        actionColumnWidth={220}
        title={t("users.title")}
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
          setFilterDraft({ username: "", orgId: "" });
          setFilterApplied({ username: "", orgId: "" });
          setPage(1);
        }}
        filterValues={filterDraft}
        onFilterValuesChange={(draft) =>
          setFilterDraft({ username: draft.username ?? "", orgId: draft.orgId ?? "" })
        }
        filters={[
          { type: "text", key: "username", label: t("users.username") },
          {
            type: "orgTree",
            key: "orgId",
            label: t("users.org"),
            nodes: orgNodes,
          },
        ]}
        columns={[
          { key: "username", title: t("users.username") },
          { key: "role", title: t("users.role") },
          { key: "org", title: t("users.org") },
          {
            key: "email",
            title: t("users.email"),
            render: (r) => <span className="text-text-secondary">{r.email}</span>,
          },
          {
            key: "status",
            title: t("common.status"),
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "updatedAt",
            title: t("users.updatedAt"),
            render: (r) => (
              <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span>
            ),
          },
        ]}
        onAdd={openAdd}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => openEdit(r)}>{t("common.edit")}</RowBtn>
            <RowBtn
              icon={LockOutlined}
              onClick={() => {
                setPassUser({ ...r.raw.sysUserPo });
                setNewPass("");
              }}
            >
              {t("users.changePassword")}
            </RowBtn>
          </>
        )}
      />

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isAdd ? t("users.create") : t("users.edit")}
        size={480}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={drawerFooter([
          { key: "close", label: t("common.close"), onClick: () => setEditing(null) },
          {
            key: "save",
            label: saving ? t("common.saving") : t("common.saveSubmit"),
            type: "primary",
            disabled: saving,
            onClick: () => void save(),
          },
        ])}
      >
        {editing && (
          <>
            <Form.Item label={t("users.username")} required {...drawerFormItemProps}>
              <Input
                value={editing.username}
                placeholder={ph.input(t("users.username"))}
                onChange={(e) => setEditing({ ...editing, username: e.target.value })}
              />
            </Form.Item>
            <Form.Item label={t("users.role")} required {...drawerFormItemProps}>
              <Select
                value={editing.roleId || undefined}
                placeholder={ph.select(t("users.role"))}
                onChange={(roleId) => setEditing({ ...editing, roleId })}
                options={roles.map((r) => ({
                  value: String(r.id),
                  label: r.roleName ?? "",
                }))}
              />
            </Form.Item>
            <Form.Item label={t("users.org")} required {...drawerFormItemProps}>
              <OrgTreeSelect
                nodes={orgNodes}
                value={editing.orgId}
                placeholder={ph.select(t("users.org"))}
                onChange={(v) => setEditing({ ...editing, orgId: v })}
              />
            </Form.Item>
            <Form.Item label={t("users.email")} required {...drawerFormItemProps}>
              <Input
                type="email"
                value={editing.email}
                placeholder={ph.input(t("users.email"))}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
            </Form.Item>
            <Form.Item label={t("users.phone")} {...drawerFormItemProps}>
              <Input
                value={editing.phone}
                placeholder={ph.input(t("users.phone"))}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              />
            </Form.Item>
            {isAdd && (
              <Form.Item label={t("users.password")} required {...drawerFormItemProps}>
                <Input.Password
                  autoComplete="new-password"
                  value={editing.password}
                  placeholder={ph.input(t("users.password"))}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                />
              </Form.Item>
            )}
            <Form.Item label={t("common.status")} {...drawerFormItemProps}>
              <OptionToggle<UserForm["status"]>
                value={editing.status}
                onChange={(v) => setEditing({ ...editing, status: v })}
                options={[
                  { label: t("common.disabled"), value: "disabled" },
                  { label: t("common.enabled"), value: "enabled" },
                ]}
              />
            </Form.Item>
          </>
        )}
      </Drawer>

      <Drawer
        open={!!passUser}
        onClose={() => {
          setPassUser(null);
          setNewPass("");
        }}
        title={t("users.changePasswordTitle", { name: passUser?.username ?? "" })}
        size={400}
        zIndex={1100}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={drawerFooter([
          {
            key: "cancel",
            label: t("common.cancel"),
            onClick: () => {
              setPassUser(null);
              setNewPass("");
            },
          },
          {
            key: "save",
            label: t("common.modify"),
            type: "primary",
            disabled: saving,
            onClick: () => void savePass(),
          },
        ])}
      >
        <Form.Item label={t("users.password")} required {...drawerFormItemProps}>
          <Input.Password
            autoComplete="new-password"
            placeholder={ph.input(t("users.password"))}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            autoFocus
          />
        </Form.Item>
      </Drawer>
    </>
  );
}
