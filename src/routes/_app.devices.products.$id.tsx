import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Save, RefreshCw, Plus, Pencil, Trash2, X,
  ChevronRight, ChevronDown,
} from "lucide-react";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useConfirm } from "@/components/confirm-dialog";
import {
  type ProductType,
  PRODUCT_TYPE_LABEL,
  productActions,
  useProduct,
} from "@/lib/products-store";
import type {
  SimplePropertyMetadata,
  SimpleFunctionMetadata,
  SimpleTreeMetadata,
  RuleModel,
  TagModel,
} from "@/types/api/metadata";

export const Route = createFileRoute("/_app/devices/products/$id")({
  component: ProductDetailPage,
});

type TabKey = "info" | "meta" | "tree" | "rule";

function ProductDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const product = useProduct(id);
  const [tab, setTab] = useState<TabKey>("info");

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
    { key: "tree", label: "网关路由", hidden: product.type !== "gateway" },
    { key: "rule", label: "告警规则" },
  ];
  const visible = tabs.filter((t) => !t.hidden);

  return (
    <main className="vt-page-content">
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
        </div>
        <div className="flex items-center gap-2">
          <VtBtn variant="ghost" onClick={() => alert("边缘同步成功")}>
            <RefreshCw className="mr-1 inline h-3 w-3" /> 边缘同步
          </VtBtn>
          <VtBtn onClick={() => alert("已保存")}>
            <Save className="mr-1 inline h-3 w-3" /> 保存
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

      <div className="vt-glass mt-3 flex-1 overflow-auto p-5">
        {tab === "info" && <TabInfo productId={product.id} />}
        {tab === "meta" && <TabMeta productId={product.id} />}
        {tab === "tree" && product.type === "gateway" && <TabTree productId={product.id} />}
        {tab === "rule" && <TabRule productId={product.id} />}
      </div>
    </main>
  );
}

/* ============================ TAB: 基础信息 ============================ */
function TabInfo({ productId }: { productId: string }) {
  const product = useProduct(productId)!;
  const [tagDraft, setTagDraft] = useState<{ tag: TagModel; index: number } | null>(null);

  const setField = <K extends "name" | "sn" | "type" | "org">(k: K, v: string) => {
    productActions.update(productId, { [k]: v } as Partial<typeof product>);
  };
  const closeTag = (i: number) => {
    productActions.updateMetadata(productId, (m) => ({
      ...m,
      tags: (m.tags ?? []).filter((_, idx) => idx !== i),
    }));
  };
  const saveTag = () => {
    if (!tagDraft || !tagDraft.tag.tagName.trim()) return;
    productActions.updateMetadata(productId, (m) => {
      const tags = [...(m.tags ?? [])];
      if (tagDraft.index < 0) tags.push(tagDraft.tag);
      else tags[tagDraft.index] = tagDraft.tag;
      return { ...m, tags };
    });
    setTagDraft(null);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-2">
      <DescField label="产品名称">
        <input className={vtInputCls} value={product.name} onChange={(e) => setField("name", e.target.value)} />
      </DescField>
      <DescField label="产品类型">
        <span className={`inline-flex items-center rounded px-2 py-1 text-xs ${
          product.type === "gateway"  ? "bg-primary/15 text-primary" :
          product.type === "device"   ? "bg-status-online/15 text-status-online" :
          "bg-status-warning/15 text-status-warning"
        }`}>{PRODUCT_TYPE_LABEL[product.type]}</span>
      </DescField>
      <DescField label="产品型号">
        <input className={vtInputCls} value={product.sn} onChange={(e) => setField("sn", e.target.value)} />
      </DescField>
      <DescField label="创建人">
        <span className="text-text-secondary">{product.creator}</span>
      </DescField>
      <DescField label="所属机构">
        <OrgTreeSelect value={product.org} onChange={(v) => setField("org", v)} />
      </DescField>
      <DescField label="更新时间">
        <span className="font-mono text-xs text-text-secondary">{product.updateTime}</span>
      </DescField>
      <DescField label="标签" full>
        <div className="flex flex-wrap items-center gap-2">
          {(product.metadata.tags ?? []).map((t, i) => (
            <span key={i}
              className="inline-flex items-center gap-1 rounded border border-panel-border bg-panel/40 px-2 py-0.5 text-xs text-text-secondary"
            >
              <button onClick={() => setTagDraft({ tag: { ...t }, index: i })}
                className="hover:text-primary">{t.tagName}</button>
              <button onClick={() => closeTag(i)} className="text-text-muted hover:text-status-critical">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setTagDraft({ tag: { tagKey: "", tagName: "", tagValue: "", optional: false }, index: -1 })}
            className="inline-flex items-center gap-1 rounded border border-dashed border-panel-border px-2 py-0.5 text-xs text-text-muted hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3 w-3" /> 新增标签
          </button>
        </div>
      </DescField>

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
            <VtField label="值">
              <input className={vtInputCls} value={tagDraft.tag.tagValue ?? ""}
                onChange={(e) => setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, tagValue: e.target.value } })} />
            </VtField>
            <VtField label="必填">
              <select className={vtInputCls} value={tagDraft.tag.optional ? "1" : "0"}
                onChange={(e) => setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, optional: e.target.value === "1" } })}>
                <option value="0">否</option>
                <option value="1">是</option>
              </select>
            </VtField>
          </>
        )}
      </VtDrawer>
    </div>
  );
}

