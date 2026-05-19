import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/ingest/gateways")({
  component: GatewaysPage,
});

type Gateway = {
  id: string; sn: string; name: string; org: string; ip: string;
  status: "online" | "warning" | "critical" | "disabled"; deviceCount: number; lastSeen: string;
};

const rows: Gateway[] = [
  { id: "1", sn: "GW-A100-001", name: "浦东 R1 主网关", org: "上海·浦东 R1", ip: "10.0.10.5",  status: "online",   deviceCount: 32, lastSeen: "2026-05-19 02:00:11" },
  { id: "2", sn: "GW-A100-002", name: "余杭网关",        org: "杭州·余杭",     ip: "10.0.12.7",  status: "critical", deviceCount: 18, lastSeen: "2026-05-18 22:14:08" },
  { id: "3", sn: "GW-A200-014", name: "南山 B2 网关",    org: "深圳·南山 B2", ip: "10.0.14.3",  status: "warning",  deviceCount: 24, lastSeen: "2026-05-19 01:52:31" },
  { id: "4", sn: "GW-A100-022", name: "天府新区网关",     org: "成都·天府",    ip: "10.0.16.11", status: "online",   deviceCount: 16, lastSeen: "2026-05-19 00:48:02" },
];

function GatewaysPage() {
  return (
    <ListPageTemplate<Gateway>
      title="网关列表"
      filters={[
        { type: "text", key: "sn",   label: "SN" },
        { type: "text", key: "org",  label: "站点" },
      ]}
      columns={[
        { key: "sn",          title: "SN",      render: (r) => <code className="font-mono text-xs text-energy-pv">{r.sn}</code> },
        { key: "name",        title: "网关名" },
        { key: "org",         title: "站点", render: (r) => <span className="text-text-secondary">{r.org}</span> },
        { key: "ip",          title: "IP",  render: (r) => <code className="font-mono text-xs text-text-secondary">{r.ip}</code> },
        { key: "deviceCount", title: "下挂设备", align: "right" },
        { key: "status",      title: "状态", render: (r) => <StatusBadge status={r.status} /> },
        { key: "lastSeen",    title: "最近通信", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.lastSeen}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增网关")}
      rowActions={() => (<><RowBtn>详情</RowBtn><RowBtn>重启</RowBtn><RowBtn danger>解绑</RowBtn></>)}
    />
  );
}
