import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Drawer, Form, Input, Select } from "antd";
import { deleteDevice, pageDevices, pageGateways, pageProducts, saveDevice } from "@/api";
import { drawerFooter, drawerFormItemProps, selectFormItemProps } from "@/components/drawer-form";
import { ListPageTemplate, RowBtn, StatusBadge } from "@/components/list-page-template";
import { deviceConnectionStatus } from "@/components/status-display";
import {
  mapCreateFormToDevicePo,
  mapDeviceDtoToRow,
  type DeviceCreateForm,
  type DeviceListRow,
} from "@/features/devices/lib/device-mappers";
import { useProductTypeLabel, useProductTypeOptions } from "@/features/products/lib/product-type-i18n";
import { useTranslation } from "@/i18n";
import { showError, showSuccess } from "@/lib/api-message";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { requiredInputRule, requiredSelectRule } from "@/lib/form-validation";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
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
  const { t } = useTranslation();
  const [formApi] = Form.useForm<DeviceCreateForm>();
  const getProductTypeLabel = useProductTypeLabel();
  const productTypeOptions = useProductTypeOptions();
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

      const result = await pageDevices({ current: page, size: pageSize, terms, sorts });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapDeviceDtoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      showError(err instanceof Error ? err.message : t("devices.list.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, filterApplied.sn, filterApplied.productType, filterApplied.status, page, pageSize, sorts, t]);

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
    try {
      await formApi.validateFields();
    } catch {
      return;
    }
    const product = products.find((p) => p.id === draft.productId);
    if (!product) return;
    setSaving(true);
    try {
      await saveDevice(mapCreateFormToDevicePo(draft));
      showSuccess(t("devices.list.createSuccess"));
      setAddOpen(false);
      setDraft(emptyDraft());
      formApi.resetFields();
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("devices.list.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: DeviceListRow) => {
    try {
      await deleteDevice(row.id);
      showSuccess(t("common.deleteSuccess"));
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("devices.list.deleteFailed"));
    }
  };

  return (
    <>
      <ListPageTemplate
        title={t("devices.list.title")}
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
        onSearch={() => {
          setPage(1);
          setFilterApplied({ ...filterDraft });
        }}
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
          { type: "text", key: "name", label: t("common.deviceName") },
          { type: "text", key: "sn", label: "SN" },
          {
            type: "select",
            key: "productType",
            label: t("common.productType"),
            options: productTypeOptions.map((o) => ({ label: o.label, value: o.value })),
          },
          {
            type: "select",
            key: "status",
            label: t("common.status"),
            options: [
              { label: t("status.online"), value: "online" },
              { label: t("status.offline"), value: "offline" },
            ],
          },
        ]}
        columns={[
          {
            key: "name",
            title: t("common.deviceName"),
            render: (r) => (
              <button onClick={() => goDetail(r.id)} className="text-foreground transition hover:text-primary">
                {r.name}
              </button>
            ),
          },
          { key: "sn", title: "SN", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.sn}</span> },
          {
            key: "productName",
            title: t("common.product"),
            render: (r) => (
              <span className="text-text-secondary">
                {r.productName}
                <span className={`ml-1.5 rounded px-1 py-0.5 text-[10px] ${
                  r.productType === "gateway"
                    ? "bg-primary/15 text-primary"
                    : r.productType === "device"
                      ? "bg-status-online/15 text-status-online"
                      : "bg-status-warning/15 text-status-warning"
                }`}>
                  {getProductTypeLabel(r.productType)}
                </span>
              </span>
            ),
          },
          {
            key: "gatewayName",
            title: t("common.linkedGateway"),
            render: (r) =>
              r.gatewayName ? (
                <span className="text-text-secondary">{r.gatewayName}</span>
              ) : (
                <span className="text-text-muted">—</span>
              ),
          },
          { key: "org", title: t("common.orgBelong") },
          { key: "creator", title: t("common.creator") },
          {
            key: "status",
            title: t("common.status"),
            render: (r) => <StatusBadge status={deviceConnectionStatus(r.status)} />,
          },
          {
            key: "createTime",
            title: t("common.createTime"),
            sortable: true,
            sortKey: "t.create_time",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.createTime}</span>,
          },
        ]}
        rows={rows}
        onAdd={() => {
          const next = emptyDraft();
          setDraft(next);
          formApi.setFieldsValue(next);
          setAddOpen(true);
        }}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => goDetail(r.id)}>{t("common.details")}</RowBtn>
            <RowBtn
              danger
              confirm={{ description: t("devices.list.deleteConfirmDesc", { name: r.name }) }}
              onClick={() => void handleDelete(r)}
            >
              {t("common.delete")}
            </RowBtn>
          </>
        )}
      />

      <Drawer
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          formApi.resetFields();
        }}
        title={t("devices.list.addDrawerTitle")}
        size={480}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={drawerFooter([
          { key: "close", label: t("common.close"), onClick: () => setAddOpen(false) },
          {
            key: "save",
            label: saving ? t("common.submitting") : t("common.saveSubmit"),
            type: "primary",
            disabled: saving,
            onClick: () => void saveAdd(),
          },
        ])}
      >
        <DeviceForm formApi={formApi} value={draft} onChange={setDraft} products={products} gateways={gateways} />
      </Drawer>
    </>
  );
}

