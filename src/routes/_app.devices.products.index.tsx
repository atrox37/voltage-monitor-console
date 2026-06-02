import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteProduct, getDimensionTree, pageProducts, saveProduct } from "@/api";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import {
  mapCreateFormToPo,
  mapProductDtoToRow,
  PRODUCT_TYPE_LABEL,
  PRODUCT_TYPE_OPTIONS,
  type ProductCreateForm,
  type ProductListRow,
  type ProductType,
} from "@/lib/product-mappers";
import { termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import type { PageQuery } from "@/types";

export const Route = createFileRoute("/_app/devices/products/")({
  component: ProductsPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.update_time", order: "desc" }];
const emptyDraft = (): ProductCreateForm => ({ name: "", sn: "", type: "device" });

function ProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProductListRow[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [filterDraft, setFilterDraft] = useState({ name: "", orgId: "", type: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "", orgId: "", type: "" });

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<ProductCreateForm>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<ProductListRow | null>(null);

  const goDetail = (id: string) => navigate({ to: "/devices/products/$id", params: { id } });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const terms = [];
      const name = filterApplied.name.trim();
      if (name) terms.push(termLike("t.name", name));
      if (filterApplied.orgId) {
        terms.push(termEq("t.org_id", toDbId(filterApplied.orgId)));
      }
      if (filterApplied.type) terms.push(termEq("t.type", filterApplied.type));

      const result = await pageProducts({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapProductDtoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      toast.error(err instanceof Error ? err.message : "加载产品列表失败");
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, filterApplied.orgId, filterApplied.type, page]);

  useEffect(() => {
    void getDimensionTree()
      .then((root) => setOrgNodes(dimensionToOrgNodes(root)))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const saveAdd = async () => {
    if (!draft.name.trim() || !draft.sn.trim()) return;
    setSaving(true);
    try {
      await saveProduct(mapCreateFormToPo(draft));
      toast.success(t("common.saveSuccess"));
      setAddOpen(false);
      setDraft(emptyDraft());
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : "创建产品失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteProduct(delTarget.id);
      toast.success(t("common.deleteSuccess"));
      setDelTarget(null);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : "删除产品失败");
    }
  };

  return (
    <>
      <ListPageTemplate<ProductListRow>
        title="产品列表"
        filters={[
          { type: "text", key: "name", label: "产品名称", placeholder: "请输入产品名称" },
          {
            type: "orgTree",
            key: "orgId",
            label: "机构",
            nodes: orgNodes,
            allowAll: true,
            placeholder: t("common.all"),
          },
          {
            type: "select",
            key: "type",
            label: "产品类型",
            options: [{ label: t("common.all"), value: "" }, ...PRODUCT_TYPE_OPTIONS],
          },
        ]}
        columns={[
          {
            key: "name",
            title: "产品名称",
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
            title: "产品类型",
            render: (r) => (
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  r.type === "gateway"
                    ? "bg-primary/15 text-primary"
                    : r.type === "device"
                      ? "bg-status-online/15 text-status-online"
                      : "bg-status-warning/15 text-status-warning"
                }`}
              >
                {PRODUCT_TYPE_LABEL[r.type] ?? r.type}
              </span>
            ),
          },
          { key: "creator", title: "创建人" },
          { key: "org", title: "机构" },
          {
            key: "updateTime",
            title: "更新时间",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span>,
          },
        ]}
        rows={rows}
        loading={loading}
        serverSide
        page={page}
        totalCount={total}
        onPageChange={setPage}
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
          setDraft(emptyDraft());
          setAddOpen(true);
        }}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => goDetail(r.id)}>详情</RowBtn>
            <RowBtn danger onClick={() => setDelTarget(r)}>{t("common.delete")}</RowBtn>
          </>
        )}
      />

      <VtDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新建产品"
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setAddOpen(false)}>{t("common.close")}</VtBtn>
            <VtBtn disabled={saving} onClick={() => void saveAdd()}>
              {saving ? t("common.saving") : t("common.saveSubmit")}
            </VtBtn>
          </>
        }
      >
        <ProductForm value={draft} onChange={setDraft} />
      </VtDrawer>

      {delTarget && (
        <ConfirmDialog
          open
          title={t("common.confirmDelete")}
          description={t("common.confirmDeleteDesc", { target: "产品", name: delTarget.name })}
          danger
          onClose={() => setDelTarget(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </>
  );
}

function ProductForm({
  value,
  onChange,
}: {
  value: ProductCreateForm;
  onChange: (v: ProductCreateForm) => void;
}) {
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
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </VtField>
    </>
  );
}
