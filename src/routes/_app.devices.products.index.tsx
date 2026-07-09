import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer, Form, Input } from 'antd';
import { VtButton } from '@/components/vt-button';
import { OptionToggle } from "@/components/option-toggle";
import { drawerFormItemProps } from "@/components/drawer-form";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { requiredInputRule, requiredSelectRule } from "@/lib/form-validation";
import { useMemo, useState } from "react";
import { showApiError, showSuccess } from "@/lib/api-message";
import { deleteProduct, pageProducts, saveProduct } from "@/api";
import { ListPageTemplate, RowBtn, DateTimeText } from "@/components/list-page-template";
import { useDimensionTreeQuery } from "@/hooks/use-dimension-tree-query";
import { useServerPageQuery } from "@/hooks/use-server-page-query";
import {
  mapCreateFormToPo,
  mapProductDtoToRow,
  type ProductCreateForm,
  type ProductListRow,
} from "@/features/products/lib/product-mappers";
import {
  useProductTypeLabel,
  useProductTypeOptions,
} from "@/features/products/lib/product-type-i18n";
import { useListPagination } from "@/lib/list-pagination";
import { queryKeys } from "@/lib/query-keys";
import { termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import type { DeviceProductPageDto, PageQuery } from "@/types";

export const Route = createFileRoute("/_app/devices/products/")({
  component: ProductsPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.update_time", order: "desc" }];
const emptyDraft = (): ProductCreateForm => ({ name: "", sn: "", type: "device" });

function ProductsPage() {
  const { t } = useTranslation();
  const productTypeLabel = useProductTypeLabel();
  const productTypeOptions = useProductTypeOptions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orgNodes = [] } = useDimensionTreeQuery();
  const { page, setPage, pageSize, onPageSizeChange } = useListPagination();

  const [filterDraft, setFilterDraft] = useState({ name: "", orgId: "", type: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "", orgId: "", type: "" });

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<ProductCreateForm>(emptyDraft());
  const [formApi] = Form.useForm<ProductCreateForm>();

  const goDetail = (id: string) => navigate({ to: "/devices/products/$id", params: { id } });

  const listQuery = useMemo(() => {
    const terms = [];
    const name = filterApplied.name.trim();
    if (name) terms.push(termLike("t.name", name));
    if (filterApplied.orgId) terms.push(termEq("t.org_id", toDbId(filterApplied.orgId)));
    if (filterApplied.type) terms.push(termEq("t.type", filterApplied.type));
    return { terms, sorts: DEFAULT_SORTS };
  }, [filterApplied]);

  const { rows, total, loading } = useServerPageQuery<DeviceProductPageDto, ProductListRow>({
    queryKey: queryKeys.products.list(listQuery),
    page,
    pageSize,
    query: listQuery,
    fetchPage: pageProducts,
    mapRow: mapProductDtoToRow,
    errorMessage: t("devices.products.list.loadFailed"),
  });

  const invalidateList = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.root });

  const saveMutation = useMutation({
    mutationFn: (form: ProductCreateForm) => saveProduct(mapCreateFormToPo(form)),
    onSuccess: () => {
      showSuccess(t("common.saveSuccess"));
      setAddOpen(false);
      setDraft(emptyDraft());
      formApi.resetFields();
      invalidateList();
    },
    onError: (err) => {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.products.list.createFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      showSuccess(t("common.deleteSuccess"));
      invalidateList();
    },
    onError: (err) => {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.products.list.deleteFailed"));
    },
  });

  const saveAdd = () => {
    void formApi
      .validateFields()
      .then(() => saveMutation.mutate(draft))
      .catch(() => undefined);
  };

  const handleDelete = (row: ProductListRow) => {
    deleteMutation.mutate(row.id);
  };

  const saving = saveMutation.isPending;

  return (
    <>
      <ListPageTemplate<ProductListRow>
        title={t("devices.products.list.title")}
        filters={[
          { type: "text", key: "name", label: t("common.productName") },
          {
            type: "orgTree",
            key: "orgId",
            label: t("common.orgLabel"),
            nodes: orgNodes,
          },
          {
            type: "select",
            key: "type",
            label: t("common.productType"),
            options: productTypeOptions,
          },
        ]}
        columns={[
          {
            key: "name",
            title: t("common.productName"),
            render: (r) => (
              <button
                onClick={() => goDetail(r.id)}
                className="text-foreground transition hover:text-primary"
              >
                {r.name}
              </button>
            ),
          },
          {
            key: "type",
            title: t("common.productType"),
            render: (r) => (
              <span
                className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${
                  r.type === "gateway"
                    ? "bg-primary/15 text-primary"
                    : r.type === "device"
                      ? "bg-status-online/15 text-status-online"
                      : "bg-status-warning/15 text-status-warning"
                }`}
              >
                {productTypeLabel(r.type)}
              </span>
            ),
          },
          { key: "creator", title: t("common.creator") },
          { key: "org", title: t("common.orgLabel") },
          {
            key: "updateTime",
            title: t("common.updateTime"),
            render: (r) => <DateTimeText value={r.updateTime} />,
          },
        ]}
        rows={rows}
        loading={loading}
        serverSide
        page={page}
        pageSize={pageSize}
        totalCount={total}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
        filterValues={filterDraft}
        onFilterValuesChange={(next) =>
          setFilterDraft({
            name: next.name ?? "",
            orgId: next.orgId ?? "",
            type: next.type ?? "",
          })
        }
        onSearch={() => {
          setPage(1);
          setFilterApplied({ ...filterDraft });
        }}
        onReset={() => {
          const empty = { name: "", orgId: "", type: "" };
          setFilterDraft(empty);
          setFilterApplied(empty);
          setPage(1);
        }}
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
              confirm={{
                description: t("common.confirmDeleteDesc", {
                  target: t("devices.products.list.deleteTarget"),
                  name: r.name,
                }),
              }}
              onClick={() => handleDelete(r)}
            >
              {t("common.delete")}
            </RowBtn>
          </>
        )}
      />

      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("devices.products.list.addDrawerTitle")}
        size={480}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (open) formApi.setFieldsValue(draft);
        }}
        styles={{ body: { paddingTop: 8 } }}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton type="default" onClick={() => setAddOpen(false)}>
              {t("common.close")}
            </VtButton>
            <VtButton type="primary" disabled={saving} onClick={() => void saveAdd()}>
              {saving ? t("common.saving") : t("common.saveSubmit")}
            </VtButton>
          </div>
        }
      >
        <ProductForm
          form={formApi}
          value={draft}
          onChange={setDraft}
        />
      </Drawer>
    </>
  );
}

function ProductForm({
  form,
  value,
  onChange,
}: {
  form: ReturnType<typeof Form.useForm<ProductCreateForm>>[0];
  value: ProductCreateForm;
  onChange: (v: ProductCreateForm) => void;
}) {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const productTypeOptions = useProductTypeOptions();

  return (
    <Form form={form} layout="horizontal">
      <Form.Item
        name="name"
        label={t("common.productName")}
        required
        {...drawerFormItemProps}
        rules={[requiredInputRule(t, t("common.productName"))]}
      >
        <Input
          value={value.name}
          placeholder={ph.input(t("common.productName"))}
          onChange={(e) => {
            onChange({ ...value, name: e.target.value });
            form.setFieldValue("name", e.target.value);
          }}
        />
      </Form.Item>
      <Form.Item
        name="sn"
        label={t("common.productModel")}
        required
        {...drawerFormItemProps}
        rules={[requiredInputRule(t, t("common.productModel"))]}
      >
        <Input
          value={value.sn}
          placeholder={ph.input(t("common.productModel"))}
          onChange={(e) => {
            onChange({ ...value, sn: e.target.value });
            form.setFieldValue("sn", e.target.value);
          }}
        />
      </Form.Item>
      <Form.Item
        name="type"
        label={t("common.productType")}
        required
        {...drawerFormItemProps}
        rules={[requiredSelectRule(t, t("common.productType"))]}
      >
        <OptionToggle
          value={value.type}
          onChange={(v) => {
            onChange({ ...value, type: v });
            form.setFieldValue("type", v);
          }}
          options={productTypeOptions.map((opt) => ({ label: opt.label, value: opt.value }))}
        />
      </Form.Item>
    </Form>
  );
}
