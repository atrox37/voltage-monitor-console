import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { deleteUser, getDimensionTree, pageRoles, pageUsers, saveUser } from "@/api/sys";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { VtBtn, VtDrawer, VtField, VtSegmented, vtInputCls } from "@/components/vt-drawer";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import { termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
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
  status: "online" | "disabled";
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
    status: po.state === 0 ? "disabled" : "online",
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
  status: "online" | "disabled";
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
    status: "online",
  };
}

function UsersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<SysRolePo[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

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
      toast.error(err instanceof Error ? err.message : t("users.loadMetaFailed"));
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
      toast.error(err instanceof Error ? err.message : t("users.loadFailed"));
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
      status: po.state === 0 ? "disabled" : "online",
    });
    setIsAdd(false);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.username.trim() || !editing.roleId || !editing.orgId || !editing.email.trim()) {
      toast.error(t("common.requiredHint"));
      return;
    }
    if (isAdd && !editing.password.trim()) {
      toast.error(t("users.passwordPlaceholder"));
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
      toast.success(t("common.saveSuccess"));
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
      toast.success(t("users.passwordUpdated"));
      setPassUser(null);
      setNewPass("");
      await fetchUsers();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: UserRow) => {
    await deleteUser(row.id);
    toast.success(t("common.deleteSuccess"));
    await fetchUsers();
  };

  return (
    <>
      <ListPageTemplate<UserRow>
        actionColumnWidth={280}
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
          {
            type: "text",
            key: "username",
            label: t("users.username"),
            placeholder: t("users.usernamePlaceholder"),
          },
          {
            type: "orgTree",
            key: "orgId",
            label: t("users.org"),
            nodes: orgNodes,
            allowAll: true,
            placeholder: t("users.orgPlaceholder"),
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
              icon={Lock}
              onClick={() => {
                setPassUser({ ...r.raw.sysUserPo });
                setNewPass("");
              }}
            >
              {t("users.changePassword")}
            </RowBtn>
            <RowBtn
              danger
              confirm={{
                description: (
                  <>
                    {t("common.confirmDeleteDesc", { target: t("users.deleteTarget"), name: r.username })}
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
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isAdd ? t("users.create") : t("users.edit")}
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setEditing(null)}>{t("common.close")}</VtBtn>
            <VtBtn onClick={() => void save()} disabled={saving}>
              {saving ? t("common.saving") : t("common.saveSubmit")}
            </VtBtn>
          </>
        }
      >
        {editing && (
          <div>
            <VtField label={t("users.username")} required>
              <input
                className={vtInputCls}
                value={editing.username}
                placeholder={t("users.usernamePlaceholder")}
                onChange={(e) => setEditing({ ...editing, username: e.target.value })}
              />
            </VtField>
            <VtField label={t("users.role")} required>
              <select
                className={vtInputCls}
                value={editing.roleId}
                onChange={(e) => setEditing({ ...editing, roleId: e.target.value })}
              >
                <option value="">{t("users.selectRole")}</option>
                {roles.map((r) => (
                  <option key={String(r.id)} value={String(r.id)}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </VtField>
            <VtField label={t("users.org")} required>
              <OrgTreeSelect
                nodes={orgNodes}
                value={editing.orgId}
                onChange={(v) => setEditing({ ...editing, orgId: v })}
              />
            </VtField>
            <VtField label={t("users.email")} required>
              <input
                className={vtInputCls}
                type="email"
                value={editing.email}
                placeholder="user@example.com"
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
            </VtField>
            <VtField label={t("users.phone")}>
              <input
                className={vtInputCls}
                value={editing.phone}
                placeholder={t("users.phonePlaceholder")}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              />
            </VtField>
            {isAdd && (
              <VtField label={t("users.password")} required>
                <input
                  className={vtInputCls}
                  type="password"
                  autoComplete="new-password"
                  value={editing.password}
                  placeholder={t("users.passwordPlaceholder")}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                />
              </VtField>
            )}
            <VtField label={t("common.status")}>
              <VtSegmented<UserForm["status"]>
                value={editing.status}
                onChange={(v) => setEditing({ ...editing, status: v })}
                options={[
                  { label: t("common.disabled"), value: "disabled", tone: "critical" },
                  { label: t("common.normal"), value: "online", tone: "online" },
                ]}
              />
            </VtField>
          </div>
        )}
      </VtDrawer>

      <VtDrawer
        open={!!passUser}
        onClose={() => {
          setPassUser(null);
          setNewPass("");
        }}
        title={t("users.changePasswordTitle", { name: passUser?.username ?? "" })}
        width={400}
        zIndex={60}
        footer={
          <>
            <VtBtn
              variant="ghost"
              onClick={() => {
                setPassUser(null);
                setNewPass("");
              }}
            >
              {t("common.cancel")}
            </VtBtn>
            <VtBtn onClick={() => void savePass()} disabled={saving}>
              {t("common.modify")}
            </VtBtn>
          </>
        }
      >
        <VtField label={t("users.password")} required>
          <input
            className={vtInputCls}
            type="password"
            autoComplete="new-password"
            placeholder={t("users.newPasswordPlaceholder")}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            autoFocus
          />
        </VtField>
      </VtDrawer>
    </>
  );
}
