import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/devices/list")({
  component: DevicesPage,
});

type ProductType = "gateway" | "device" | "children";
type Device = {
  id: string;
  name: string;
  productName: string;
  productType: ProductType;
  gateway: string;
  org: string;
  creator: string;
  createTime: string;
  status: "online" | "disabled";
};

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  gateway: "网关设备",
  device: "直连设备",
  children: "子设备",
};

const rows: Device[] = [
  { id: "1", name: "1号逆变器", productName: "GW-INV-M",  productType: "device",   gateway: "—",           org: "Group Root",      creator: "root",         createTime: "2026-05-19 02:14:08", status: "online" },
  { id: "2", name: "B2 电池柜", productName: "ESS-Rack",  productType: "children", gateway: "网关-华东-01", org: "Group Children1", creator: "admin",        createTime: "2026-05-19 01:52:31", status: "online" },
  { id: "3", name: "12 号组串", productName: "GW-INV-M",  productType: "device",   gateway: "—",           org: "Group Children1", creator: "zhiyuan.wang", createTime: "2026-05-19 01:30:11", status: "disabled" },
  { id: "4", name: "网关-华南-03", productName: "DG-200kW", productType: "gateway", gateway: "—",          org: "Group Root",      creator: "admin",        createTime: "2026-05-19 00:48:02", status: "online" },
  { id: "5", name: "环境监测 #1", productName: "ENV-Mini", productType: "device",  gateway: "—",           org: "Group Root",      creator: "test222",      createTime: "2026-05-19 00:12:50", status: "online" },
];

function DevicesPage() {
  return (
    <ListPageTemplate<Device>
      title="设备列表"
      filters={[
        { type: "text",   key: "name", label: "设备名称", placeholder: "请输入设备名称" },
        { type: "text",   key: "org",  label: "机构" },
        { type: "select", key: "productType", label: "产品类型",
          options: [
            { label: "网关设备", value: "gateway" },
            { label: "直连设备", value: "device" },
            { label: "子设备",   value: "children" },
          ] },
      ]}
      columns={[
        { key: "name",        title: "设备名称" },
        { key: "productName", title: "产品名称" },
        { key: "productType", title: "产品类型", render: (r) => (
          <span className="rounded bg-panel-heavy px-1.5 py-0.5 text-xs">{PRODUCT_TYPE_LABEL[r.productType]}</span>
        ) },
        { key: "gateway",     title: "关联网关", render: (r) => <span className="text-text-secondary">{r.gateway}</span> },
        { key: "org",         title: "所属机构" },
        { key: "creator",     title: "创建人" },
        { key: "createTime",  title: "创建时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.createTime}</span> },
        { key: "status",      title: "状态", render: (r) => <StatusBadge status={r.status === "online" ? "online" : "disabled"} /> },
      ]}
      rows={rows}
      onAdd={() => alert("创建设备")}
      rowActions={() => (<><RowBtn>详情</RowBtn><RowBtn>编辑</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
