import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/system/orgs")({
  component: OrgsPage,
});

type Org = { id: string; name: string; parent: string; userCount: number; deviceCount: number; updatedAt: string };

const rows: Org[] = [
  { id: "1", name: "Group Root",      parent: "—",          userCount: 5, deviceCount: 124, updatedAt: "2026-05-11 02:51:13" },
  { id: "2", name: "Group Children1", parent: "Group Root", userCount: 8, deviceCount: 56,  updatedAt: "2025-09-23 03:40:08" },
  { id: "3", name: "上海·浦东 R1",     parent: "Group Root", userCount: 2, deviceCount: 32,  updatedAt: "2026-04-12 11:24:00" },
  { id: "4", name: "深圳·南山 B2",     parent: "Group Root", userCount: 3, deviceCount: 28,  updatedAt: "2026-03-21 09:12:18" },
];

function OrgsPage() {
  return (
    <ListPageTemplate<Org>
      title="机构管理"
      filters={[{ type: "text", key: "name", label: "机构名", placeholder: "请输入机构名" }]}
      columns={[
        { key: "name",        title: "机构名" },
        { key: "parent",      title: "上级机构", render: (r) => <span className="text-text-secondary">{r.parent}</span> },
        { key: "userCount",   title: "用户数",   align: "right" },
        { key: "deviceCount", title: "设备数",   align: "right", render: (r) => <span className="text-energy-pv">{r.deviceCount}</span> },
        { key: "updatedAt",   title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增机构")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn>新增子机构</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
