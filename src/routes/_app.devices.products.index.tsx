import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";
import {
  type Product,
  type ProductType,
  PRODUCT_TYPE_LABEL,
  productActions,
  useProducts,
} from "@/lib/products-store";

export const Route = createFileRoute("/_app/devices/products/")({
  component: ProductsPage,
});

type Draft = { name: string; sn: string; type: ProductType; org: string };
const emptyDraft = (): Draft => ({ name: "", sn: "", type: "device", org: "Group Root" });

function ProductsPage() {
  const navigate = useNavigate();
  const rows = useProducts();
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState<Product | null>(null);

  const goDetail = (id: string) => navigate({ to: "/devices/products/$id", params: { id } });

  const saveAdd = () => {
    if (!draft.name.trim() || !draft.sn.trim()) return;
    productActions.add({
      name: draft.name.trim(),
      sn: draft.sn.trim(),
      type: draft.type,
      org: draft.org,
      creator: "admin",
    });
    setAddOpen(false);
    setDraft(emptyDraft());
  };

  const saveEdit = () => {
    if (!editing) return;
    productActions.update(editing.id, {
      name: editing.name,
      sn: editing.sn,
      type: editing.type,
      org: editing.org,
    });
    setEditing(null);
  };

  return (
    <>
      <ListPageTemplate<Product>
        title="产品列表"
        filters={[
          { type: "text",   key: "name", label: "产品名称", placeholder: "请输入产品名称" },
          { type: "text",   key: "org",  label: "机构" },
          { type: "select", key: "type", label: "产品类型",
            options: [
              { label: "网关设备", value: "gateway" },
              { label: "直连设备", value: "device" },
              { label: "子设备",   value: "children" },
            ] },
        ]}
        columns={[
          { key: "name", title: "产品名称",
            render: (r) => (
              <button
                onClick={() => goDetail(r.id)}
                className="text-foreground transition hover:text-primary"
              >
                {r.name}
              </button>
            ),
          },
          { key: "type", title: "产品类型",
            render: (r) => (
              <span className={`rounded px-1.5 py-0.5 text-xs ${
                r.type === "gateway"  ? "bg-primary/15 text-primary" :
                r.type === "device"   ? "bg-status-online/15 text-status-online" :
                "bg-status-warning/15 text-status-warning"
              }`}>{PRODUCT_TYPE_LABEL[r.type]}</span>
            ),
          },
          { key: "creator",    title: "创建人" },
          { key: "org",        title: "机构" },
          { key: "updateTime", title: "更新时间",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span> },
        ]}
        rows={rows}
        onAdd={() => { setDraft(emptyDraft()); setAddOpen(true); }}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => goDetail(r.id)}>详情</RowBtn>
            <RowBtn onClick={() => setEditing({ ...r })}>编辑</RowBtn>
            <RowBtn
              danger
              confirm={{ description: <>确定要删除产品 <span className="font-semibold text-foreground">「{r.name}」</span> 吗？该操作不可恢复。</> }}
              onClick={() => productActions.remove(r.id)}
            >删除</RowBtn>
          </>
        )}
      />

      {/* Add Drawer */}
      <VtDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新建产品"
        footer={<>
          <VtBtn variant="ghost" onClick={() => setAddOpen(false)}>关闭</VtBtn>
          <VtBtn onClick={saveAdd}>保存提交</VtBtn>
        </>}
      >
        <ProductForm value={draft} onChange={setDraft} />
      </VtDrawer>

      {/* Edit Drawer */}
      <VtDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title="编辑产品"
        footer={<>
          <VtBtn variant="ghost" onClick={() => setEditing(null)}>关闭</VtBtn>
          <VtBtn onClick={saveEdit}>保存提交</VtBtn>
        </>}
      >
        {editing && (
          <ProductForm
            value={{ name: editing.name, sn: editing.sn, type: editing.type, org: editing.org }}
            onChange={(v) => setEditing({ ...editing, ...v })}
          />
        )}
      </VtDrawer>
    </>
  );
}

function ProductForm({ value, onChange }: { value: Draft; onChange: (v: Draft) => void }) {
  return (
    <>
      <VtField label="产品名称" required>
        <input
          className={vtInputCls}
          value={value.name}
          placeholder="请输入产品名称"
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </VtField>
      <VtField label="产品型号" required>
        <input
          className={vtInputCls}
          value={value.sn}
          placeholder="请输入产品型号 (SN)"
          onChange={(e) => onChange({ ...value, sn: e.target.value })}
        />
      </VtField>
      <VtField label="产品类型" required>
        <select
          className={vtInputCls}
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as ProductType })}
        >
          <option value="device">直连设备</option>
          <option value="gateway">网关设备</option>
          <option value="children">子设备</option>
        </select>
      </VtField>
      <VtField label="所属机构" required>
        <OrgTreeSelect value={value.org} onChange={(v) => onChange({ ...value, org: v })} />
      </VtField>
    </>
  );
}
