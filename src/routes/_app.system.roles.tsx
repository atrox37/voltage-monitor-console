import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/system/roles")({
  component: RolesPage,
});

type Role = { id: string; name: string; code: string; userCount: number; desc: string; updatedAt: string };

const rows: Role[] = [
  { id: "1", name: "超级管理员", code: "root",     userCount: 1, desc: "拥有所有权限",         updatedAt: "2026-05-11 02:51:13" },
  { id: "2", name: "管理员",     code: "admin",    userCount: 3, desc: "系统管理 + 设备管理",   updatedAt: "2025-09-28 02:36:25" },
  { id: "3", name: "工程师",     code: "engineer", userCount: 8, desc: "设备运维 + 告警处理",   updatedAt: "2026-04-16 10:49:06" },
  { id: "4", name: "查看者",     code: "viewer",   userCount: 12, desc: "只读权限",             updatedAt: "2026-01-04 03:30:31" },
];

function RolesPage() {
  return (
    <ListPageTemplate<Role>
      title="角色管理"
      filters={[{ type: "text", key: "name", label: "角色名", placeholder: "请输入角色名" }]}
      columns={[
        { key: "name",      title: "角色名" },
        { key: "code",      title: "标识", render: (r) => <code className="rounded bg-panel-heavy px-1.5 py-0.5 font-mono text-xs text-energy-pv">{r.code}</code> },
        { key: "userCount", title: "用户数", align: "right" },
        { key: "desc",      title: "描述", render: (r) => <span className="text-text-secondary">{r.desc}</span> },
        { key: "updatedAt", title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增角色")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn>权限</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
