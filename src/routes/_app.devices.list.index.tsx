import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Drawer, Form, Input, Select } from "antd";
import { useCallback, useEffect, useState } from "react";
import { showError, showSuccess } from "@/lib/api-message";
import { deleteDevice, pageDevices, pageGateways, pageProducts, saveDevice } from "@/api";
import { drawerFooter, drawerFormItemProps } from "@/components/drawer-form";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";
import { deviceConnectionStatus } from "@/components/status-display";
import {
  mapCreateFormToDevicePo,
  mapDeviceDtoToRow,
  type DeviceCreateForm,
  type DeviceListRow,
} from "@/features/devices/lib/device-mappers";
import { PRODUCT_TYPE_LABEL, PRODUCT_TYPE_OPTIONS } from "@/features/products/lib/product-mappers";
import { ALL_PAGE_QUERY, termEq, termLike } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { useTranslation } from "@/i18n";
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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sorts, setSorts] = useState<PageQuery["sorts"]>(DEFAULT_SORTS);

  const [filterDraft, setFilterDraft] = useState({ name: "", sn: "", productType: "", status: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "", sn: "", productType: "", status: "" });

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<DeviceCreateForm>(emptyDraft());
  const [saving, setSaving] = useState(false);

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
        sorts,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapDeviceDtoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      showError(err instanceof Error ? err.message : "加载设备列表失败");
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, filterApplied.sn, filterApplied.productType, filterApplied.status, page, pageSize, sorts]);

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
      showSuccess("创建设备成功");
      setAddOpen(false);
      setDraft(emptyDraft());
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : "创建设备失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: DeviceListRow) => {
    try {
      await deleteDevice(row.id);
      showSuccess("删除成功");
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : "删除设备失败");
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
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        sorts={sorts}
        onSortsChange={(next) => {
          setSorts(next.length ? next : DEFAULT_SORTS);
          setPage(1);
        }}
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
          { type: "text", key: "name", label: "设备名称" },
          { type: "text", key: "sn", label: "SN" },
          {
            type: "select", key: "productType", label: "产品类型",
            options: PRODUCT_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
          },
          {
            type: "select", key: "status", label: "状态",
            options: [
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
            render: (r) => <StatusBadge status={deviceConnectionStatus(r.status)} />,
          },
          {
            key: "createTime",
            title: "创建时间",
            sortable: true,
            sortKey: "t.create_time",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.createTime}</span>,
          },
        ]}
        rows={rows}
        onAdd={() => { setDraft(emptyDraft()); setAddOpen(true); }}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => goDetail(r.id)}>详情</RowBtn>
            <RowBtn
              danger
              confirm={{
                description: (
                  <>
                    确定要删除设备 <span className="font-semibold text-foreground">「{r.name}」</span> 吗？该操作不可恢复。
                  </>
                ),
              }}
              onClick={() => void handleDelete(r)}
            >
              删除
            </RowBtn>
          </>
        )}
      />

      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新建设备"
        size={480}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={drawerFooter([
          { key: "close", label: "关闭", onClick: () => setAddOpen(false) },
          {
            key: "save",
            label: saving ? "提交中…" : "保存提交",
            type: "primary",
            disabled: saving,
            onClick: () => void saveAdd(),
          },
        ])}
      >
        <DeviceForm value={draft} onChange={setDraft} products={products} gateways={gateways} />
      </Drawer>
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
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const selectedProduct = products.find((p) => p.id === value.productId);
  const showNetworkGateway = selectedProduct?.type === "device" || selectedProduct?.type === "gateway";

  return (
    <>
      <Form.Item label="设备名称" required {...drawerFormItemProps}>
        <Input
          value={value.name}
          placeholder={ph.input(t("common.deviceName"))}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="SN" required {...drawerFormItemProps}>
        <Input
          value={value.sn}
          placeholder={ph.input(t("common.sn"))}
          onChange={(e) => onChange({ ...value, sn: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="所属产品" required {...drawerFormItemProps}>
        <Select
          className="vt-select-control"
          classNames={{ popup: { root: "vt-select-popup" } }}
          value={value.productId || undefined}
          placeholder={ph.select(t("common.product"))}
          onChange={(productId) => onChange({ ...value, productId, gatewayId: "" })}
          options={products.map((p) => ({
            value: p.id,
            label: `${p.name} (${PRODUCT_TYPE_LABEL[p.type as keyof typeof PRODUCT_TYPE_LABEL] ?? p.type})`,
          }))}
        />
      </Form.Item>
      {showNetworkGateway && (
        <Form.Item label="采集网关" required {...drawerFormItemProps}>
          <Select
            className="vt-select-control"
            classNames={{ popup: { root: "vt-select-popup" } }}
            value={value.gatewayId || undefined}
            placeholder={ph.select(t("common.collectGateway"))}
            onChange={(gatewayId) => onChange({ ...value, gatewayId })}
            options={gateways.map((g) => ({
              value: String(g.gatewayPo?.id ?? ""),
              label: g.gatewayPo?.name ?? "—",
            }))}
          />
        </Form.Item>
      )}
    </>
  );
}
