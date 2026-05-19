import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/devices/list")({
  component: DevicesPage,
});

type Device = {
  id: string; sn: string; name: string; product: string; org: string;
  status: "online" | "warning" | "critical" | "disabled"; lastSeen: string;
};

const rows: Device[] = [
  { id: "1", sn: "GW-INV-08",   name: "1号逆变器",   product: "PV 逆变器",   org: "杭州·余杭",     status: "critical", lastSeen: "2026-05-19 02:14:08" },
  { id: "2", sn: "ESS-R-02",    name: "B2 电池柜",   product: "储能电池柜",   org: "深圳·南山 B2", status: "warning",  lastSeen: "2026-05-19 01:52:31" },
  { id: "3", sn: "PV-S-12",     name: "12 号组串",   product: "PV 逆变器",   org: "上海·浦东 R1", status: "online",   lastSeen: "2026-05-19 01:30:11" },
  { id: "4", sn: "DG-03",       name: "备用柴发 3",  product: "柴油发电机",   org: "成都·天府",    status: "online",   lastSeen: "2026-05-19 00:48:02" },
  { id: "5", sn: "ENV-001",     name: "环境监测 #1", product: "环境监测仪",   org: "苏州·工业园",  status: "online",   lastSeen: "2026-05-19 00:12:50" },
  { id: "6", sn: "GW-INV-21",   name: "21 号逆变",   product: "PV 逆变器",   org: "上海·浦东 R1", status: "disabled", lastSeen: "2026-04-30 17:01:33" },
];

function DevicesPage() {
  return (
    <ListPageTemplate<Device>
      title="设备列表"
      filters={[
        { type: "text",   key: "sn",   label: "SN", placeholder: "请输入序列号" },
        { type: "select", key: "status", label: "状态",
          options: [
            { label: "正常",  value: "online" },
            { label: "告警",  value: "warning" },
            { label: "故障",  value: "critical" },
            { label: "禁用",  value: "disabled" },
          ] },
        { type: "text",   key: "org",  label: "站点" },
      ]}
      columns={[
        { key: "sn",       title: "SN", render: (r) => <code className="font-mono text-xs text-energy-pv">{r.sn}</code> },
        { key: "name",     title: "设备名" },
        { key: "product",  title: "产品" },
        { key: "org",      title: "站点", render: (r) => <span className="text-text-secondary">{r.org}</span> },
        { key: "status",   title: "状态", render: (r) => <StatusBadge status={r.status} /> },
        { key: "lastSeen", title: "最近通信", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.lastSeen}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增设备")}
      rowActions={() => (<><RowBtn>详情</RowBtn><RowBtn>下发</RowBtn><RowBtn danger>解绑</RowBtn></>)}
    />
  );
}
