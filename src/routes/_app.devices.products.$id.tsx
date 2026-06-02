import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Save, RefreshCw, Plus, Pencil, Trash2, X,
  ChevronRight, ChevronDown,
} from "lucide-react";
import { VtDrawer, VtField, VtBtn, vtInputCls, vtSelectCls } from "@/components/vt-drawer";
import { VtDataTable, vtActionColumn } from "@/components/vt-table";
import type { ColumnsType } from "antd/es/table";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useConfirm } from "@/components/confirm-dialog";
import {
  ProductEditContextProvider,
  useProductEdit,
  useProductEditState,
} from "@/lib/product-edit-context";
import { PRODUCT_TYPE_LABEL } from "@/lib/product-mappers";
import { POLL_INTERVAL_OPTIONS, normalizeRuleCron } from "@/lib/poll-interval";
import { DATA_UNITS, PROPERTY_RW, defaultPropertyValueType, unitLabel } from "@/lib/data-types";
import { formatRuleCondition, jsqlToAlarmColumns, rulePollLabel, type AlarmCond } from "@/lib/rule-format";
import { parseProductRule } from "@/api";
import type { JSqlColumn } from "@/types";
import type {
  SimplePropertyMetadata,
  SimpleFunctionMetadata,
  SimpleFunctionParam,
  SimpleTreeMetadata,
  RuleModel,
  TagModel,
  PropertyTagMetadata,
  EnumDataItem,
} from "@/types/api/metadata";

export const Route = createFileRoute("/_app/devices/products/$id")({
  component: ProductDetailPage,
});

type TabKey = "info" | "meta" | "tree" | "rule";

/* =========================================================================
 * 产品详情页 — 对照 src/views/product/ProductInstance.vue
 * ========================================================================= */
function ProductDetailPage() {
  const { id } = Route.useParams();
  const editState = useProductEditState(id);
  return (
    <ProductEditContextProvider value={editState}>
      <ProductDetailView />
    </ProductEditContextProvider>
  );
}

function ProductDetailView() {
  const navigate = useNavigate();
  const { product, loading, saving, syncing, save, syncEdge } = useProductEdit();
  const [tab, setTab] = useState<TabKey>("info");

  if (loading) {
    return (
      <main className="vt-page-content vt-page-fill">
        <div className="vt-glass flex flex-1 items-center justify-center text-sm text-text-muted">
          加载中…
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="vt-page-content">
        <div className="vt-glass flex flex-1 items-center justify-center text-sm text-text-muted">
          产品不存在或已被删除。
          <Link to="/devices/products" className="ml-2 text-primary hover:underline">返回列表</Link>
        </div>
      </main>
    );
  }

  const tabs: { key: TabKey; label: string; hidden?: boolean }[] = [
    { key: "info", label: "基础信息" },
    { key: "meta", label: "物模型" },
    { key: "tree", label: "网关分路", hidden: product.type !== "gateway" },
    { key: "rule", label: "告警规则" },
  ];
  const visible = tabs.filter((t) => !t.hidden);

  return (
    <main className="vt-page-content">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/devices/products" })}
            className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 返回
          </button>
          <h2 className="vt-section-title text-base">{product.name}</h2>
          <span className={`rounded px-1.5 py-0.5 text-xs ${
            product.type === "gateway"  ? "bg-primary/15 text-primary" :
            product.type === "device"   ? "bg-status-online/15 text-status-online" :
            "bg-status-warning/15 text-status-warning"
          }`}>{PRODUCT_TYPE_LABEL[product.type]}</span>
          <span className="font-mono text-[11px] text-text-muted">#{product.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <VtBtn variant="ghost" disabled={syncing} onClick={() => void syncEdge()}>
            <RefreshCw className={`mr-1 inline h-3 w-3 ${syncing ? "animate-spin" : ""}`} /> 边缘同步
          </VtBtn>
          <VtBtn disabled={saving} onClick={() => void save()}>
            <Save className="mr-1 inline h-3 w-3" /> {saving ? "保存中…" : "保存"}
          </VtBtn>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-panel-border">
        {visible.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-2 text-xs transition ${
                active ? "text-primary" : "text-text-secondary hover:text-foreground"
              }`}
            >
              {t.label}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />}
            </button>
          );
        })}
      </div>

      <div className="vt-glass mt-3 flex-1 overflow-hidden p-5">
        {tab === "info" && <TabInfo />}
        {tab === "meta" && <TabMeta />}
        {tab === "tree" && <TabTree />}
        {tab === "rule" && <TabRule />}
      </div>
    </main>
  );
}

/* =========================================================================
 * TAB 1 · 基础信息 — TabProductDetail.vue
 * ========================================================================= */
function TabInfo() {
  const { product, orgNodes, updateProduct, updateMetadata } = useProductEdit();
  const [tagDraft, setTagDraft] = useState<{ tag: TagModel; index: number } | null>(null);
  if (!product) return null;

  const setField = <K extends "name" | "sn">(k: K, v: string) => {
    updateProduct({ [k]: v });
  };
  const closeTag = (i: number) => {
    updateMetadata((m) => ({
      ...m, tags: (m.tags ?? []).filter((_, idx) => idx !== i),
    }));
  };
  const saveTag = () => {
    if (!tagDraft || !tagDraft.tag.tagName.trim()) return;
    updateMetadata((m) => {
      const tags = [...(m.tags ?? [])];
      if (tagDraft.index < 0) tags.push(tagDraft.tag);
      else tags[tagDraft.index] = tagDraft.tag;
      return { ...m, tags };
    });
    setTagDraft(null);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto">
      <div className="text-sm font-semibold text-foreground">{product.name}</div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
        <DescField label="产品名称">
          <input className={vtInputCls} value={product.name} onChange={(e) => setField("name", e.target.value)} />
        </DescField>
        <DescField label="产品型号">
          <input className={vtInputCls} value={product.sn} onChange={(e) => setField("sn", e.target.value)} />
        </DescField>
        <DescField label="产品类型">
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
            product.type === "gateway"  ? "bg-primary/15 text-primary" :
            product.type === "device"   ? "bg-status-online/15 text-status-online" :
            "bg-status-warning/15 text-status-warning"
          }`}>{PRODUCT_TYPE_LABEL[product.type]}</span>
        </DescField>
        <DescField label="创建人">
          <span className="text-text-secondary">{product.creator}</span>
        </DescField>
        <DescField label="所属机构">
          <OrgTreeSelect
            nodes={orgNodes}
            value={product.orgId}
            onChange={(v) => updateProduct({ orgId: v })}
          />
        </DescField>
        <DescField label="更新时间">
          <span className="font-mono text-xs text-text-secondary">{product.updateTime}</span>
        </DescField>
      </div>

      <div>
        <div className="mb-2 text-sm text-foreground">标签</div>
        <div className="flex flex-wrap items-center gap-2">
          {(product.metadata.tags ?? []).map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded border border-panel-border bg-panel/40 px-2 py-0.5 text-xs text-text-secondary">
              <button onClick={() => setTagDraft({ tag: { ...t }, index: i })} className="hover:text-primary">{t.tagName}</button>
              <button onClick={() => closeTag(i)} className="text-text-muted hover:text-status-critical">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setTagDraft({ tag: { tagKey: "", tagName: "", optional: false }, index: -1 })}
            className="inline-flex items-center gap-1 rounded border border-dashed border-panel-border px-2 py-0.5 text-xs text-text-muted hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3 w-3" /> 新增标签
          </button>
        </div>
      </div>

      <VtDrawer
        open={!!tagDraft}
        onClose={() => setTagDraft(null)}
        title={tagDraft && tagDraft.index < 0 ? "新增标签" : "编辑标签"}
        width={420}
        footer={<>
          <VtBtn variant="ghost" onClick={() => setTagDraft(null)}>取消</VtBtn>
          <VtBtn onClick={saveTag}>保存</VtBtn>
        </>}
      >
        {tagDraft && (
          <>
            <VtField label="Key" required>
              <input className={vtInputCls} value={tagDraft.tag.tagKey ?? ""}
                onChange={(e) => setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, tagKey: e.target.value } })} />
            </VtField>
            <VtField label="名称" required>
              <input className={vtInputCls} value={tagDraft.tag.tagName}
                onChange={(e) => setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, tagName: e.target.value } })} />
            </VtField>
            <VtField label="必填">
              <select className={vtSelectCls} value={tagDraft.tag.optional ? "1" : "0"}
                onChange={(e) => setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, optional: e.target.value === "1" } })}>
                <option value="0">是</option>
                <option value="1">否</option>
              </select>
            </VtField>
          </>
        )}
      </VtDrawer>
    </div>
  );
}

