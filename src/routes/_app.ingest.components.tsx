import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/ingest/components")({
  component: ComponentsPage,
});

type NetComp = {
  id: string; name: string; type: string; addr: string;
  status: "online" | "warning" | "critical" | "disabled"; updatedAt: string;
};

const rows: NetComp[] = [
  { id: "1", name: "MQTT Broker A", type: "MQTT Broker",   addr: "tcp://10.0.1.21:1883",  status: "online",  updatedAt: "2026-05-15 09:00:00" },
  { id: "2", name: "Kafka Bus",     type: "Kafka",         addr: "kafka://10.0.1.45:9092",status: "online",  updatedAt: "2026-05-10 14:23:12" },
  { id: "3", name: "Modbus Gw 02",  type: "Modbus Bridge", addr: "tcp://10.1.0.55:502",   status: "warning", updatedAt: "2026-05-18 11:30:00" },
  { id: "4", name: "OPC UA Server", type: "OPC UA",        addr: "opc.tcp://10.0.1.88:4840", status: "online", updatedAt: "2026-04-29 17:11:55" },
];

function ComponentsPage() {
  return (
    <ListPageTemplate<NetComp>
      title="网络组件列表"
      filters={[
        { type: "text",   key: "name", label: "组件名" },
        { type: "select", key: "type", label: "类型",
          options: [{label:"MQTT Broker",value:"MQTT Broker"},{label:"Kafka",value:"Kafka"},{label:"Modbus Bridge",value:"Modbus Bridge"},{label:"OPC UA",value:"OPC UA"}] },
      ]}
      columns={[
        { key: "name",      title: "组件名" },
        { key: "type",      title: "类型" },
        { key: "addr",      title: "地址", render: (r) => <code className="font-mono text-xs text-energy-pv">{r.addr}</code> },
        { key: "status",    title: "状态", render: (r) => <StatusBadge status={r.status} /> },
        { key: "updatedAt", title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增组件")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn>测试连通</RowBtn><RowBtn danger>停用</RowBtn></>)}
    />
  );
}
