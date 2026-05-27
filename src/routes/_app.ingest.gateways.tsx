import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/ingest/gateways")({
  component: GatewaysPage,
});

type Gateway = {
  id: string;
  name: string;
  networkComponent: string;
  networkType: string;
  protocol: string;
  org: string;
  status: "online" | "disabled";
  updateTime: string;
};

const rows: Gateway[] = [
  { id: "1", name: "网关-华东-01", networkComponent: "MQTT-EAST", networkType: "MQTT客户端", protocol: "Modbus TCP",  org: "Group Root",      status: "online",   updateTime: "2026-05-12 09:20:00" },
  { id: "2", name: "网关-华南-03", networkComponent: "TCP-SOUTH", networkType: "TCP服务",    protocol: "Modbus RTU",  org: "Group Children1", status: "online",   updateTime: "2026-05-10 17:55:11" },
  { id: "3", name: "网关-华北-02", networkComponent: "MQTT-NORTH", networkType: "MQTT客户端", protocol: "MQTT",        org: "Group Root",      status: "disabled", updateTime: "2026-04-21 11:10:42" },
];

function GatewaysPage() {
  return (
    <ListPageTemplate<Gateway>
      title="网关列表"
      filters={[
        { type: "text",   key: "name", label: "名称" },
        { type: "text",   key: "org",  label: "机构" },
        { type: "select", key: "networkType", label: "网络组件类型",
          options: [
            { label: "MQTT客户端", value: "MQTT客户端" },
            { label: "TCP服务",    value: "TCP服务" },
          ] },
      ]}
      columns={[
        { key: "name",             title: "名称" },
        { key: "networkComponent", title: "网络组件（类型）", render: (r) =>
          <span><span className="text-foreground">{r.networkComponent}</span> <span className="text-text-muted">（{r.networkType}）</span></span> },
        { key: "protocol",         title: "协议库" },
        { key: "org",              title: "机构" },
        { key: "status",           title: "状态", render: (r) => <StatusBadge status={r.status === "online" ? "online" : "disabled"} /> },
        { key: "updateTime",       title: "更新日期", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("添加网关")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn>新增子机构</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