function DescField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`grid grid-cols-[88px_1fr] items-center gap-3 border-b border-panel-border/60 py-2 ${full ? "lg:col-span-2" : ""}`}>
      <span className="text-xs text-text-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

/* ============================ TAB: 物模型 ============================ */
function TabMeta({ productId }: { productId: string }) {
  const [sub, setSub] = useState<"prop" | "func">("prop");
  const product = useProduct(productId)!;
  const { confirm, confirmNode } = useConfirm();

  const [propDraft, setPropDraft] = useState<{ data: SimplePropertyMetadata; index: number } | null>(null);
  const [funcDraft, setFuncDraft] = useState<{ data: SimpleFunctionMetadata; index: number } | null>(null);

  const saveProp = () => {
    if (!propDraft || !propDraft.data.name.trim() || !propDraft.data.id.trim()) return;
    productActions.updateMetadata(productId, (m) => {
      const props = [...(m.properties ?? [])];
      if (propDraft.index < 0) props.push(propDraft.data);
      else props[propDraft.index] = propDraft.data;
      return { ...m, properties: props };
    });
    setPropDraft(null);
  };
  const saveFunc = () => {
    if (!funcDraft || !funcDraft.data.name.trim() || !funcDraft.data.id.trim()) return;
    productActions.updateMetadata(productId, (m) => {
      const fns = [...(m.functions ?? [])];
      if (funcDraft.index < 0) fns.push(funcDraft.data);
      else fns[funcDraft.index] = funcDraft.data;
      return { ...m, functions: fns };
    });
    setFuncDraft(null);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex overflow-hidden rounded-md border border-panel-border text-xs">
          <SubTab active={sub === "prop"} onClick={() => setSub("prop")}>属性</SubTab>
          <SubTab active={sub === "func"} onClick={() => setSub("func")}>功能</SubTab>
        </div>
        <button
          onClick={() => sub === "prop"
            ? setPropDraft({ data: { id: "", name: "", valueType: { type: "double" } }, index: -1 })
            : setFuncDraft({ data: { id: "", name: "", async: false }, index: -1 })}
          className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> 新增{sub === "prop" ? "属性" : "功能"}
        </button>
      </div>

      {sub === "prop" ? (
        <MetaTable
          headers={["标识", "名称", "类型", "单位"]}
          rows={(product.metadata.properties ?? []).map((p) => [
            <span className="font-mono text-xs text-text-secondary">{p.id}</span>,
            p.name,
            p.valueType?.type ?? "—",
            p.valueType?.unit ?? "—",
          ])}
          onEdit={(i) => setPropDraft({ data: { ...product.metadata.properties![i] }, index: i })}
          onDelete={(i) => {
            const name = product.metadata.properties![i].name;
            confirm({
              description: <>确定删除属性 <span className="font-semibold text-foreground">「{name}」</span> 吗？</>,
              onConfirm: () => productActions.updateMetadata(productId, (m) => ({
                ...m, properties: (m.properties ?? []).filter((_, idx) => idx !== i),
              })),
            });
          }}
        />
      ) : (
        <MetaTable
          headers={["标识", "名称", "异步"]}
          rows={(product.metadata.functions ?? []).map((f) => [
            <span className="font-mono text-xs text-text-secondary">{f.id}</span>,
            f.name,
            f.async ? "是" : "否",
          ])}
          onEdit={(i) => setFuncDraft({ data: { ...product.metadata.functions![i] }, index: i })}
          onDelete={(i) => {
            const name = product.metadata.functions![i].name;
            confirm({
              description: <>确定删除功能 <span className="font-semibold text-foreground">「{name}」</span> 吗？</>,
              onConfirm: () => productActions.updateMetadata(productId, (m) => ({
                ...m, functions: (m.functions ?? []).filter((_, idx) => idx !== i),
              })),
            });
          }}
        />
      )}

      {/* Property drawer */}
      <VtDrawer
        open={!!propDraft}
        onClose={() => setPropDraft(null)}
        title={propDraft && propDraft.index < 0 ? "新增属性" : "编辑属性"}
        footer={<>
          <VtBtn variant="ghost" onClick={() => setPropDraft(null)}>取消</VtBtn>
          <VtBtn onClick={saveProp}>保存</VtBtn>
        </>}
      >
        {propDraft && (
          <>
            <VtField label="标识" required>
              <input className={vtInputCls} value={propDraft.data.id}
                onChange={(e) => setPropDraft({ ...propDraft, data: { ...propDraft.data, id: e.target.value } })} />
            </VtField>
            <VtField label="名称" required>
              <input className={vtInputCls} value={propDraft.data.name}
                onChange={(e) => setPropDraft({ ...propDraft, data: { ...propDraft.data, name: e.target.value } })} />
            </VtField>
            <VtField label="类型">
              <select className={vtInputCls} value={propDraft.data.valueType?.type ?? "double"}
                onChange={(e) => setPropDraft({ ...propDraft, data: {
                  ...propDraft.data,
                  valueType: { ...(propDraft.data.valueType ?? { type: "" }), type: e.target.value },
                } })}>
                {["int", "long", "double", "float", "string", "boolean", "enum", "date"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </VtField>
            <VtField label="单位">
              <input className={vtInputCls} value={propDraft.data.valueType?.unit ?? ""}
                onChange={(e) => setPropDraft({ ...propDraft, data: {
                  ...propDraft.data,
                  valueType: { ...(propDraft.data.valueType ?? { type: "double" }), unit: e.target.value },
                } })} />
            </VtField>
            <VtField label="读写">
              <select className={vtInputCls} value={propDraft.data.rw ?? "readwrite"}
                onChange={(e) => setPropDraft({ ...propDraft, data: { ...propDraft.data, rw: e.target.value } })}>
                <option value="read">只读</option>
                <option value="write">只写</option>
                <option value="readwrite">读写</option>
              </select>
            </VtField>
          </>
        )}
      </VtDrawer>

      {/* Function drawer */}
      <VtDrawer
        open={!!funcDraft}
        onClose={() => setFuncDraft(null)}
        title={funcDraft && funcDraft.index < 0 ? "新增功能" : "编辑功能"}
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
              <select className={vtInputCls} value={funcDraft.data.async ? "1" : "0"}
                onChange={(e) => setFuncDraft({ ...funcDraft, data: { ...funcDraft.data, async: e.target.value === "1" } })}>
                <option value="0">否</option>
                <option value="1">是</option>
              </select>
            </VtField>
          </>
        )}
      </VtDrawer>

      {confirmNode}
    </div>
  );
}

function SubTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 transition ${
        active ? "bg-primary text-primary-foreground" : "bg-panel text-text-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function MetaTable({
  headers, rows, onEdit, onDelete,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded border border-panel-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-panel/60 text-xs text-text-muted">
            {headers.map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}
            <th className="px-3 py-2 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length + 1} className="px-3 py-10 text-center text-xs text-text-muted">暂无数据</td></tr>
          ) : rows.map((cells, i) => (
            <tr key={i} className="border-t border-panel-border/60 hover:bg-panel/30">
              {cells.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
              <td className="px-3 py-2 text-right">
                <button onClick={() => onEdit(i)}
                  className="mx-0.5 inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary transition hover:border-primary/40 hover:text-primary">
                  <Pencil className="h-3 w-3" /> 编辑
                </button>
                <button onClick={() => onDelete(i)}
                  className="mx-0.5 inline-flex items-center gap-1 rounded border border-status-critical/40 px-2 py-1 text-xs text-status-critical transition hover:bg-status-critical/10">
                  <Trash2 className="h-3 w-3" /> 删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================ TAB: 网关路由 ============================ */
function TabTree({ productId }: { productId: string }) {
  const product = useProduct(productId)!;
  const { confirm, confirmNode } = useConfirm();
  const [renameOf, setRenameOf] = useState<{ id: string; name: string } | null>(null);

  const newId = () => `n${Math.floor(Math.random() * 1e6)}`;

  const append = (parentId: string | null) => {
    productActions.updateMetadata(productId, (m) => {
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
    productActions.updateMetadata(productId, (m) => {
      const filter = (ns: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        ns.filter((n) => n.id !== id).map((n) => ({ ...n, children: n.children ? filter(n.children) : [] }));
      return { ...m, trees: filter(m.trees ?? []) };
    });
  };

  const rename = () => {
    if (!renameOf) return;
    productActions.updateMetadata(productId, (m) => {
      const walk = (ns: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        ns.map((n) => n.id === renameOf.id ? { ...n, name: renameOf.name } : { ...n, children: n.children ? walk(n.children) : [] });
      return { ...m, trees: walk(m.trees ?? []) };
    });
    setRenameOf(null);
  };

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
        open={!!renameOf}
        onClose={() => setRenameOf(null)}
        title="重命名节点"
        width={400}
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

function TreeNode({
  node, onAppend, onRename, onDelete,
}: {
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
            <TreeNode key={c.id} node={c}
              onAppend={onAppend} onRename={onRename} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </li>
  );
}

function IconAction({
  icon: Icon, label, onClick, danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button title={label} onClick={onClick}
      className={`rounded p-1 ${danger ? "text-text-muted hover:bg-status-critical/10 hover:text-status-critical" : "text-text-muted hover:bg-panel hover:text-primary"}`}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/* ============================ TAB: 告警规则 ============================ */
function TabRule({ productId }: { productId: string }) {
  const product = useProduct(productId)!;
  const { confirm, confirmNode } = useConfirm();
  const [draft, setDraft] = useState<{ rule: RuleModel; index: number } | null>(null);

  const propNameMap = useMemo(
    () => Object.fromEntries((product.metadata.properties ?? []).map((p) => [p.id, p.name])),
    [product.metadata.properties],
  );

  const formatCron = (cron?: string) => {
    if (!cron) return "—";
    // Simple display fallback
    return `Cron: ${cron}`;
  };
  const formatSql = (rule: RuleModel) => {
    const sql = rule.ruleMeta?.sql ?? "";
    const params = rule.ruleMeta?.param ?? {};
    let out = sql.replace(/^\s*select\s*\*\s*where\s*/i, "");
    out = out.replace(/\b([a-zA-Z_]\w*)\b(\s*(?:>=|<=|!=|=|>|<)\s*)\?/g, (_m, k, op) => {
      const list = (params[k] as unknown[]) ?? [];
      const v = list[0] ?? "?";
      return `${propNameMap[k] ?? k}${op}${String(v)}`;
    });
    return out || "—";
  };

  const saveRule = () => {
    if (!draft || !draft.rule.name.trim()) return;
    productActions.updateMetadata(productId, (m) => {
      const rules = [...(m.rules ?? [])];
      if (draft.index < 0) rules.push(draft.rule);
      else rules[draft.index] = draft.rule;
      return { ...m, rules };
    });
    setDraft(null);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          onClick={() => setDraft({
            rule: { id: `r${Date.now()}`, name: "", state: 1,
              ruleData: { type: "time", cron: "0 0/5 * * * ?", count: 1 },
              ruleMeta: { sql: "", param: {} } },
            index: -1,
          })}
          className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> 新增规则
        </button>
      </div>

      <div className="overflow-hidden rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium">规则名称</th>
              <th className="px-3 py-2 text-left font-medium">轮询周期</th>
              <th className="px-3 py-2 text-left font-medium">触发阈值</th>
              <th className="px-3 py-2 text-left font-medium">触发条件</th>
              <th className="px-3 py-2 text-left font-medium">状态</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {(product.metadata.rules ?? []).length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-xs text-text-muted">暂无规则</td></tr>
            ) : (product.metadata.rules ?? []).map((r, i) => (
              <tr key={r.id} className="border-t border-panel-border/60 hover:bg-panel/30">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-text-secondary">{formatCron(r.ruleData?.cron)}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">连续 {r.ruleData?.count ?? 1} 次</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{formatSql(r)}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${
                    r.state === 1 ? "bg-status-online/15 text-status-online" : "bg-panel-heavy text-text-muted"
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {r.state === 1 ? "已启用" : "已禁用"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setDraft({ rule: JSON.parse(JSON.stringify(r)), index: i })}
                    className="mx-0.5 inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
                    <Pencil className="h-3 w-3" /> 编辑
                  </button>
                  <button onClick={() => confirm({
                    description: <>确定删除规则 <span className="font-semibold text-foreground">「{r.name}」</span> 吗？</>,
                    onConfirm: () => productActions.updateMetadata(productId, (m) => ({
                      ...m, rules: (m.rules ?? []).filter((_, idx) => idx !== i),
                    })),
                  })}
                    className="mx-0.5 inline-flex items-center gap-1 rounded border border-status-critical/40 px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10">
                    <Trash2 className="h-3 w-3" /> 删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <VtDrawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft && draft.index < 0 ? "新增告警规则" : "编辑告警规则"}
        width={520}
        footer={<>
          <VtBtn variant="ghost" onClick={() => setDraft(null)}>取消</VtBtn>
          <VtBtn onClick={saveRule}>保存</VtBtn>
        </>}
      >
        {draft && (
          <>
            <VtField label="规则名称" required>
              <input className={vtInputCls} value={draft.rule.name}
                onChange={(e) => setDraft({ ...draft, rule: { ...draft.rule, name: e.target.value } })} />
            </VtField>
            <VtField label="Cron">
              <input className={vtInputCls} value={draft.rule.ruleData?.cron ?? ""} placeholder="0 0/5 * * * ?"
                onChange={(e) => setDraft({ ...draft, rule: {
                  ...draft.rule,
                  ruleData: { ...(draft.rule.ruleData ?? { type: "time" }), cron: e.target.value },
                } })} />
            </VtField>
            <VtField label="触发次数">
              <input type="number" min={1} className={vtInputCls} value={draft.rule.ruleData?.count ?? 1}
                onChange={(e) => setDraft({ ...draft, rule: {
                  ...draft.rule,
                  ruleData: { ...(draft.rule.ruleData ?? { type: "time" }), count: Number(e.target.value) },
                } })} />
            </VtField>
            <VtField label="SQL 条件">
              <textarea
                className={`${vtInputCls} h-24 resize-y py-2 font-mono`}
                value={draft.rule.ruleMeta?.sql ?? ""}
                placeholder="select * where temp >= ?"
                onChange={(e) => setDraft({ ...draft, rule: {
                  ...draft.rule,
                  ruleMeta: { ...(draft.rule.ruleMeta ?? {}), sql: e.target.value },
                } })}
              />
            </VtField>
            <VtField label="状态">
              <select className={vtInputCls} value={draft.rule.state ?? 1}
                onChange={(e) => setDraft({ ...draft, rule: { ...draft.rule, state: Number(e.target.value) } })}>
                <option value={1}>已启用</option>
                <option value={0}>已禁用</option>
              </select>
            </VtField>
          </>
        )}
      </VtDrawer>

      {confirmNode}
    </div>
  );
}
