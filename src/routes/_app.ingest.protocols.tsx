import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/ingest/protocols")({
  component: ProtocolsPage,
});

type Protocol = {
  id: string;
  name: string;
  supportTypes: string[];
  gatewayCount: number;
  org: string;
  updateTime: string;
};

const rows: Protocol[] = [
  { id: "1", name: "Modbus TCP", supportTypes: ["TCP", "MQTT"], gatewayCount: 12, org: "Group Root",      updateTime: "2026-05-01 09:21:00" },
  { id: "2", name: "Modbus RTU", supportTypes: ["RS-485"],      gatewayCount: 5,  org: "Group Children1", updateTime: "2026-04-21 10:12:55" },
  { id: "3", name: "MQTT",       supportTypes: ["MQTT"],        gatewayCount: 0,  org: "Group Root",      updateTime: "2026-03-15 14:08:30" },
];

function ProtocolsPage() {
  return (
    <ListPageTemplate<Protocol>
      title="协议库"
      filters={[
        { type: "text", key: "name", label: "名称" },
      ]}
      columns={[
        { key: "name",         title: "协议名称" },
        { key: "supportTypes", title: "支持类型", render: (r) => (
          <div className="flex flex-wrap gap-1">
            {r.supportTypes.map((t) => (
              <span key={t} className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">{t}</span>
            ))}
          </div>
        ) },
        { key: "gatewayCount", title: "是否关联网关", render: (r) => (
          r.gatewayCount > 0
            ? <span className="text-status-online">是（已绑定 {r.gatewayCount} 个网关）</span>
            : <span className="text-text-muted">否</span>
        ) },
        { key: "org",         title: "所属机构" },
        { key: "updateTime",  title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增协议")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
