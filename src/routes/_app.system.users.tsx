import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/system/users")({
  component: UsersPage,
});

type User = {
  id: string; username: string; role: string; org: string;
  status: "online" | "disabled"; updatedAt: string;
};

const rows: User[] = [
  { id: "1", username: "root",          role: "root",     org: "Group Root",     status: "online",   updatedAt: "2026-05-11 02:51:13" },
  { id: "2", username: "test222",       role: "Engineer", org: "Group Root",     status: "online",   updatedAt: "2026-04-16 10:49:06" },
  { id: "3", username: "shengkai.pan",  role: "Viewer",   org: "Group Root",     status: "online",   updatedAt: "2026-01-04 03:30:31" },
  { id: "4", username: "admin",         role: "Admin",    org: "Group Root",     status: "online",   updatedAt: "2025-09-28 02:36:25" },
  { id: "5", username: "zhiyuan.wang",  role: "Viewer",   org: "Group Children1",status: "disabled", updatedAt: "2025-09-23 03:40:08" },
];

function UsersPage() {
  return (
    <ListPageTemplate<User>
      title="用户管理"
      filters={[
        { type: "text",   key: "username", label: "Username", placeholder: "请输入用户名" },
        { type: "select", key: "org",      label: "Organization",
          options: [{ label: "Group Root", value: "Group Root" }, { label: "Group Children1", value: "Group Children1" }] },
      ]}
      columns={[
        { key: "username",  title: "用户名" },
        { key: "role",      title: "角色" },
        { key: "org",       title: "机构" },
        { key: "status",    title: "状态", render: (r) => <StatusBadge status={r.status} /> },
        { key: "updatedAt", title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增用户")}
      rowActions={(r) => (
        <>
          <RowBtn>编辑</RowBtn>
          <RowBtn>{r.status === "disabled" ? "启用" : "禁用"}</RowBtn>
          <RowBtn danger>删除</RowBtn>
        </>
      )}
    />
  );
}
