import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/devices/products")({
  component: ProductsPage,
});

type Product = { id: string; name: string; model: string; category: string; protocol: string; deviceCount: number; updatedAt: string };

const rows: Product[] = [
  { id: "1", name: "PV 逆变器",   model: "GW-INV-M",   category: "PV",  protocol: "Modbus TCP", deviceCount: 86, updatedAt: "2026-05-01 09:21:00" },
  { id: "2", name: "储能电池柜",   model: "ESS-Rack-V2",category: "ESS", protocol: "Modbus RTU", deviceCount: 24, updatedAt: "2026-04-21 10:12:55" },
  { id: "3", name: "柴油发电机",   model: "DG-200kW",   category: "DG",  protocol: "MQTT",       deviceCount: 12, updatedAt: "2026-03-15 14:08:30" },
  { id: "4", name: "环境监测仪",   model: "ENV-Mini",   category: "ENV", protocol: "Modbus TCP", deviceCount: 38, updatedAt: "2026-02-08 08:45:12" },
];

function ProductsPage() {
  return (
    <ListPageTemplate<Product>
      title="产品列表"
      filters={[
        { type: "text",   key: "name",     label: "产品名" },
        { type: "select", key: "category", label: "类型",
          options: [
            { label: "PV 光伏",  value: "PV" },
            { label: "ESS 储能", value: "ESS" },
            { label: "DG 柴发",  value: "DG" },
            { label: "ENV 环境", value: "ENV" },
          ] },
      ]}
      columns={[
        { key: "name",        title: "产品名" },
        { key: "model",       title: "型号", render: (r) => <code className="rounded bg-panel-heavy px-1.5 py-0.5 font-mono text-xs">{r.model}</code> },
        { key: "category",    title: "类型", render: (r) => {
          const colorMap: Record<string,string> = { PV: "text-energy-pv", ESS: "text-energy-ess", DG: "text-energy-dg", ENV: "text-text-secondary" };
          return <span className={colorMap[r.category]}>{r.category}</span>;
        }},
        { key: "protocol",    title: "协议" },
        { key: "deviceCount", title: "设备数", align: "right" },
        { key: "updatedAt",   title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增产品")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn>物模型</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