function DescField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-3 border-b border-panel-border/40 py-2">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}


/* =========================================================================
 * TAB 2 · 物模型 — DeviceMeta.vue
 *  - 属性表 + 属性分组(propertyTags) 过滤芯片
 *  - 属性编辑抽屉：标识/名称/类型/小数位/枚举值表/单位/读写
 *  - 功能表 + 编辑抽屉：参数 / 输出 (子抽屉编辑参数)
 * ========================================================================= */
function TabMeta() {
  const { product, updateMetadata, dataTypes } = useProductEdit();
  const { confirm, confirmNode } = useConfirm();
  const [sub, setSub] = useState<"prop" | "func">("prop");

  /* —— 属性分组(propertyTags) 过滤 —— */
  const [selectedTagId, setSelectedTagId] = useState<string>("-1"); // -1 = 全部
  const [renameTag, setRenameTag] = useState<{ index: number; name: string } | null>(null);

  const propertyTags: PropertyTagMetadata[] = product?.metadata.propertyTags ?? [];
  const filteredProps = useMemo(() => {
    const all = product?.metadata.properties ?? [];
    if (selectedTagId === "-1") return all;
    return all.filter((p) => p.tagId === selectedTagId);
  }, [product?.metadata.properties, selectedTagId]);

  const addPropertyTag = () => {
    const id = `t${Date.now()}`;
    updateMetadata((m) => ({
      ...m, propertyTags: [...(m.propertyTags ?? []), { id, name: "新分组" }],
    }));
  };

  /* —— 属性 / 功能 抽屉草稿 —— */
  const [propDraft, setPropDraft] = useState<{ data: SimplePropertyMetadata; index: number } | null>(null);
  const [funcDraft, setFuncDraft] = useState<{ data: SimpleFunctionMetadata; index: number } | null>(null);
  const [argDraft, setArgDraft] = useState<{ data: SimpleFunctionParam; kind: "inputs" | "outputs"; index: number } | null>(null);

  const saveProp = () => {
    if (!propDraft || !propDraft.data.name.trim() || !propDraft.data.id.trim()) return;
    updateMetadata((m) => {
      const props = [...(m.properties ?? [])];
      if (propDraft.index < 0) props.push(propDraft.data);
      else props[propDraft.index] = propDraft.data;
      return { ...m, properties: props };
    });
    setPropDraft(null);
  };
  const saveFunc = () => {
    if (!funcDraft || !funcDraft.data.name.trim() || !funcDraft.data.id.trim()) return;
    updateMetadata((m) => {
      const fns = [...(m.functions ?? [])];
      if (funcDraft.index < 0) fns.push(funcDraft.data);
      else fns[funcDraft.index] = funcDraft.data;
      return { ...m, functions: fns };
    });
    setFuncDraft(null);
  };
  // 子抽屉保存参数 — 仅更新 funcDraft 草稿
  const saveArg = () => {
    if (!funcDraft || !argDraft || !argDraft.data.id.trim() || !argDraft.data.name.trim()) return;
    const list = [...(funcDraft.data[argDraft.kind] ?? [])];
    if (argDraft.index < 0) list.push(argDraft.data);
    else list[argDraft.index] = argDraft.data;
    setFuncDraft({ ...funcDraft, data: { ...funcDraft.data, [argDraft.kind]: list } });
    setArgDraft(null);
  };

  const propType = propDraft?.data.valueType?.type ?? "string";

  if (!product) return null;

  const newPropertyDraft = (): SimplePropertyMetadata => ({
    id: "",
    name: "",
    rw: "none",
    create: true,
    tagId: selectedTagId !== "-1" ? selectedTagId : undefined,
    valueType: defaultPropertyValueType("string"),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex overflow-hidden rounded-md border border-panel-border text-xs">
          <SubTab active={sub === "prop"} onClick={() => setSub("prop")}>属性</SubTab>
          <SubTab active={sub === "func"} onClick={() => setSub("func")}>功能</SubTab>
        </div>
        <button
          onClick={() => sub === "prop"
            ? setPropDraft({ data: newPropertyDraft(), index: -1 })
            : setFuncDraft({ data: { id: "", name: "", async: false, inputs: [], outputs: [], create: true }, index: -1 })}
          className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> 新增{sub === "prop" ? "属性" : "功能"}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
      {sub === "prop" ? (
        <MetaTable
          headers={["标识", "名称", "类型", "单位", "分组"]}
          rows={filteredProps.map((p) => [
            <span className="font-mono text-xs text-text-secondary">{p.id}</span>,
            p.name,
            p.valueType?.type ?? "—",
            unitLabel(p.valueType?.unit),
            propertyTags.find((t) => t.id === p.tagId)?.name ?? <span className="text-text-muted">—</span>,
          ])}
          onEdit={(visualIdx) => {
            const original = product.metadata.properties!.findIndex((x) => x.id === filteredProps[visualIdx].id);
            setPropDraft({ data: { ...product.metadata.properties![original] }, index: original });
          }}
          onDelete={(visualIdx) => {
            const original = product.metadata.properties!.findIndex((x) => x.id === filteredProps[visualIdx].id);
            const name = product.metadata.properties![original].name;
            confirm({
              description: <>确定删除属性 <span className="font-semibold text-foreground">「{name}」</span> 吗？</>,
              onConfirm: () => updateMetadata((m) => ({
                ...m, properties: (m.properties ?? []).filter((_, idx) => idx !== original),
              })),
            });
          }}
        />
      ) : (
        <MetaTable
          headers={["标识", "名称", "异步", "参数数"]}
          rows={(product.metadata.functions ?? []).map((f) => [
            <span className="font-mono text-xs text-text-secondary">{f.id}</span>,
            f.name,
            f.async ? "是" : "否",
            <span className="text-text-muted">入 {f.inputs?.length ?? 0} / 出 {f.outputs?.length ?? 0}</span>,
          ])}
          onEdit={(i) => setFuncDraft({ data: JSON.parse(JSON.stringify(product.metadata.functions![i])), index: i })}
          onDelete={(i) => {
            const name = product.metadata.functions![i].name;
            confirm({
              description: <>确定删除功能 <span className="font-semibold text-foreground">「{name}」</span> 吗？</>,
              onConfirm: () => updateMetadata((m) => ({
                ...m, functions: (m.functions ?? []).filter((_, idx) => idx !== i),
              })),
            });
          }}
        />
      )}
      </div>

      {/* 属性分组芯片 — 固定在底部 */}
      {sub === "prop" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-panel-border/60 pt-3">
          <button
            onClick={() => setSelectedTagId("-1")}
            className={`rounded px-2 py-0.5 text-xs transition ${selectedTagId === "-1" ? "bg-primary text-primary-foreground" : "bg-panel/60 text-text-secondary hover:text-foreground"}`}
          >全部</button>
          {propertyTags.map((t, i) => (
            <button
              key={t.id}
              onClick={() => selectedTagId === t.id ? setRenameTag({ index: i, name: t.name }) : setSelectedTagId(t.id)}
              className={`rounded px-2 py-0.5 text-xs transition ${selectedTagId === t.id ? "bg-primary text-primary-foreground" : "bg-panel/60 text-text-secondary hover:text-foreground"}`}
            >{t.name}</button>
          ))}
          <button onClick={addPropertyTag}
            className="inline-flex items-center gap-1 rounded border border-dashed border-panel-border px-2 py-0.5 text-xs text-text-muted hover:border-primary/40 hover:text-primary">
            <Plus className="h-3 w-3" /> 新建分组
          </button>
        </div>
      )}

      {/* ===== 属性抽屉 ===== */}
      <VtDrawer
        open={!!propDraft}
        onClose={() => setPropDraft(null)}
        title={propDraft && propDraft.index < 0 ? "新增属性" : "编辑属性"}
        width={520}
        footer={<>
          <VtBtn variant="ghost" onClick={() => setPropDraft(null)}>取消</VtBtn>
          <VtBtn onClick={saveProp}>保存</VtBtn>
        </>}
      >
        {propDraft && (
          <>
            <VtField label="属性标识" required>
              <input className={vtInputCls} value={propDraft.data.id}
                disabled={!propDraft.data.create}
                onChange={(e) => setPropDraft({ ...propDraft, data: { ...propDraft.data, id: e.target.value } })} />
            </VtField>
            <VtField label="属性名称" required>
              <input className={vtInputCls} value={propDraft.data.name}
                onChange={(e) => setPropDraft({ ...propDraft, data: { ...propDraft.data, name: e.target.value } })} />
            </VtField>
            <VtField label="数据类型">
              <select className={vtSelectCls} value={propType}
                onChange={(e) => {
                  const t = e.target.value;
                  setPropDraft({ ...propDraft, data: {
                    ...propDraft.data,
                    valueType: defaultPropertyValueType(t),
                  } });
                }}>
                {dataTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </VtField>
            {propType === "number" && (
              <VtField label="小数位">
                <input type="number" min={0} max={10} className={vtInputCls}
                  value={propDraft.data.valueType?.extra?.point ?? 1}
                  onChange={(e) => setPropDraft({ ...propDraft, data: {
                    ...propDraft.data,
                    valueType: {
                      ...(propDraft.data.valueType ?? defaultPropertyValueType("number")),
                      extra: { ...(propDraft.data.valueType?.extra ?? {}), point: Number(e.target.value) || 0 },
                    },
                  } })} />
              </VtField>
            )}
            {propType === "enum" && (
              <VtField label="枚举值" full>
                <EnumEditor
                  data={(propDraft.data.valueType?.extra?.enumData as EnumDataItem[]) ?? []}
                  onChange={(enumData) => setPropDraft({ ...propDraft, data: {
                    ...propDraft.data,
                    valueType: { ...(propDraft.data.valueType ?? { type: "enum" }),
                      extra: { ...(propDraft.data.valueType?.extra ?? {}), enumData } },
                  } })}
                />
              </VtField>
            )}
            <VtField label="单位">
              <select className={vtSelectCls} value={propDraft.data.valueType?.unit ?? ""}
                onChange={(e) => setPropDraft({ ...propDraft, data: {
                  ...propDraft.data,
                  valueType: { ...(propDraft.data.valueType ?? defaultPropertyValueType(propType)), unit: e.target.value },
                } })}>
                {DATA_UNITS.map((u) => (
                  <option key={u.unit || "none"} value={u.unit}>{u.en}{u.unit ? ` (${u.unit})` : ""}</option>
                ))}
              </select>
            </VtField>
            <VtField label="读写">
              <div className="inline-flex overflow-hidden rounded border border-panel-border text-xs">
                {PROPERTY_RW.map((rw) => (
                  <button
                    key={rw.value}
                    onClick={() => setPropDraft({ ...propDraft, data: { ...propDraft.data, rw: rw.value } })}
                    className={`px-3 py-1.5 transition ${
                      (propDraft.data.rw ?? "readwrite") === rw.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-panel text-text-secondary hover:text-foreground"
                    }`}
                  >{rw.label}</button>
                ))}
              </div>
            </VtField>
            <VtField label="所属分组">
              <select className={vtSelectCls} value={propDraft.data.tagId ?? ""}
                onChange={(e) => setPropDraft({ ...propDraft, data: { ...propDraft.data, tagId: e.target.value || undefined } })}>
                <option value="">无</option>
                {propertyTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </VtField>
          </>
        )}
      </VtDrawer>

      {/* ===== 功能抽屉 ===== */}
      <VtDrawer
        open={!!funcDraft}
        onClose={() => setFuncDraft(null)}
        title={funcDraft && funcDraft.index < 0 ? "新增功能" : "编辑功能"}
        width={560}
        zIndex={50}
        hideOverlay={!!argDraft}
        footer={<>
          <VtBtn variant="ghost" onClick={() => setFuncDraft(null)}>取消</VtBtn>
          <VtBtn onClick={saveFunc}>保存</VtBtn>
        </>}
      >
        {funcDraft && (
          <>
            <VtField label="标识" required>
              <input className={vtInputCls} value={funcDraft.data.id}
                onChange={(e) => setFuncDraft({ ...funcDraft, data: { ...funcDraft.data, id: e.target.value } })} />
            </VtField>
            <VtField label="名称" required>
              <input className={vtInputCls} value={funcDraft.data.name}
                onChange={(e) => setFuncDraft({ ...funcDraft, data: { ...funcDraft.data, name: e.target.value } })} />
            </VtField>
            <VtField label="异步">
              <select className={vtSelectCls} value={funcDraft.data.async ? "1" : "0"}
                onChange={(e) => setFuncDraft({ ...funcDraft, data: { ...funcDraft.data, async: e.target.value === "1" } })}>
                <option value="0">否</option>
                <option value="1">是</option>
              </select>
            </VtField>
            <ArgSection
              title="输入参数"
              items={funcDraft.data.inputs ?? []}
              onAdd={() => setArgDraft({ data: { id: "", name: "", valueType: defaultPropertyValueType("string") }, kind: "inputs", index: -1 })}
              onEdit={(i) => setArgDraft({ data: { ...(funcDraft.data.inputs ?? [])[i] }, kind: "inputs", index: i })}
              onDelete={(i) => {
                const list = (funcDraft.data.inputs ?? []).filter((_, idx) => idx !== i);
                setFuncDraft({ ...funcDraft, data: { ...funcDraft.data, inputs: list } });
              }}
            />
            <ArgSection
              title="输出结果"
              items={funcDraft.data.outputs ?? []}
              onAdd={() => setArgDraft({ data: { id: "", name: "", valueType: defaultPropertyValueType("string") }, kind: "outputs", index: -1 })}
              onEdit={(i) => setArgDraft({ data: { ...(funcDraft.data.outputs ?? [])[i] }, kind: "outputs", index: i })}
              onDelete={(i) => {
                const list = (funcDraft.data.outputs ?? []).filter((_, idx) => idx !== i);
                setFuncDraft({ ...funcDraft, data: { ...funcDraft.data, outputs: list } });
              }}
            />
          </>
        )}
      </VtDrawer>

      {/* ===== 参数子抽屉（覆盖在功能抽屉之上） ===== */}
      <VtDrawer
        open={!!argDraft}
        onClose={() => setArgDraft(null)}
        title="参数信息"
        width={420}
        zIndex={60}
        hideOverlay
        footer={<>
          <VtBtn variant="ghost" onClick={() => setArgDraft(null)}>取消</VtBtn>
          <VtBtn onClick={saveArg}>保存</VtBtn>
        </>}
      >
        {argDraft && (
          <>
            <VtField label="参数标识" required>
              <input className={vtInputCls} value={argDraft.data.id}
                onChange={(e) => setArgDraft({ ...argDraft, data: { ...argDraft.data, id: e.target.value } })} />
            </VtField>
            <VtField label="参数名称" required>
              <input className={vtInputCls} value={argDraft.data.name}
                onChange={(e) => setArgDraft({ ...argDraft, data: { ...argDraft.data, name: e.target.value } })} />
            </VtField>
            <VtField label="类型">
              <select className={vtSelectCls} value={argDraft.data.valueType?.type ?? "string"}
                onChange={(e) => setArgDraft({ ...argDraft, data: { ...argDraft.data,
                  valueType: defaultPropertyValueType(e.target.value) } })}>
                {dataTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </VtField>
            {argDraft.data.valueType?.type === "enum" && (
              <VtField label="枚举值" full>
                <EnumEditor
                  data={(argDraft.data.valueType?.extra?.enumData as EnumDataItem[]) ?? []}
                  onChange={(enumData) => setArgDraft({ ...argDraft, data: {
                    ...argDraft.data,
                    valueType: { ...(argDraft.data.valueType ?? { type: "enum" }),
                      extra: { ...(argDraft.data.valueType?.extra ?? {}), enumData } },
                  } })}
                />
              </VtField>
            )}
            <VtField label="单位">
              <select className={vtSelectCls} value={argDraft.data.valueType?.unit ?? ""}
                onChange={(e) => setArgDraft({ ...argDraft, data: {
                  ...argDraft.data,
                  valueType: { ...(argDraft.data.valueType ?? { type: "string" }), unit: e.target.value },
                } })}>
                <option value="">无</option>
                {DATA_UNITS.map((u) => <option key={u.unit} value={u.unit}>{u.en} ({u.unit})</option>)}
              </select>
            </VtField>
          </>
        )}
      </VtDrawer>

      {/* 分组重命名 */}
      <VtDrawer
        open={!!renameTag}
        onClose={() => setRenameTag(null)}
        title="编辑分组"
        width={400}
        footer={<>
          <VtBtn variant="ghost" onClick={() => {
            if (!renameTag) return;
            confirm({
              description: <>确定删除分组 <span className="font-semibold text-foreground">「{propertyTags[renameTag.index]?.name}」</span> 吗？该分组下的属性会被设为未分组。</>,
              onConfirm: () => {
                updateMetadata((m) => {
                  const tagId = (m.propertyTags ?? [])[renameTag.index]?.id;
                  return {
                    ...m,
                    propertyTags: (m.propertyTags ?? []).filter((_, i) => i !== renameTag.index),
                    properties: (m.properties ?? []).map((p) => p.tagId === tagId ? { ...p, tagId: undefined } : p),
                  };
                });
                setSelectedTagId("-1");
                setRenameTag(null);
              },
            });
          }}>删除分组</VtBtn>
          <VtBtn onClick={() => {
            if (!renameTag || !renameTag.name.trim()) return;
            updateMetadata((m) => ({
              ...m, propertyTags: (m.propertyTags ?? []).map((t, i) => i === renameTag.index ? { ...t, name: renameTag.name } : t),
            }));
            setRenameTag(null);
          }}>保存</VtBtn>
        </>}
      >
        {renameTag && (
          <VtField label="分组名称" required>
            <input className={vtInputCls} value={renameTag.name} autoFocus
              onChange={(e) => setRenameTag({ ...renameTag, name: e.target.value })} />
          </VtField>
        )}
      </VtDrawer>

      {confirmNode}
    </div>
  );
}

/* —— 枚举值编辑器 —— */
function EnumEditor({ data, onChange }: { data: EnumDataItem[]; onChange: (d: EnumDataItem[]) => void }) {
  const update = (i: number, patch: Partial<EnumDataItem>) =>
    onChange(data.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  type EnumRow = { index: number; item: EnumDataItem };
  const rows: EnumRow[] = data.map((item, index) => ({ index, item }));
  const columns: ColumnsType<EnumRow> = [
    {
      key: "enumKey",
      title: "Key (数值)",
      render: (_, row) => (
        <input className={vtInputCls} value={row.item.key} onChange={(e) => update(row.index, { key: e.target.value })} />
      ),
    },
    {
      key: "enumValue",
      title: "显示文本",
      render: (_, row) => (
        <input className={vtInputCls} value={row.item.value} onChange={(e) => update(row.index, { value: e.target.value })} />
      ),
    },
    {
      key: "actions",
      title: (
        <button onClick={() => onChange([...data, { key: "", value: "" }])}
          className="rounded p-0.5 text-text-muted hover:text-primary"><Plus className="h-3.5 w-3.5" /></button>
      ),
      width: 64,
      align: "right",
      render: (_, row) => (
        <button onClick={() => onChange(data.filter((_, idx) => idx !== row.index))}
          className="rounded p-1 text-text-muted hover:bg-status-critical/10 hover:text-status-critical">
          <Trash2 className="h-3 w-3" />
        </button>
      ),
    },
  ];
  return (
    <div className="overflow-hidden rounded border border-panel-border">
      <VtDataTable<EnumRow>
        rowKey="index"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: "暂无枚举值" }}
      />
    </div>
  );
}

/* —— 功能参数小节 (输入/输出) —— */
function ArgSection({ title, items, onAdd, onEdit, onDelete }: {
  title: string;
  items: SimpleFunctionParam[];
  onAdd: () => void;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  type ArgRow = SimpleFunctionParam & { index: number };
  const rows: ArgRow[] = items.map((item, index) => ({ ...item, index }));
  const columns: ColumnsType<ArgRow> = [
    { key: "id", title: "标识", dataIndex: "id", render: (v) => <span className="font-mono text-[11px] text-text-secondary">{v}</span> },
    { key: "name", title: "名称", dataIndex: "name" },
    { key: "type", title: "类型", render: (_, row) => <span className="text-text-muted">{row.valueType?.type ?? "—"}</span> },
    vtActionColumn<ArgRow>("操作", (row) => (
      <>
        <button onClick={() => onEdit(row.index)} className="mx-0.5 rounded p-1 text-text-muted hover:text-primary"><Pencil className="h-3 w-3" /></button>
        <button onClick={() => onDelete(row.index)} className="mx-0.5 rounded p-1 text-text-muted hover:text-status-critical"><Trash2 className="h-3 w-3" /></button>
      </>
    ), 100),
  ];
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary">{title}</span>
        <button onClick={onAdd}
          className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-0.5 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">
          <Plus className="h-3 w-3" /> 添加
        </button>
      </div>
      <div className="overflow-hidden rounded border border-panel-border">
        <VtDataTable<ArgRow>
          rowKey="index"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: "暂无参数" }}
        />
      </div>
    </div>
  );
}

function SubTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 transition ${active ? "bg-primary text-primary-foreground" : "bg-panel text-text-secondary hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function MetaTable({ headers, rows, onEdit, onDelete }: {
  headers: string[];
  rows: React.ReactNode[][];
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  type MetaRow = { key: number; cells: React.ReactNode[] };
  const data: MetaRow[] = rows.map((cells, key) => ({ key, cells }));
  const columns: ColumnsType<MetaRow> = [
    ...headers.map((title, i) => ({
      key: `col-${i}`,
      title,
      render: (_: unknown, row: MetaRow) => row.cells[i],
    })),
    vtActionColumn<MetaRow>("操作", (row) => (
      <>
        <button onClick={() => onEdit(row.key)}
          className="mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary transition hover:border-primary/40 hover:text-primary">
          <Pencil className="h-3 w-3" /> 编辑
        </button>
        <button onClick={() => onDelete(row.key)}
          className="mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded border border-status-critical/40 px-2 py-1 text-xs text-status-critical transition hover:bg-status-critical/10">
          <Trash2 className="h-3 w-3" /> 删除
        </button>
      </>
    ), 180),
  ];
  return (
    <div className="overflow-hidden rounded border border-panel-border">
      <VtDataTable<MetaRow>
        rowKey="key"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={data}
        scrollX="max-content"
        locale={{ emptyText: "暂无数据" }}
      />
    </div>
  );
}

