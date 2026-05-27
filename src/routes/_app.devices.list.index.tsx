import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";
import {
  type Device,
  deviceActions,
  useDevices,
} from "@/lib/devices-store";
import { useProducts, PRODUCT_TYPE_LABEL } from "@/lib/products-store";

export const Route = createFileRoute("/_app/devices/list/")({
  component: DevicesPage,
});

type Draft = {
  name: string;
  sn: string;
  productId: string;
  gatewayId: string;
  org: string;
};

const emptyDraft = (): Draft => ({
  name: "", sn: "", productId: "", gatewayId: "", org: "Group Root",
});

function DevicesPage() {
  const navigate = useNavigate();
  const rows = useDevices();
  const products = useProducts();
  const gateways = rows.filter((d) => d.productType === "gateway");

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState<Device | null>(null);

  const goDetail = (id: string) => navigate({ to: "/devices/list/$id", params: { id } });

  const saveAdd = () => {
    if (!draft.name.trim() || !draft.sn.trim() || !draft.productId) return;
    const product = products.find((p) => p.id === draft.productId);
    if (!product) return;
    const gw = gateways.find((g) => g.id === draft.gatewayId);
    deviceActions.add({
      name: draft.name.trim(),
      sn: draft.sn.trim(),
      productId: product.id,
      productName: product.name,
      productType: product.type,
      gatewayId: gw?.id,
      gatewayName: gw?.name,
      org: draft.org,
      creator: "admin",
    });
    setAddOpen(false);
    setDraft(emptyDraft());
  };

  const saveEdit = () => {
    if (!editing) return;
    const gw = gateways.find((g) => g.id === editing.gatewayId);
    deviceActions.update(editing.id, {
      name: editing.name,
      sn: editing.sn,
      org: editing.org,
      gatewayId: gw?.id,
      gatewayName: gw?.name,
    });
    setEditing(null);
  };

  return (
    <>
      <ListPageTemplate<Device>
        title="设备列表"
        filters={[
          { type: "text", key: "name", label: "设备名称", placeholder: "请输入设备名称" },
          { type: "text", key: "sn", label: "SN" },
          { type: "select", key: "productType", label: "产品类型",
            options: [
              { label: "网关设备", value: "gateway" },
              { label: "直连设备", value: "device" },
              { label: "子设备", value: "children" },
            ] },
          { type: "select", key: "status", label: "状态",
            options: [
              { label: "在线", value: "online" },
              { label: "离线", value: "offline" },
              { label: "禁用", value: "disabled" },
            ] },
        ]}
        columns={[
          { key: "name", title: "设备名称",
            render: (r) => (
              <button onClick={() => goDetail(r.id)} className="text-foreground transition hover:text-primary">
                {r.name}
              </button>
            ),
          },
          { key: "sn", title: "SN", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.sn}</span> },
          { key: "productName", title: "产品",
            render: (r) => (
              <span className="text-text-secondary">
                {r.productName}
                <span className={`ml-1.5 rounded px-1 py-0.5 text-[10px] ${
                  r.productType === "gateway" ? "bg-primary/15 text-primary" :
                  r.productType === "device" ? "bg-status-online/15 text-status-online" :
                  "bg-status-warning/15 text-status-warning"
                }`}>{PRODUCT_TYPE_LABEL[r.productType]}</span>
              </span>
            ),
          },
          { key: "gatewayName", title: "关联网关",
            render: (r) => r.gatewayName
              ? <span className="text-text-secondary">{r.gatewayName}</span>
              : <span className="text-text-muted">—</span> },
          { key: "org", title: "所属机构" },
          { key: "creator", title: "创建人" },
          { key: "status", title: "状态",
            render: (r) => <StatusBadge status={
              r.status === "online" ? "online" :
              r.status === "disabled" ? "disabled" :
              "critical"
            } /> },
          { key: "statusTime", title: "最近上报",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.statusTime}</span> },
        ]}
        rows={rows}
        onAdd={() => { setDraft(emptyDraft()); setAddOpen(true); }}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => goDetail(r.id)}>详情</RowBtn>
            <RowBtn onClick={() => setEditing({ ...r })}>编辑</RowBtn>
            {r.status === "disabled" ? (
              <RowBtn icon={undefined} onClick={() => deviceActions.setStatus(r.id, "offline")}>启用</RowBtn>
            ) : (
              <RowBtn
                confirm={{ description: <>确定要禁用设备 <span className="font-semibold text-foreground">「{r.name}」</span> 吗？</>, confirmText: "禁用", title: "确认禁用" }}
                onClick={() => deviceActions.setStatus(r.id, "disabled")}
              >禁用</RowBtn>
            )}
            <RowBtn
              danger
              confirm={{ description: <>确定要删除设备 <span className="font-semibold text-foreground">「{r.name}」</span> 吗？该操作不可恢复。</> }}
              onClick={() => deviceActions.remove(r.id)}
            >删除</RowBtn>
          </>
        )}
      />

      <VtDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新建设备"
        footer={<>
          <VtBtn variant="ghost" onClick={() => setAddOpen(false)}>关闭</VtBtn>
          <VtBtn onClick={saveAdd}>保存提交</VtBtn>
        </>}
      >
        <DeviceForm value={draft} onChange={setDraft} products={products} gateways={gateways} />
      </VtDrawer>

      <VtDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title="编辑设备"
        footer={<>
          <VtBtn variant="ghost" onClick={() => setEditing(null)}>关闭</VtBtn>
          <VtBtn onClick={saveEdit}>保存提交</VtBtn>
        </>}
      >
        {editing && (
          <DeviceForm
            value={{ name: editing.name, sn: editing.sn, productId: editing.productId, gatewayId: editing.gatewayId ?? "", org: editing.org }}
            onChange={(v) => setEditing({ ...editing, name: v.name, sn: v.sn, gatewayId: v.gatewayId || undefined, org: v.org })}
            products={products} gateways={gateways}
            lockProduct
          />
        )}
      </VtDrawer>
    </>
  );
}

function DeviceForm({
  value, onChange, products, gateways, lockProduct,
}: {
  value: Draft;
  onChange: (v: Draft) => void;
  products: ReturnType<typeof useProducts>;
  gateways: Device[];
  lockProduct?: boolean;
}) {
  const selectedProduct = products.find((p) => p.id === value.productId);
  return (
    <>
      <VtField label="设备名称" required>
        <input className={vtInputCls} value={value.name} placeholder="请输入设备名称"
          onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </VtField>
      <VtField label="SN" required>
        <input className={vtInputCls} value={value.sn} placeholder="请输入设备 SN"
          onChange={(e) => onChange({ ...value, sn: e.target.value })} />
      </VtField>
      <VtField label="所属产品" required>
        <select className={vtInputCls} value={value.productId} disabled={lockProduct}
          onChange={(e) => onChange({ ...value, productId: e.target.value, gatewayId: "" })}>
          <option value="">请选择产品</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({PRODUCT_TYPE_LABEL[p.type]})</option>
          ))}
        </select>
      </VtField>
      {selectedProduct?.type === "children" && (
        <VtField label="关联网关">
          <select className={vtInputCls} value={value.gatewayId}
            onChange={(e) => onChange({ ...value, gatewayId: e.target.value })}>
            <option value="">不关联</option>
            {gateways.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </VtField>
      )}
      <VtField label="所属机构" required>
        <OrgTreeSelect value={value.org} onChange={(v) => onChange({ ...value, org: v })} />
      </VtField>
    </>
  );
}
