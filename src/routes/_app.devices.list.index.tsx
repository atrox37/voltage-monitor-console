import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteDevice, pageDevices, pageGateways, pageProducts, saveDevice } from "@/api";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { VtDrawer, VtField, VtBtn, vtInputCls, vtSelectCls } from "@/components/vt-drawer";
import {
  mapCreateFormToDevicePo,
  mapDeviceDtoToRow,
  type DeviceCreateForm,
  type DeviceListRow,
} from "@/lib/device-mappers";
import { PRODUCT_TYPE_LABEL, PRODUCT_TYPE_OPTIONS } from "@/lib/product-mappers";
import { ALL_PAGE_QUERY, termEq, termLike } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import type { GatewayDto, PageQuery } from "@/types";

export const Route = createFileRoute("/_app/devices/list/")({
  component: DevicesPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.create_time", order: "desc" }];
const emptyDraft = (): DeviceCreateForm => ({ name: "", sn: "", productId: "", gatewayId: "" });

type ProductOption = { id: string; name: string; type: string };

function DevicesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DeviceListRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [gateways, setGateways] = useState<GatewayDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [filterDraft, setFilterDraft] = useState({ name: "", sn: "", productType: "", status: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "", sn: "", productType: "", status: "" });

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<DeviceCreateForm>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<DeviceListRow | null>(null);

  const goDetail = (id: string) => navigate({ to: "/devices/list/$id", params: { id } });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const terms = [];
      const name = filterApplied.name.trim();
      const sn = filterApplied.sn.trim();
      if (name) terms.push(termLike("t.name", name));
      if (sn) terms.push(termLike("t.sn", sn));
      if (filterApplied.productType) terms.push(termEq("t2.type", filterApplied.productType));
      if (filterApplied.status) terms.push(termEq("t.status", filterApplied.status));

      const result = await pageDevices({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapDeviceDtoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      toast.error(err instanceof Error ? err.message : "加载设备列表失败");
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, filterApplied.sn, filterApplied.productType, filterApplied.status, page]);

  useEffect(() => {
    void pageProducts(ALL_PAGE_QUERY)
      .then((res) => {
        const list = res.records ?? res.data ?? [];
        setProducts(
          list.map((row) => ({
            id: String(row.productPo.id ?? ""),
            name: row.productPo.name ?? "",
            type: row.productPo.type ?? "device",
          })),
        );
      })
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
    void pageGateways(ALL_PAGE_QUERY)
      .then((res) => setGateways(res.records ?? res.data ?? []))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const saveAdd = async () => {
    if (!draft.name.trim() || !draft.sn.trim() || !draft.productId) return;
    const product = products.find((p) => p.id === draft.productId);
    if (!product) return;
    if ((product.type === "device" || product.type === "gateway") && !draft.gatewayId) return;
    setSaving(true);
    try {
      await saveDevice(mapCreateFormToDevicePo(draft));
      toast.success("创建设备成功");
      setAddOpen(false);
      setDraft(emptyDraft());
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : "创建设备失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteDevice(delTarget.id);
      toast.success("删除成功");
      setDelTarget(null);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : "删除设备失败");
    }
  };

  return (
    <>
      <ListPageTemplate<DeviceListRow>
        title="设备列表"
        serverSide
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalCount={total}
        onPageChange={setPage}
        onSearch={() => { setPage(1); setFilterApplied({ ...filterDraft }); }}
        onReset={() => {
          const empty = { name: "", sn: "", productType: "", status: "" };
          setFilterDraft(empty);
          setFilterApplied(empty);
          setPage(1);
        }}
        filterValues={filterDraft}
        onFilterValuesChange={(next) =>
          setFilterDraft({
            name: next.name ?? "",
            sn: next.sn ?? "",
            productType: next.productType ?? "",
            status: next.status ?? "",
          })
        }
        filters={[
          { type: "text", key: "name", label: "设备名称", placeholder: "请输入设备名称" },
          { type: "text", key: "sn", label: "SN" },
          {
            type: "select", key: "productType", label: "产品类型",
            options: [{ label: "全部", value: "" }, ...PRODUCT_TYPE_OPTIONS],
          },
          {
            type: "select", key: "status", label: "状态",
            options: [
              { label: "全部", value: "" },
              { label: "在线", value: "online" },
              { label: "离线", value: "offline" },
            ],
          },
        ]}
        columns={[
          {
            key: "name", title: "设备名称",
            render: (r) => (
              <button onClick={() => goDetail(r.id)} className="text-foreground transition hover:text-primary">
                {r.name}
              </button>
            ),
          },
          { key: "sn", title: "SN", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.sn}</span> },
          {
            key: "productName", title: "产品",
            render: (r) => (
              <span className="text-text-secondary">
                {r.productName}
                <span className={`ml-1.5 rounded px-1 py-0.5 text-[10px] ${
                  r.productType === "gateway" ? "bg-primary/15 text-primary" :
                  r.productType === "device" ? "bg-status-online/15 text-status-online" :
                  "bg-status-warning/15 text-status-warning"
                }`}>{PRODUCT_TYPE_LABEL[r.productType] ?? r.productType}</span>
              </span>
            ),
          },
          {
            key: "gatewayName", title: "关联网关",
            render: (r) => r.gatewayName
              ? <span className="text-text-secondary">{r.gatewayName}</span>
              : <span className="text-text-muted">—</span>,
          },
          { key: "org", title: "所属机构" },
          { key: "creator", title: "创建人" },
          {
            key: "status", title: "状态",
            render: (r) => (
              <StatusBadge status={
                r.status === "online" ? "online" :
                r.status === "disabled" ? "disabled" :
                "critical"
              } />
            ),
          },
          {
            key: "statusTime", title: "最近上报",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.statusTime}</span>,
          },
        ]}
        rows={rows}
        onAdd={() => { setDraft(emptyDraft()); setAddOpen(true); }}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => goDetail(r.id)}>详情</RowBtn>
            <RowBtn danger onClick={() => setDelTarget(r)}>删除</RowBtn>
          </>
        )}
      />

      <VtDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新建设备"
        footer={<>
          <VtBtn variant="ghost" onClick={() => setAddOpen(false)}>关闭</VtBtn>
          <VtBtn disabled={saving} onClick={() => void saveAdd()}>{saving ? "提交中…" : "保存提交"}</VtBtn>
        </>}
      >
        <DeviceForm value={draft} onChange={setDraft} products={products} gateways={gateways} />
      </VtDrawer>

      <ConfirmDialog
        open={!!delTarget}
        title="确认删除"
        description={delTarget ? <>确定要删除设备 <span className="font-semibold text-foreground">「{delTarget.name}」</span> 吗？该操作不可恢复。</> : null}
        confirmText="删除"
        danger
        onConfirm={() => void handleDelete()}
        onClose={() => setDelTarget(null)}
      />
    </>
  );
}

