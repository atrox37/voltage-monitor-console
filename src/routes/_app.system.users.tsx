import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";
import { VtDrawer, VtField, VtBtn, VtSegmented, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";

export const Route = createFileRoute("/_app/system/users")({
  component: UsersPage,
});

type User = {
  id: string;
  username: string;
  role: string;
  org: string;
  email: string;
  phone?: string;
  status: "online" | "disabled";
  updatedAt: string;
};

const initial: User[] = [
  { id: "1", username: "root",         role: "root",     org: "Group Root",      email: "root@voltageenergy.com",         status: "online",   updatedAt: "2026-05-11 02:51:13" },
  { id: "2", username: "test222",      role: "Engineer", org: "Group Root",      email: "test222@voltageenergy.com",      status: "online",   updatedAt: "2026-04-16 10:49:06" },
  { id: "3", username: "shengkai.pan", role: "Viewer",   org: "Group Root",      email: "shengkai.pan@voltageenergy.com", status: "online",   updatedAt: "2026-01-04 03:30:31" },
  { id: "4", username: "admin",        role: "Admin",    org: "Group Root",      email: "admin@voltageenergy.com",        status: "online",   updatedAt: "2025-09-28 02:36:25" },
  { id: "5", username: "zhiyuan.wang", role: "Viewer",   org: "Group Children1", email: "zhiyuan.wang@voltageenergy.com", phone: "11111111111", status: "disabled", updatedAt: "2025-09-23 03:40:08" },
];

const ROLES = ["root", "Admin", "Engineer", "Viewer"];

function emptyUser(): User {
  return { id: "", username: "", role: "Viewer", org: "Group Root", email: "", phone: "", status: "online", updatedAt: "" };
}

function UsersPage() {
  const [rows, setRows] = useState<User[]>(initial);
  const [editing, setEditing] = useState<User | null>(null);
  const [password, setPassword] = useState("");

  const openAdd = () => { setEditing(emptyUser()); setPassword(""); };
  const openEdit = (u: User) => { setEditing({ ...u }); setPassword(""); };
  const close = () => setEditing(null);

  const save = () => {
    if (!editing) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (editing.id) {
      setRows((rs) => rs.map((r) => (r.id === editing.id ? { ...editing, updatedAt: now } : r)));
    } else {
      setRows((rs) => [...rs, { ...editing, id: String(Date.now()), updatedAt: now }]);
    }
    close();
  };

  return (
    <>
      <ListPageTemplate<User>
        title="用户管理"
        filters={[
          { type: "text", key: "username", label: "用户名", placeholder: "请输入用户名" },
          { type: "select", key: "org", label: "机构",
            options: [
              { label: "Group Root", value: "Group Root" },
              { label: "Group Children1", value: "Group Children1" },
            ],
          },
        ]}
        columns={[
          { key: "username", title: "用户名" },
          { key: "role",     title: "角色" },
          { key: "org",      title: "机构" },
          { key: "email",    title: "邮箱", render: (r) => <span className="text-text-secondary">{r.email}</span> },
          { key: "status",   title: "状态", render: (r) => <StatusBadge status={r.status} /> },
          { key: "updatedAt", title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
        ]}
        rows={rows}
        onAdd={openAdd}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => openEdit(r)}>编辑</RowBtn>
            <RowBtn>{r.status === "disabled" ? "启用" : "禁用"}</RowBtn>
            <RowBtn danger>删除</RowBtn>
          </>
        )}
      />

      <VtDrawer
        open={!!editing}
        onClose={close}
        title={editing?.id ? "编辑用户" : "新增用户"}
        footer={
          <>
            <VtBtn variant="ghost" onClick={close}>关闭</VtBtn>
            <VtBtn onClick={save}>保存提交</VtBtn>
          </>
        }
      >
        {editing && (
          <div>
            <VtField label="用户名" required>
              <input className={vtInputCls} value={editing.username}
                onChange={(e) => setEditing({ ...editing, username: e.target.value })} />
            </VtField>
            <VtField label="角色" required>
              <select className={vtInputCls} value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </VtField>
            <VtField label="机构" required>
              <OrgTreeSelect value={editing.org} onChange={(v) => setEditing({ ...editing, org: v })} />
            </VtField>
            <VtField label="邮箱">
              <input className={vtInputCls} type="email" value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </VtField>
            <VtField label="电话">
              <input className={vtInputCls} value={editing.phone ?? ""}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </VtField>
            <VtField label="密码">
              <input className={vtInputCls} type="password" autoComplete="new-password"
                placeholder={editing.id ? "留空则不修改" : "请输入密码"}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </VtField>
            <VtField label="状态">
              <VtSegmented<User["status"]>
                value={editing.status}
                onChange={(v) => setEditing({ ...editing, status: v })}
                options={[
                  { label: "禁用", value: "disabled", tone: "critical" },
                  { label: "正常", value: "online", tone: "online" },
                ]}
              />
            </VtField>
          </div>
        )}
      </VtDrawer>
    </>
  );
}