/* =========================================================================
 * TAB 3 · 网关路由 — TabProductTree.vue
 * ========================================================================= */
function TabTree() {
  const { product, updateMetadata } = useProductEdit();
  const { confirm, confirmNode } = useConfirm();
  const [renameOf, setRenameOf] = useState<{ id: string; name: string } | null>(null);

  const newId = () => `n${Math.floor(Math.random() * 1e6)}`;

  const append = (parentId: string | null) => {
    updateMetadata((m) => {
      const trees = JSON.parse(JSON.stringify(m.trees ?? [])) as SimpleTreeMetadata[];
      const node = { id: newId(), name: "节点", children: [] };
      if (parentId === null) { trees.push(node); return { ...m, trees }; }
      const walk = (ns: SimpleTreeMetadata[]) => {
        for (const n of ns) {
          if (n.id === parentId) { (n.children ??= []).push(node); return true; }
          if (n.children && walk(n.children)) return true;
        }
        return false;
      };
      walk(trees);
      return { ...m, trees };
    });
  };
  const remove = (id: string) => {
    updateMetadata((m) => {
      const filter = (ns: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        ns.filter((n) => n.id !== id).map((n) => ({ ...n, children: n.children ? filter(n.children) : [] }));
      return { ...m, trees: filter(m.trees ?? []) };
    });
  };
  const rename = () => {
    if (!renameOf) return;
    updateMetadata((m) => {
      const walk = (ns: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        ns.map((n) => n.id === renameOf.id ? { ...n, name: renameOf.name } : { ...n, children: n.children ? walk(n.children) : [] });
      return { ...m, trees: walk(m.trees ?? []) };
    });
    setRenameOf(null);
  };

  if (!product) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">结构路径</h3>
        <button onClick={() => append(null)}
          className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110">
          <Plus className="h-3.5 w-3.5" /> 新增根节点
        </button>
      </div>
      <div className="rounded border border-panel-border p-3">
        {(product.metadata.trees ?? []).length === 0 ? (
          <div className="py-10 text-center text-xs text-text-muted">暂无数据</div>
        ) : (
          <ul className="text-sm">
            {(product.metadata.trees ?? []).map((n) => (
              <TreeNode key={n.id} node={n}
                onAppend={(id) => append(id)}
                onRename={(n) => setRenameOf({ id: n.id, name: n.name })}
                onDelete={(n) => confirm({
                  description: <>确定要删除节点 <span className="font-semibold text-foreground">「{n.name}」</span>{n.children?.length ? "（及其子节点）" : ""} 吗？</>,
                  onConfirm: () => remove(n.id),
                })}
              />
            ))}
          </ul>
        )}
      </div>

      <VtDrawer
        open={!!renameOf} onClose={() => setRenameOf(null)} title="重命名节点" width={400}
        footer={<>
          <VtBtn variant="ghost" onClick={() => setRenameOf(null)}>取消</VtBtn>
          <VtBtn onClick={rename}>保存</VtBtn>
        </>}
      >
        {renameOf && (
          <VtField label="节点名称" required>
            <input className={vtInputCls} value={renameOf.name} autoFocus
              onChange={(e) => setRenameOf({ ...renameOf, name: e.target.value })} />
          </VtField>
        )}
      </VtDrawer>
      {confirmNode}
    </div>
  );
}

function TreeNode({ node, onAppend, onRename, onDelete }: {
  node: SimpleTreeMetadata;
  onAppend: (id: string) => void;
  onRename: (n: SimpleTreeMetadata) => void;
  onDelete: (n: SimpleTreeMetadata) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!node.children?.length;
  return (
    <li className="border-l border-panel-border/60 pl-3">
      <div className="group flex items-center justify-between py-1.5">
        <div className="flex items-center gap-1.5">
          {hasChildren ? (
            <button onClick={() => setOpen((o) => !o)} className="text-text-muted">
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : <span className="w-3" />}
          <span className="text-foreground">{node.name}</span>
          <span className="font-mono text-[10px] text-text-muted">#{node.id}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <IconAction icon={Pencil} label="重命名" onClick={() => onRename(node)} />
          <IconAction icon={Plus}   label="新增子节点" onClick={() => onAppend(node.id)} />
          <IconAction icon={Trash2} label="删除" danger onClick={() => onDelete(node)} />
        </div>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children!.map((c) => (
            <TreeNode key={c.id} node={c} onAppend={onAppend} onRename={onRename} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </li>
  );
}

function IconAction({ icon: Icon, label, onClick, danger }: {
  icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button title={label} onClick={onClick}
      className={`rounded p-1 ${danger ? "text-text-muted hover:bg-status-critical/10 hover:text-status-critical" : "text-text-muted hover:bg-panel hover:text-primary"}`}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/* =========================================================================
 * TAB 4 · 告警规则 — TabProductRule.vue + DialogAlarmRule.vue + ProductAlarmItem.vue
 * ========================================================================= */
// 草稿规则带 columns (多组 AND 条件 — 组间 OR)
type RuleDraft = RuleModel & { columns?: AlarmCond[][] };

const OPERATIONS_NUM = [
  { value: ">", label: "大于" },
  { value: "<", label: "小于" },
  { value: "=", label: "等于" },
  { value: ">=", label: "大于等于" },
  { value: "<=", label: "小于等于" },
  { value: "!=", label: "不等于" },
];
const OPERATIONS_ENUM = [{ value: "=", label: "等于" }];
const OPERATIONS_STR = [
  { value: "=", label: "等于" },
  { value: "IS NOT NULL", label: "不为空" },
];

function operationsFor(type: string | undefined) {
  if (type === "enum") return OPERATIONS_ENUM;
  if (["int","long","float","double","number"].includes(type ?? "")) return OPERATIONS_NUM;
  return OPERATIONS_STR;
}

function TabRule() {
  const { product, updateMetadata, serializeRule } = useProductEdit();
  const { confirm, confirmNode } = useConfirm();
  const [draft, setDraft] = useState<{ rule: RuleDraft; index: number } | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleLoading, setRuleLoading] = useState(false);

  const properties = product?.metadata.properties ?? [];

  const toJsqlColumns = (groups: AlarmCond[][]): JSqlColumn[][] =>
    groups.map((grp) =>
      grp.map((c) => ({
        column: c.column,
        operation: c.operation,
        value: c.value,
        valueType: c.valueType,
      })),
    );

  const openRuleEdit = async (row: RuleModel, index: number) => {
    setRuleLoading(true);
    try {
      const base: RuleDraft = JSON.parse(JSON.stringify(row));
      base.ruleData = {
        type: "time",
        count: base.ruleData?.count ?? 1,
        cron: normalizeRuleCron(base.ruleData),
      };
      if (base.ruleMeta?.sql) {
        const parsed = await parseProductRule(base.ruleMeta);
        base.columns = jsqlToAlarmColumns(parsed);
      } else {
        base.columns = base.columns ?? [[]];
      }
      setDraft({ rule: base, index });
    } catch {
      setDraft({
        rule: {
          ...JSON.parse(JSON.stringify(row)),
          columns: [[]],
          ruleData: { type: "time", count: row.ruleData?.count ?? 1, cron: normalizeRuleCron(row.ruleData) },
        },
        index,
      });
    } finally {
      setRuleLoading(false);
    }
  };

  const saveRule = async () => {
    if (!draft || !draft.rule.name.trim()) return;
    setRuleSaving(true);
    try {
      const { columns, ...rulePo } = draft.rule;
      const cron = normalizeRuleCron(draft.rule.ruleData);
      await serializeRule(draft.index, {
        ...rulePo,
        ruleData: { ...rulePo.ruleData, type: "time", cron, count: rulePo.ruleData?.count ?? 1 },
      }, toJsqlColumns(columns ?? [[]]));
      setDraft(null);
    } catch {
      // toast handled in context
    } finally {
      setRuleSaving(false);
    }
  };

  if (!product) return null;

  type RuleRow = RuleDraft & { index: number };
  const ruleRows: RuleRow[] = (product.metadata.rules as RuleDraft[] ?? []).map((r, index) => ({ ...r, index }));
  const ruleColumns: ColumnsType<RuleRow> = [
    { key: "name", title: "规则名称", dataIndex: "name" },
    { key: "poll", title: "轮询周期", render: (_, r) => <span className="text-xs text-text-secondary">{rulePollLabel(r)}</span> },
    { key: "count", title: "触发阈值", render: (_, r) => <span className="text-xs text-text-secondary">连续 {r.ruleData?.count ?? 1} 次</span> },
    {
      key: "condition",
      title: "触发条件",
      render: (_, r) => <span className="max-w-md text-xs text-text-secondary">{formatRuleCondition(r, properties)}</span>,
    },
    {
      key: "state",
      title: "状态",
      render: (_, r) => (
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${
          r.state === 1 ? "bg-status-online/15 text-status-online" : "bg-panel-heavy text-text-muted"
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {r.state === 1 ? "已启用" : "已禁用"}
        </span>
      ),
    },
    vtActionColumn<RuleRow>("操作", (r) => (
      <>
        <button disabled={ruleLoading} onClick={() => void openRuleEdit(r, r.index)}
          className="mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
          <Pencil className="h-3 w-3" /> 编辑
        </button>
        <button onClick={() => confirm({
          description: <>确定删除规则 <span className="font-semibold text-foreground">「{r.name}」</span> 吗？</>,
          onConfirm: () => updateMetadata((m) => ({
            ...m, rules: (m.rules ?? []).filter((_, idx) => idx !== r.index),
          })),
        })}
          className="mx-0.5 inline-flex items-center gap-1 rounded border border-status-critical/40 px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10">
          <Trash2 className="h-3 w-3" /> 删除
        </button>
      </>
    ), 180),
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          onClick={() => setDraft({
            rule: {
              id: `r${Date.now()}`, name: "", state: 1,
              ruleData: { type: "time", cron: POLL_INTERVAL_OPTIONS[0].value, count: 1 },
              ruleMeta: { sql: "", param: {} },
              columns: [[]],
            },
            index: -1,
          })}
          className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> 新增规则
        </button>
      </div>

      <div className="overflow-hidden rounded border border-panel-border">
        <VtDataTable<RuleRow>
          rowKey="id"
          size="small"
          pagination={false}
          columns={ruleColumns}
          dataSource={ruleRows}
          scrollX="max-content"
          locale={{ emptyText: "暂无规则" }}
        />
      </div>

      <VtDrawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft && draft.index < 0 ? "新增告警规则" : "编辑告警规则"}
        width={720}
        footer={<>
          <VtBtn variant="ghost" onClick={() => setDraft(null)}>取消</VtBtn>
          <VtBtn disabled={ruleSaving} onClick={() => void saveRule()}>
            {ruleSaving ? "保存中…" : "保存"}
          </VtBtn>
        </>}
      >
        {draft && (
          <>
            <VtField label="规则名称" required>
              <input className={vtInputCls} value={draft.rule.name}
                onChange={(e) => setDraft({ ...draft, rule: { ...draft.rule, name: e.target.value } })} />
            </VtField>
            <VtField label="工作状态">
              <div className="inline-flex overflow-hidden rounded border border-panel-border text-xs">
                {[{v:1,l:"启用"},{v:0,l:"关闭"}].map((o) => (
                  <button key={o.v}
                    onClick={() => setDraft({ ...draft, rule: { ...draft.rule, state: o.v } })}
                    className={`px-3 py-1.5 transition ${
                      (draft.rule.state ?? 0) === o.v
                        ? "bg-primary text-primary-foreground"
                        : "bg-panel text-text-secondary hover:text-foreground"
                    }`}
                  >{o.l}</button>
                ))}
              </div>
            </VtField>
            <VtField label="触发方式">
              <span className="inline-flex items-center rounded bg-primary/10 px-2 py-1 text-xs text-primary">定时轮询</span>
            </VtField>
            <VtField label="轮询周期">
              <select className={vtSelectCls} value={normalizeRuleCron(draft.rule.ruleData)}
                onChange={(e) => setDraft({ ...draft, rule: {
                  ...draft.rule,
                  ruleData: { ...(draft.rule.ruleData ?? { type: "time" }), cron: e.target.value },
                } })}>
                {POLL_INTERVAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </VtField>
            <VtField label="触发阈值">
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-muted">连续</span>
                <input type="number" min={1} className={`${vtInputCls} w-20`}
                  value={draft.rule.ruleData?.count ?? 1}
                  onChange={(e) => setDraft({ ...draft, rule: {
                    ...draft.rule,
                    ruleData: { ...(draft.rule.ruleData ?? { type: "time" }), count: Number(e.target.value) },
                  } })} />
                <span className="text-xs text-text-muted">次满足条件后触发</span>
              </div>
            </VtField>
            <VtField label="触发条件" full>
              <AlarmConditionBuilder
                groups={draft.rule.columns ?? [[]]}
                properties={properties}
                onChange={(columns) => setDraft({ ...draft, rule: { ...draft.rule, columns } })}
              />
            </VtField>
          </>
        )}
      </VtDrawer>

      {confirmNode}
    </div>
  );
}

/* —— 告警条件构建器 (groups -> rows) —— */
function AlarmConditionBuilder({
  groups, properties, onChange,
}: {
  groups: AlarmCond[][];
  properties: SimplePropertyMetadata[];
  onChange: (g: AlarmCond[][]) => void;
}) {
  const setRow = (gi: number, ri: number, patch: Partial<AlarmCond>) => {
    onChange(groups.map((g, i) => i !== gi ? g : g.map((r, j) => j !== ri ? r : { ...r, ...patch })));
  };
  const addRow = (gi: number) => {
    if (properties.length === 0) return;
    const p = properties[0];
    const ops = operationsFor(p.valueType?.type);
    const newRow: AlarmCond = {
      column: p.id, operation: ops[0].value,
      value: p.valueType?.type === "enum" ? (p.valueType.extra?.enumData?.[0]?.key ?? "")
        : ["int","long","float","double","number"].includes(p.valueType?.type ?? "") ? 0 : "",
      valueType: p.valueType?.type,
    };
    onChange(groups.map((g, i) => i !== gi ? g : [...g, newRow]));
  };
  const delRow = (gi: number, ri: number) =>
    onChange(groups.map((g, i) => i !== gi ? g : g.filter((_, j) => j !== ri)));
  const addGroup = () => onChange([...groups, []]);
  const delGroup = (gi: number) => onChange(groups.filter((_, i) => i !== gi));

  // 当属性改变 — 重置 op + value
  const onColumnChange = (gi: number, ri: number, columnId: string) => {
    const p = properties.find((x) => x.id === columnId);
    if (!p) return;
    const ops = operationsFor(p.valueType?.type);
    setRow(gi, ri, {
      column: columnId,
      operation: ops[0].value,
      valueType: p.valueType?.type,
      value: p.valueType?.type === "enum" ? (p.valueType.extra?.enumData?.[0]?.key ?? "")
        : ["int","long","float","double","number"].includes(p.valueType?.type ?? "") ? 0 : "",
    });
  };

  type CondRow = { ri: number; cond: AlarmCond };
  const condColumns = (gi: number): ColumnsType<CondRow> => [
    {
      key: "column",
      title: "属性",
      render: (_, { ri, cond: r }) => (
        <select className={vtSelectCls} value={r.column}
          onChange={(e) => onColumnChange(gi, ri, e.target.value)}>
          {properties.map((pp) => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
        </select>
      ),
    },
    {
      key: "operation",
      title: "比较",
      render: (_, { ri, cond: r }) => {
        const p = properties.find((x) => x.id === r.column);
        const ops = operationsFor(p?.valueType?.type);
        return (
          <select className={vtSelectCls} value={r.operation}
            onChange={(e) => setRow(gi, ri, { operation: e.target.value })}>
            {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      },
    },
    {
      key: "value",
      title: "值",
      render: (_, { ri, cond: r }) => {
        const p = properties.find((x) => x.id === r.column);
        const isNumber = ["int", "long", "float", "double", "number"].includes(p?.valueType?.type ?? "");
        const isEnum = p?.valueType?.type === "enum";
        const enumData = (p?.valueType?.extra?.enumData as EnumDataItem[]) ?? [];
        if (r.operation === "IS NOT NULL") return <span className="text-text-muted">—</span>;
        if (isEnum) {
          return (
            <select className={vtSelectCls} value={String(r.value)}
              onChange={(e) => setRow(gi, ri, { value: e.target.value })}>
              {enumData.map((d) => <option key={d.key} value={d.key}>{d.value}</option>)}
            </select>
          );
        }
        if (isNumber) {
          return (
            <input type="number" className={vtInputCls} value={Number(r.value) || 0}
              onChange={(e) => setRow(gi, ri, { value: Number(e.target.value) })} />
          );
        }
        return (
          <input className={vtInputCls} value={String(r.value ?? "")}
            onChange={(e) => setRow(gi, ri, { value: e.target.value })} />
        );
      },
    },
    {
      key: "actions",
      width: 48,
      align: "right",
      render: (_, { ri }) => (
        <button onClick={() => delRow(gi, ri)}
          className="rounded p-1 text-text-muted hover:bg-status-critical/10 hover:text-status-critical">
          <Trash2 className="h-3 w-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {groups.map((rows, gi) => (
        <div key={gi} className="rounded border border-dashed border-panel-border p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="rounded bg-panel/60 px-1.5 py-0.5 text-[10px] text-text-muted">条件组 {gi + 1} · 组内 AND</span>
            <div className="flex items-center gap-1">
              <button onClick={() => addRow(gi)}
                className="inline-flex items-center gap-0.5 rounded border border-panel-border px-1.5 py-0.5 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">
                <Plus className="h-3 w-3" /> 条件
              </button>
              {groups.length > 1 && (
                <button onClick={() => delGroup(gi)}
                  className="rounded border border-status-critical/40 p-1 text-status-critical hover:bg-status-critical/10">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <VtDataTable<CondRow>
            rowKey="ri"
            size="small"
            pagination={false}
            columns={condColumns(gi)}
            dataSource={rows.map((cond, ri) => ({ ri, cond }))}
            locale={{ emptyText: "尚未添加条件" }}
          />
        </div>
      ))}
      <button onClick={addGroup}
        className="inline-flex items-center gap-1 rounded border border-dashed border-panel-border px-3 py-1 text-xs text-text-muted hover:border-primary/40 hover:text-primary">
        <Plus className="h-3.5 w-3.5" /> 新增条件组 (组间 OR)
      </button>
      {properties.length === 0 && (
        <p className="text-xs text-status-warning">该产品暂无属性，请先在「物模型」选项卡中添加属性后再配置告警条件。</p>
      )}
    </div>
  );
}
