import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/ingest/protocols")({
  component: ProtocolsPage,
});

type Protocol = { id: string; name: string; type: string; version: string; productCount: number; updatedAt: string };

const rows: Protocol[] = [
  { id: "1", name: "Modbus TCP",   type: "TCP",   version: "v1.1b", productCount: 6, updatedAt: "2026-04-12 09:00:00" },
  { id: "2", name: "Modbus RTU",   type: "Serial",version: "v1.1b", productCount: 4, updatedAt: "2026-04-12 09:00:00" },
  { id: "3", name: "MQTT",         type: "MQTT",  version: "3.1.1", productCount: 3, updatedAt: "2026-03-21 12:30:42" },
  { id: "4", name: "IEC 61850",    type: "MMS",   version: "Ed2",   productCount: 2, updatedAt: "2026-02-08 16:14:55" },
  { id: "5", name: "OPC UA",       type: "TCP",   version: "1.05",  productCount: 1, updatedAt: "2026-01-19 10:22:10" },
];

function ProtocolsPage() {
  return (
    <ListPageTemplate<Protocol>
      title="协议库"
      filters={[
        { type: "text",   key: "name", label: "协议名" },
        { type: "select", key: "type", label: "类型",
          options: [{label:"TCP",value:"TCP"},{label:"Serial",value:"Serial"},{label:"MQTT",value:"MQTT"},{label:"MMS",value:"MMS"}] },
      ]}
      columns={[
        { key: "name",         title: "协议名" },
        { key: "type",         title: "类型", render: (r) => <span className="rounded bg-energy-ess/15 px-1.5 py-0.5 text-xs text-energy-ess">{r.type}</span> },
        { key: "version",      title: "版本", render: (r) => <code className="font-mono text-xs text-text-secondary">{r.version}</code> },
        { key: "productCount", title: "关联产品", align: "right" },
        { key: "updatedAt",    title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增协议")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn>导出</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