function DeviceForm({
  value, onChange, products, gateways,
}: {
  value: DeviceCreateForm;
  onChange: (v: DeviceCreateForm) => void;
  products: ProductOption[];
  gateways: GatewayDto[];
}) {
  const selectedProduct = products.find((p) => p.id === value.productId);
  const showNetworkGateway = selectedProduct?.type === "device" || selectedProduct?.type === "gateway";

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
        <select className={vtSelectCls} value={value.productId}
          onChange={(e) => onChange({ ...value, productId: e.target.value, gatewayId: "" })}>
          <option value="">请选择产品</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({PRODUCT_TYPE_LABEL[p.type as keyof typeof PRODUCT_TYPE_LABEL] ?? p.type})</option>
          ))}
        </select>
      </VtField>
      {showNetworkGateway && (
        <VtField label="采集网关" required>
          <select className={vtSelectCls} value={value.gatewayId}
            onChange={(e) => onChange({ ...value, gatewayId: e.target.value })}>
            <option value="">请选择采集网关</option>
            {gateways.map((g) => (
              <option key={g.gatewayPo?.id} value={String(g.gatewayPo?.id ?? "")}>
                {g.gatewayPo?.name ?? "—"}
              </option>
            ))}
          </select>
        </VtField>
      )}
    </>
  );
}
