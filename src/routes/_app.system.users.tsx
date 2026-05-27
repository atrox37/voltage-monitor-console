import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
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
  const [isAdd, setIsAdd] = useState(false);
  const [passUser, setPassUser] = useState<User | null>(null);
  const [newPass, setNewPass] = useState("");

  const openAdd  = () => { setEditing(emptyUser()); setIsAdd(true); };
  const openEdit = (u: User) => { setEditing({ ...u }); setIsAdd(false); };
  const close    = () => setEditing(null);

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

  const savePass = () => {
    if (!passUser || !newPass.trim()) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    setRows((rs) => rs.map((r) => (r.id === passUser.id ? { ...r, updatedAt: now } : r)));
    setPassUser(null);
    setNewPass("");
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
            <RowBtn icon={Lock} onClick={() => { setPassUser(r); setNewPass(""); }}>修改密码</RowBtn>
            <RowBtn danger onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>删除</RowBtn>
          </>
        )}
      />

      {/* Edit / Add Drawer */}
      <VtDrawer
        open={!!editing}
        onClose={close}
        title={isAdd ? "新建用户" : "编辑用户"}
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
              <input className={vtInputCls} value={editing.username} placeholder="请输入用户名"
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
            <VtField label="邮箱" required>
              <input className={vtInputCls} type="email" value={editing.email} placeholder="user@example.com"
                onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </VtField>
            <VtField label="电话">
              <input className={vtInputCls} value={editing.phone ?? ""} placeholder="请输入电话"
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </VtField>
            {isAdd && (
              <VtField label="密码" required>
                <input className={vtInputCls} type="password" autoComplete="new-password"
                  placeholder="请输入密码" />
              </VtField>
            )}
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

      {/* Change password dialog (drawer) */}
      <VtDrawer
        open={!!passUser}
        onClose={() => { setPassUser(null); setNewPass(""); }}
        title={`修改密码 — ${passUser?.username ?? ""}`}
        width={400}
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => { setPassUser(null); setNewPass(""); }}>取消</VtBtn>
            <VtBtn onClick={savePass}>修改</VtBtn>
          </>
        }
      >
        <VtField label="密码" required>
          <input
            className={vtInputCls}
            type="password"
            autoComplete="new-password"
            placeholder="请输入新密码"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            autoFocus
          />
        </VtField>
        <p className="ml-[84px] mt-1 text-xs text-text-muted">提交后该用户将使用新密码登录。</p>
      </VtDrawer>
    </>
  );
}
