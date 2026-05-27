import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/devices/products")({
  component: ProductsPage,
});

type ProductType = "gateway" | "device" | "children";
type Product = {
  id: string;
  name: string;
  productType: ProductType;
  creator: string;
  org: string;
  updateTime: string;
};

const PT_LABEL: Record<ProductType, string> = {
  gateway: "网关设备",
  device: "直连设备",
  children: "子设备",
};

const rows: Product[] = [
  { id: "1", name: "PV 逆变器",   productType: "device",   creator: "admin",        org: "Group Root",      updateTime: "2026-05-01 09:21:00" },
  { id: "2", name: "储能电池柜",   productType: "children", creator: "root",         org: "Group Children1", updateTime: "2026-04-21 10:12:55" },
  { id: "3", name: "网关-华东",    productType: "gateway",  creator: "test222",      org: "Group Root",      updateTime: "2026-03-15 14:08:30" },
  { id: "4", name: "环境监测仪",   productType: "device",   creator: "zhiyuan.wang", org: "Group Children1", updateTime: "2026-02-08 08:45:12" },
];

function ProductsPage() {
  return (
    <ListPageTemplate<Product>
      title="产品列表"
      filters={[
        { type: "text",   key: "name", label: "产品名称" },
        { type: "text",   key: "org",  label: "机构" },
        { type: "select", key: "productType", label: "产品类型",
          options: [
            { label: "网关设备", value: "gateway" },
            { label: "直连设备", value: "device" },
            { label: "子设备",   value: "children" },
          ] },
      ]}
      columns={[
        { key: "name",        title: "名称" },
        { key: "productType", title: "产品类型", render: (r) => (
          <span className="rounded bg-panel-heavy px-1.5 py-0.5 text-xs">{PT_LABEL[r.productType]}</span>
        ) },
        { key: "creator",     title: "创建人" },
        { key: "org",         title: "机构" },
        { key: "updateTime",  title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("创建产品")}
      rowActions={() => (<><RowBtn>详情</RowBtn><RowBtn>编辑</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