function DeviceForm({
  formApi,
  value,
  onChange,
  products,
  gateways,
}: {
  formApi: ReturnType<typeof Form.useForm<DeviceCreateForm>>[0];
  value: DeviceCreateForm;
  onChange: (v: DeviceCreateForm) => void;
  products: ProductOption[];
  gateways: GatewayDto[];
}) {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const getProductTypeLabel = useProductTypeLabel();
  const selectedProduct = products.find((p) => p.id === value.productId);
  const showNetworkGateway = selectedProduct?.type === "device" || selectedProduct?.type === "gateway";

  return (
    <Form form={formApi} layout="horizontal">
      <Form.Item
        name="name"
        label={t("common.deviceName")}
        required
        {...drawerFormItemProps}
        rules={[requiredInputRule(t, t("common.deviceName"))]}
      >
        <Input
          value={value.name}
          placeholder={ph.input(t("common.deviceName"))}
          onChange={(e) => {
            onChange({ ...value, name: e.target.value });
            formApi.setFieldValue("name", e.target.value);
          }}
        />
      </Form.Item>
      <Form.Item
        name="sn"
        label="SN"
        required
        {...drawerFormItemProps}
        rules={[requiredInputRule(t, "SN")]}
      >
        <Input
          value={value.sn}
          placeholder={ph.input("SN")}
          onChange={(e) => {
            onChange({ ...value, sn: e.target.value });
            formApi.setFieldValue("sn", e.target.value);
          }}
        />
      </Form.Item>
      <Form.Item
        name="productId"
        label={t("common.linkedProduct")}
        required
        {...drawerFormItemProps}
        {...selectFormItemProps}
        rules={[requiredSelectRule(t, t("common.linkedProduct"))]}
      >
        <Select
          className="vt-select-control"
          classNames={{ popup: { root: "vt-select-popup" } }}
          value={value.productId || undefined}
          placeholder={ph.select(t("common.linkedProduct"))}
          onChange={(productId) => {
            const next = { ...value, productId, gatewayId: "" };
            onChange(next);
            formApi.setFieldsValue({ productId, gatewayId: "" });
          }}
          options={products.map((p) => ({
            value: p.id,
            label: `${p.name} (${getProductTypeLabel(p.type)})`,
          }))}
        />
      </Form.Item>
      {showNetworkGateway && (
        <Form.Item
          name="gatewayId"
          label={t("common.collectGateway")}
          required
          {...drawerFormItemProps}
          {...selectFormItemProps}
          rules={[requiredSelectRule(t, t("common.collectGateway"))]}
        >
          <Select
            className="vt-select-control"
            classNames={{ popup: { root: "vt-select-popup" } }}
            value={value.gatewayId || undefined}
            placeholder={ph.select(t("common.collectGateway"))}
            onChange={(gatewayId) => {
              onChange({ ...value, gatewayId });
              formApi.setFieldValue("gatewayId", gatewayId);
            }}
            options={gateways.map((g) => ({
              value: String(g.gatewayPo?.id ?? ""),
              label: g.gatewayPo?.name ?? "—",
            }))}
          />
        </Form.Item>
      )}
    </Form>
  );
}
