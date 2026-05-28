import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, RefreshCw, Send, Plus, BarChart3, Trash2, Pencil,
  AlertTriangle, Save, FileText, Bell, RotateCw, Inbox, Eye,
  ChevronRight, ChevronDown,
} from "lucide-react";
import { VtBtn, VtDrawer, VtField, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useConfirm } from "@/components/confirm-dialog";
import {
  deviceActions, useDevice, useDevices, mockReadings, mockAlarms, mockEvents,
  type AlarmLog, type EventLog,
} from "@/lib/devices-store";
import { useProduct, productActions, PRODUCT_TYPE_LABEL } from "@/lib/products-store";
import type {
  PropertyTagMetadata, SimplePropertyMetadata, SimpleFunctionMetadata,
  SimpleTreeMetadata, RuleModel,
} from "@/types/api/metadata";
import { DATA_TYPES, DATA_UNITS } from "@/lib/data-types";

export const Route = createFileRoute("/_app/devices/list/$id")({
  component: DeviceDetailPage,
});

type TabKey = "info" | "meta" | "runtime" | "func" | "events" | "rules" | "alarm" | "children";

/* 默认的设备标签字段集（对照原项目截图） */
const DEFAULT_TAG_FIELDS = [
  "Installatonate", "Location", "Next Maintenance",
  "Assigned Technician", "System Capacity", "Warranty Status",
  "Longitude", "Latitude", "State",
];

function DeviceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const device = useDevice(id);
  const product = useProduct(device?.productId);
  const [tab, setTab] = useState<TabKey>("info");

  if (!device) {
    return (
      <main className="vt-page-content">
        <div className="vt-glass flex flex-1 items-center justify-center text-sm text-text-muted">
          设备不存在或已被删除。
          <Link to="/devices/list" className="ml-2 text-primary hover:underline">返回列表</Link>
        </div>
      </main>
    );
  }

  const isGateway = device.productType === "gateway";
  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "基本信息" },
    { key: "meta", label: "模型属性" },
    { key: "runtime", label: "运行状态" },
    { key: "func", label: "设备功能" },
    { key: "events", label: "日志信息" },
    { key: "rules", label: "告警规则" },
    { key: "alarm", label: "告警记录" },
    ...(isGateway ? [{ key: "children" as TabKey, label: "子设备" }] : []),
  ];

  const statusCls =
    device.status === "online" ? "bg-status-online/15 text-status-online" :
    device.status === "disabled" ? "bg-panel-heavy text-text-muted" :
    "bg-status-critical/15 text-status-critical";
  const statusLabel =
    device.status === "online" ? "在线" :
    device.status === "disabled" ? "禁用" : "离线";

  return (
    <main className="vt-page-content">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/devices/list" })}
            className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 返回
          </button>
          <h2 className="vt-section-title text-base">{device.name}</h2>
          <span className="text-[11px] text-text-muted">ID</span>
          <span className="text-xs text-text-secondary">{device.id}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">状态</span>
          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${statusCls}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabel}
          </span>
          <button className="inline-flex items-center gap-1 rounded border border-panel-border px-2.5 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
            <RotateCw className="h-3.5 w-3.5" /> 模型同步
          </button>
          <button className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90">
            <Save className="h-3.5 w-3.5" /> 保存
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-panel-border">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`relative px-4 py-2 text-xs transition ${
                active ? "text-primary" : "text-text-secondary hover:text-foreground"
              }`}>
              {t.label}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />}
            </button>
          );
        })}
      </div>

      <div className="vt-glass mt-3 flex-1 overflow-hidden p-5">
        {tab === "info"     && <TabInfo deviceId={device.id} />}
        {tab === "meta"     && <TabMeta deviceId={device.id} />}
        {tab === "runtime"  && <TabRuntime deviceId={device.id} />}
        {tab === "func"     && <TabFunc deviceId={device.id} />}
        {tab === "events"   && <TabEvents deviceId={device.id} />}
        {tab === "rules"    && <TabRules deviceId={device.id} />}
        {tab === "alarm"    && <TabAlarm deviceId={device.id} />}
        {tab === "children" && <TabChildren deviceId={device.id} />}
      </div>

      {!product && tab !== "info" && (
        <div className="mt-2 rounded border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
          关联产品不存在，部分功能不可用。
        </div>
      )}
    </main>
  );
}

/* ========== 基本信息 ========== */
function TabInfo({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const isGateway = device.productType === "gateway";

  const setField = <K extends keyof typeof device>(k: K, v: (typeof device)[K]) =>
    deviceActions.update(deviceId, { [k]: v } as Partial<typeof device>);

  /* 把 tags 转成 name->value 字典做表单 */
  const tagMap = useMemo(() => {
    const m: Record<string, string> = {};
    device.tags.forEach((t) => { m[t.tagName] = t.tagValue ?? ""; });
    return m;
  }, [device.tags]);

  const setTag = (name: string, value: string) => {
    const others = device.tags.filter((t) => t.tagName !== name);
    deviceActions.setTags(deviceId, [...others, { tagKey: name, tagName: name, tagValue: value }]);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto">
      <div className="text-sm font-semibold text-foreground">{device.name}</div>

      {/* 基本字段区 */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
        <Row label="设备名称">
          <input className={vtInputCls} value={device.name} onChange={(e) => setField("name", e.target.value)} />
        </Row>
        <Row label="设备SN">
          <input className={vtInputCls} value={device.sn} onChange={(e) => setField("sn", e.target.value)} />
        </Row>
        <Row label="所属机构">
          <OrgTreeSelect value={device.org} onChange={(v) => setField("org", v)} />
        </Row>

        <Row label="产品名称">
          <Link to="/devices/products/$id" params={{ id: device.productId }} className="text-primary hover:underline">
            {device.productName}
          </Link>
        </Row>
        <Row label="产品类型">
          <span className="inline-block rounded bg-status-info/15 px-2 py-0.5 text-xs text-status-info">
            {PRODUCT_TYPE_LABEL[device.productType]}
          </span>
        </Row>
        <Row label="所属人">
          <span className="text-text-secondary">{device.creator}</span>
        </Row>

        {/* 网关字段：子设备显示「网关设备」 */}
        {!isGateway && (
          <Row label="网关设备">
            <span className="text-text-secondary">{device.gatewayName ?? "—"}</span>
          </Row>
        )}
        <Row label="采集网关">
          <span className="text-text-secondary">{device.collectGateway ?? "—"}</span>
        </Row>
        <Row label="采集方式">
          {device.collectMode ? (
            <span className="inline-block rounded bg-status-info/15 px-2 py-0.5 text-xs text-status-info">
              {device.collectMode}
            </span>
          ) : <span className="text-text-muted">—</span>}
        </Row>

        <Row label="创建时间">
          <span className="text-text-secondary">{device.createTime}</span>
        </Row>
        <Row label="更新时间">
          <span className="text-text-secondary">{device.updateTime}</span>
        </Row>
      </div>

      {/* 设备标签（网关 / 子设备 都展示） */}
      <div>
        <div className="mb-2 text-sm text-foreground">设备标签</div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
          {DEFAULT_TAG_FIELDS.map((name) => (
            <div key={name} className="grid grid-cols-[140px_1fr] items-center gap-3">
              <span className="text-xs font-medium text-foreground">{name}</span>
              <input
                className={vtInputCls}
                value={tagMap[name] ?? ""}
                onChange={(e) => setTag(name, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-3 border-b border-panel-border/40 py-2">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ========== 模型属性 ========== */
function TabMeta({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const { confirm, confirmNode } = useConfirm();
  const props = product?.metadata.properties ?? [];
  const fns   = product?.metadata.functions ?? [];
  const propertyTags: PropertyTagMetadata[] = product?.metadata.propertyTags ?? [
    { id: "properties", name: "Properties" },
    { id: "measurement", name: "Measurement" },
    { id: "action", name: "Action" },
  ];

  const [sub, setSub] = useState<"prop" | "fn">("prop");
  const [filterTag, setFilterTag] = useState<string>("all");

  const [editingProp, setEditingProp] = useState<SimplePropertyMetadata | null>(null);
  const [editingFn, setEditingFn] = useState<SimpleFunctionMetadata | null>(null);

  const filteredProps = useMemo(
    () => props.filter((p) => filterTag === "all" || !p.tagId || p.tagId === filterTag),
    [props, filterTag],
  );

  const saveProp = (p: SimplePropertyMetadata) => {
    if (!product) return;
    productActions.updateMetadata(product.id, (m) => {
      const list = m.properties ?? [];
      const exists = list.some((x) => x.id === p.id);
      return {
        ...m,
        properties: exists ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p],
      };
    });
    setEditingProp(null);
  };
  const delProp = (p: SimplePropertyMetadata) => {
    if (!product) return;
    confirm({
      description: <>确定删除属性 <span className="font-semibold text-foreground">「{p.name}」</span> 吗？</>,
      onConfirm: () => productActions.updateMetadata(product.id, (m) => ({
        ...m, properties: (m.properties ?? []).filter((x) => x.id !== p.id),
      })),
    });
  };

  const saveFn = (f: SimpleFunctionMetadata) => {
    if (!product) return;
    productActions.updateMetadata(product.id, (m) => {
      const list = m.functions ?? [];
      const exists = list.some((x) => x.id === f.id);
      return {
        ...m,
        functions: exists ? list.map((x) => (x.id === f.id ? f : x)) : [...list, f],
      };
    });
    setEditingFn(null);
  };
  const delFn = (f: SimpleFunctionMetadata) => {
    if (!product) return;
    confirm({
      description: <>确定删除功能 <span className="font-semibold text-foreground">「{f.name}」</span> 吗？</>,
      onConfirm: () => productActions.updateMetadata(product.id, (m) => ({
        ...m, functions: (m.functions ?? []).filter((x) => x.id !== f.id),
      })),
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center justify-between border-b border-panel-border/60">
        <div className="flex gap-1">
          {([["prop", "属性"], ["fn", "功能"]] as const).map(([k, l]) => {
            const a = sub === k;
            return (
              <button key={k} onClick={() => setSub(k)}
                className={`relative px-4 py-1.5 text-xs ${a ? "text-primary" : "text-text-secondary"}`}>
                {l}
                {a && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => sub === "prop"
            ? setEditingProp({ id: "", name: "", valueType: { type: "double", unit: "" } })
            : setEditingFn({ id: "", name: "", async: false, inputs: [], outputs: [] })}
          className="mb-1 inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:opacity-90">
          <Plus className="h-3 w-3" /> 添加{sub === "prop" ? "属性" : "功能"}
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded border border-panel-border">
        {sub === "prop" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel/60 text-xs text-text-muted">
                <th className="px-3 py-2 text-left font-medium">名称</th>
                <th className="px-3 py-2 text-left font-medium w-40">标识</th>
                <th className="px-3 py-2 text-left font-medium w-32">类型</th>
                <th className="px-3 py-2 text-left font-medium w-24">单位</th>
                <th className="px-3 py-2 text-left font-medium w-32">标签</th>
                <th className="px-3 py-2 text-right font-medium w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProps.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-12 text-center text-xs text-text-muted">暂无数据</td></tr>
              ) : filteredProps.map((p) => (
                <tr key={p.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.id}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.valueType?.type ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.valueType?.unit || "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {propertyTags.find((t) => t.id === p.tagId)?.name ?? "Properties"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditingProp(p)}
                      className="mr-1 rounded p-1 text-text-muted hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => delProp(p)}
                      className="rounded p-1 text-text-muted hover:text-status-critical"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel/60 text-xs text-text-muted">
                <th className="px-3 py-2 text-left font-medium">名称</th>
                <th className="px-3 py-2 text-left font-medium w-40">标识</th>
                <th className="px-3 py-2 text-left font-medium w-24">异步</th>
                <th className="px-3 py-2 text-left font-medium w-32">入/出参</th>
                <th className="px-3 py-2 text-right font-medium w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {fns.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-12 text-center text-xs text-text-muted">暂无数据</td></tr>
              ) : fns.map((f) => (
                <tr key={f.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{f.name}</td>
                  <td className="px-3 py-2 text-text-secondary">{f.id}</td>
                  <td className="px-3 py-2 text-text-secondary">{f.async ? "是" : "否"}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {(f.inputs?.length ?? 0)} / {(f.outputs?.length ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditingFn(f)}
                      className="mr-1 rounded p-1 text-text-muted hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => delFn(f)}
                      className="rounded p-1 text-text-muted hover:text-status-critical"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sub === "prop" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-panel-border/60 pt-3">
          {[{ id: "all", name: "全部" }, ...propertyTags].map((t) => {
            const a = filterTag === t.id;
            return (
              <button key={t.id} onClick={() => setFilterTag(t.id)}
                className={`rounded border px-2 py-0.5 text-xs ${
                  a ? "border-primary/60 bg-primary/15 text-primary" : "border-panel-border text-text-secondary hover:border-primary/40"
                }`}>
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      <PropertyDrawer
        open={!!editingProp}
        value={editingProp}
        onClose={() => setEditingProp(null)}
        onSave={saveProp}
        tags={propertyTags}
      />
      <FunctionDrawer
        open={!!editingFn}
        value={editingFn}
        onClose={() => setEditingFn(null)}
        onSave={saveFn}
      />
      {confirmNode}
    </div>
  );
}

function PropertyDrawer({ open, value, onClose, onSave, tags }: {
  open: boolean; value: SimplePropertyMetadata | null; onClose: () => void;
  onSave: (p: SimplePropertyMetadata) => void; tags: PropertyTagMetadata[];
}) {
  const [draft, setDraft] = useState<SimplePropertyMetadata>({ id: "", name: "" });
  useEffect(() => { if (value) setDraft({ ...value, valueType: value.valueType ?? { type: "double" } }); }, [value]);
  return (
    <VtDrawer open={open} onClose={onClose} title={value?.id ? "编辑属性" : "新增属性"}
      footer={<><VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
        <VtBtn onClick={() => draft.name && draft.id && onSave(draft)}>保存</VtBtn></>}>
      <VtField label="标识" required>
        <input className={vtInputCls} value={draft.id} disabled={!!value?.id}
          onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
      </VtField>
      <VtField label="名称" required>
        <input className={vtInputCls} value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </VtField>
      <VtField label="类型">
        <select className={vtInputCls} value={draft.valueType?.type ?? "double"}
          onChange={(e) => setDraft({ ...draft, valueType: { ...draft.valueType, type: e.target.value } })}>
          {DATA_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </VtField>
      <VtField label="单位">
        <select className={vtInputCls} value={draft.valueType?.unit ?? ""}
          onChange={(e) => setDraft({ ...draft, valueType: { ...draft.valueType!, unit: e.target.value } })}>
          <option value="">无</option>
          {DATA_UNITS.map((u) => <option key={u.unit} value={u.unit}>{u.unit} — {u.en}</option>)}
        </select>
      </VtField>
      <VtField label="标签">
        <select className={vtInputCls} value={draft.tagId ?? ""}
          onChange={(e) => setDraft({ ...draft, tagId: e.target.value || undefined })}>
          <option value="">未分组</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </VtField>
    </VtDrawer>
  );
}

function FunctionDrawer({ open, value, onClose, onSave }: {
  open: boolean; value: SimpleFunctionMetadata | null; onClose: () => void;
  onSave: (f: SimpleFunctionMetadata) => void;
}) {
  const [draft, setDraft] = useState<SimpleFunctionMetadata>({ id: "", name: "" });
  useEffect(() => { if (value) setDraft({ ...value, inputs: value.inputs ?? [], outputs: value.outputs ?? [] }); }, [value]);
  return (
    <VtDrawer open={open} onClose={onClose} title={value?.id ? "编辑功能" : "新增功能"}
      footer={<><VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
        <VtBtn onClick={() => draft.name && draft.id && onSave(draft)}>保存</VtBtn></>}>
      <VtField label="标识" required>
        <input className={vtInputCls} value={draft.id} disabled={!!value?.id}
          onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
      </VtField>
      <VtField label="名称" required>
        <input className={vtInputCls} value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </VtField>
      <VtField label="异步">
        <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" checked={!!draft.async} className="h-3.5 w-3.5 accent-primary"
            onChange={(e) => setDraft({ ...draft, async: e.target.checked })} />
          异步执行
        </label>
      </VtField>
    </VtDrawer>
  );
}


/* ========== 运行状态 ========== */
function TabRuntime({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const props = product?.metadata.properties ?? [];
  const propertyTags: PropertyTagMetadata[] = product?.metadata.propertyTags ?? [
    { id: "properties", name: "Properties" },
    { id: "measurement", name: "Measurement" },
    { id: "action", name: "Action" },
  ];

  const [seed, setSeed] = useState(1);
  const [auto, setAuto] = useState(true);
  const [filterTag, setFilterTag] = useState<string>("all");

  const filteredProps = useMemo(
    () => props.filter((p) => filterTag === "all" || !p.tagId || p.tagId === filterTag),
    [props, filterTag],
  );
  const readings = useMemo(() => mockReadings(filteredProps, seed), [filteredProps, seed]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setSeed((s) => s + 1), 3000);
    return () => clearInterval(t);
  }, [auto]);

  if (props.length === 0) {
    return <div className="py-16 text-center text-sm text-text-muted">所属产品未定义物模型属性。</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-end gap-3">
        <label className="flex items-center gap-1 text-xs text-text-secondary">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)}
            className="h-3 w-3 accent-primary" />
          自动刷新 (3s)
        </label>
        <VtBtn variant="ghost" onClick={() => setSeed((s) => s + 1)}>
          <RefreshCw className="mr-1 inline h-3 w-3" /> 刷新
        </VtBtn>
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-1 gap-3 overflow-auto md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {readings.map((r) => (
          <div key={r.id} className="flex h-[132px] flex-col justify-between rounded-lg border border-panel-border bg-panel/40 p-4">
            <div className="flex items-start justify-between">
              <span className="text-xs text-text-muted">{r.name}</span>
              <div className="flex gap-1 text-text-muted">
                <button title="刷新" className="rounded p-0.5 hover:text-primary"
                  onClick={() => setSeed((s) => s + 1)}>
                  <RefreshCw className="h-3 w-3" />
                </button>
                <button title="历史曲线" className="rounded p-0.5 hover:text-primary">
                  <BarChart3 className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-foreground">{r.value}</span>
              {r.unit && <span className="text-xs text-text-secondary">{r.unit}</span>}
            </div>
            <div className="mt-2 text-right text-[10px] text-text-muted">{r.updateTime}</div>
          </div>
        ))}
      </div>

      {/* 底部标签过滤 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-panel-border/60 pt-3">
        {[{ id: "all", name: "全部" }, ...propertyTags].map((t) => {
          const a = filterTag === t.id;
          return (
            <button key={t.id} onClick={() => setFilterTag(t.id)}
              className={`rounded border px-2 py-0.5 text-xs ${
                a ? "border-primary/60 bg-primary/15 text-primary" : "border-panel-border text-text-secondary hover:border-primary/40"
              }`}>
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ========== 设备功能 ========== */
function TabFunc({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const fns = product?.metadata.functions ?? [];
  const [activeId, setActiveId] = useState<string>("");
  const active = fns.find((f) => f.id === activeId);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [raw, setRaw] = useState("");
  const [formatted, setFormatted] = useState("");
  const [from, setFrom] = useState("2026-05-22");
  const [to, setTo] = useState("2026-05-29");
  const [log, setLog] = useState<
    { id: string; fn: string; time: string; status: "成功" | "失败"; sendData: string; resultFile: string }[]
  >([]);

  const onPickFn = (id: string) => {
    setActiveId(id);
    const f = fns.find((x) => x.id === id);
    setInputs(Object.fromEntries((f?.inputs ?? []).map((p) => [p.id, ""])));
    setRaw("");
    setFormatted("");
  };

  const invoke = () => {
    if (!active) return;
    const payload = JSON.stringify(inputs);
    const id = String(Date.now());
    setRaw(payload);
    setFormatted(JSON.stringify({ result: "ok", code: 0 }, null, 2));
    setLog((l) => [
      { id, fn: active.name, time: new Date().toISOString().slice(0, 19).replace("T", " "),
        status: "成功", sendData: payload, resultFile: `result-${id}.json` },
      ...l,
    ]);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[420px_1fr]">
      {/* 左侧表单 */}
      <div className="flex flex-col gap-3 overflow-auto pr-2">
        <FRow label="设备功能">
          <select className={vtInputCls} value={activeId} onChange={(e) => onPickFn(e.target.value)}>
            <option value="">Select</option>
            {fns.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </FRow>

        <FRow label="参数名称" alignTop>
          {!active || (active.inputs ?? []).length === 0 ? (
            <span className="text-xs text-text-muted">—</span>
          ) : (
            <div className="flex flex-col gap-2">
              {(active.inputs ?? []).map((p) => (
                <div key={p.id} className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <span className="text-xs text-text-secondary">{p.name}</span>
                  <input className={vtInputCls} value={inputs[p.id] ?? ""}
                    placeholder={p.valueType?.type ?? "string"}
                    onChange={(e) => setInputs({ ...inputs, [p.id]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
        </FRow>

        <FRow label="操作">
          <button onClick={invoke} disabled={!active}
            className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-40">
            <Send className="h-3 w-3" /> 发送
          </button>
        </FRow>

        <FRow label="格式化结果" alignTop>
          <pre className="min-h-[80px] w-full rounded border border-panel-border bg-panel/40 p-2 text-xs text-text-secondary">{formatted || ""}</pre>
        </FRow>

        <FRow label="原始数据" alignTop>
          <textarea readOnly value={raw} className={`${vtInputCls} min-h-[80px]`} />
        </FRow>
      </div>

      {/* 右侧调用记录 */}
      <div className="flex flex-col overflow-hidden rounded border border-panel-border">
        <div className="flex items-center gap-2 border-b border-panel-border bg-panel/40 px-3 py-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-panel-border bg-transparent px-2 py-0.5 text-xs" />
          <span className="text-xs text-text-muted">至</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded border border-panel-border bg-transparent px-2 py-0.5 text-xs" />
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel/60 text-xs text-text-muted">
                <th className="px-3 py-2 text-left font-medium">功能</th>
                <th className="px-3 py-2 text-left font-medium w-24">请求状态</th>
                <th className="px-3 py-2 text-left font-medium">发送数据</th>
                <th className="px-3 py-2 text-left font-medium w-44">请求结果源文件</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-12 text-center text-xs text-text-muted">
                  <Inbox className="mx-auto mb-1 h-6 w-6 opacity-50" /> 暂无数据
                </td></tr>
              ) : log.map((l) => (
                <tr key={l.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{l.fn}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">{l.status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{l.sendData}</td>
                  <td className="px-3 py-2 text-xs text-primary hover:underline cursor-pointer">{l.resultFile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager total={log.length} />
      </div>
    </div>
  );
}

function FRow({ label, children, alignTop }: { label: string; children: React.ReactNode; alignTop?: boolean }) {
  return (
    <div className={`grid grid-cols-[80px_1fr] gap-3 ${alignTop ? "items-start" : "items-center"}`}>
      <span className="pt-1 text-xs text-text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ========== 日志信息 ========== */
function TabEvents({ deviceId }: { deviceId: string }) {
  const [list, setList] = useState<EventLog[]>(() => mockEvents(deviceId));
  const [from, setFrom] = useState("2026-05-22");
  const [to, setTo] = useState("2026-05-29");

  const typeMap: Record<EventLog["type"], string> = {
    property: "属性", function: "功能", online: "上线", offline: "下线", error: "错误",
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium w-64">
                <div className="flex items-center gap-2">
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                    className="rounded border border-panel-border bg-transparent px-2 py-0.5 text-xs" />
                  <span>至</span>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                    className="rounded border border-panel-border bg-transparent px-2 py-0.5 text-xs" />
                </div>
              </th>
              <th className="px-3 py-2 text-left font-medium w-24">类型</th>
              <th className="px-3 py-2 text-left font-medium w-40">消息ID</th>
              <th className="px-3 py-2 text-left font-medium">日志</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-12 text-center text-xs text-text-muted">
                <FileText className="mx-auto mb-1 h-6 w-6 opacity-50" /> 暂无数据
              </td></tr>
            ) : list.map((e) => (
              <tr key={e.id} className="border-t border-panel-border/60">
                <td className="px-3 py-2 text-xs text-text-secondary">{e.time}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{typeMap[e.type]}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{e.id}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{e.payload}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex justify-end">
        <button onClick={() => setList(mockEvents(deviceId))}
          className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
          <RefreshCw className="h-3 w-3" /> 刷新
        </button>
      </div>
      <Pager total={list.length} />
    </div>
  );
}

/* ========== 告警规则 ========== */
function TabRules({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const { confirm, confirmNode } = useConfirm();
  const rules = product?.metadata.rules ?? [];
  const [editing, setEditing] = useState<RuleModel | null>(null);

  const save = (r: RuleModel) => {
    if (!product) return;
    productActions.updateMetadata(product.id, (m) => {
      const list = m.rules ?? [];
      const exists = list.some((x) => x.id === r.id);
      return { ...m, rules: exists ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r] };
    });
    setEditing(null);
  };
  const del = (r: RuleModel) => {
    if (!product) return;
    confirm({
      description: <>确定删除规则 <span className="font-semibold text-foreground">「{r.name}」</span> 吗？</>,
      onConfirm: () => productActions.updateMetadata(product.id, (m) => ({
        ...m, rules: (m.rules ?? []).filter((x) => x.id !== r.id),
      })),
    });
  };
  const toggle = (r: RuleModel) => save({ ...r, state: (r.state ?? 1) === 1 ? 0 : 1 });

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-end">
        <button
          onClick={() => setEditing({
            id: `r${Date.now()}`, name: "", state: 1,
            ruleData: { type: "time", cron: "0 0/5 * * * ?", count: 1 },
          })}
          className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:opacity-90">
          <Plus className="h-3 w-3" /> 添加规则
        </button>
      </div>
      <div className="flex-1 overflow-auto rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium">规则名称</th>
              <th className="px-3 py-2 text-left font-medium w-32">触发方式</th>
              <th className="px-3 py-2 text-left font-medium w-40">轮询周期</th>
              <th className="px-3 py-2 text-left font-medium w-28">阈值次数</th>
              <th className="px-3 py-2 text-left font-medium w-24">状态</th>
              <th className="px-3 py-2 text-right font-medium w-44">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-24 text-center text-xs text-text-muted">
                <Bell className="mx-auto mb-1 h-6 w-6 opacity-50" /> 暂无数据
              </td></tr>
            ) : rules.map((r) => {
              const on = (r.state ?? 1) === 1;
              return (
                <tr key={r.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{r.ruleData?.type ?? "time"}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{r.ruleData?.cron ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{r.ruleData?.count ?? 1}</td>
                  <td className="px-3 py-2">
                    {on
                      ? <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">启用</span>
                      : <span className="rounded bg-panel-heavy px-1.5 py-0.5 text-[11px] text-text-muted">禁用</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => toggle(r)}
                      className="mr-1 rounded border border-panel-border px-2 py-0.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
                      {on ? "禁用" : "启用"}
                    </button>
                    <button onClick={() => setEditing(r)}
                      className="mr-1 rounded p-1 text-text-muted hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => del(r)}
                      className="rounded p-1 text-text-muted hover:text-status-critical"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <RuleDrawer open={!!editing} value={editing} onClose={() => setEditing(null)} onSave={save} />
      {confirmNode}
    </div>
  );
}

function RuleDrawer({ open, value, onClose, onSave }: {
  open: boolean; value: RuleModel | null; onClose: () => void; onSave: (r: RuleModel) => void;
}) {
  const [draft, setDraft] = useState<RuleModel>({ id: "", name: "" });
  useEffect(() => { if (value) setDraft({ ...value, ruleData: value.ruleData ?? { type: "time" } }); }, [value]);
  const setRD = (patch: Partial<NonNullable<RuleModel["ruleData"]>>) =>
    setDraft({ ...draft, ruleData: { ...(draft.ruleData ?? { type: "time" }), ...patch } });
  return (
    <VtDrawer open={open} onClose={onClose} title={value && value.name ? "编辑告警规则" : "新增告警规则"}
      footer={<><VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
        <VtBtn onClick={() => draft.name && onSave(draft)}>保存</VtBtn></>}>
      <VtField label="规则名称" required>
        <input className={vtInputCls} value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </VtField>
      <VtField label="触发方式">
        <select className={vtInputCls} value={draft.ruleData?.type ?? "time"}
          onChange={(e) => setRD({ type: e.target.value })}>
          <option value="time">轮询 (time)</option>
          <option value="cron">cron</option>
        </select>
      </VtField>
      <VtField label="轮询周期">
        <input className={vtInputCls} value={draft.ruleData?.cron ?? ""}
          onChange={(e) => setRD({ cron: e.target.value })} placeholder="0 0/5 * * * ?" />
      </VtField>
      <VtField label="阈值次数">
        <input className={vtInputCls} type="number" min={1} value={draft.ruleData?.count ?? 1}
          onChange={(e) => setRD({ count: Number(e.target.value) || 1 })} />
      </VtField>
    </VtDrawer>
  );
}

/* ========== 告警记录 ========== */
function TabAlarm({ deviceId }: { deviceId: string }) {
  const [list] = useState<AlarmLog[]>(() => mockAlarms(deviceId));
  const [from, setFrom] = useState("2026-05-22");
  const [to, setTo] = useState("2026-05-29");
  const [detail, setDetail] = useState<AlarmLog | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="overflow-hidden rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium w-64">
                <div className="flex items-center gap-2">
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                    className="rounded border border-panel-border bg-transparent px-2 py-0.5 text-xs" />
                  <span>至</span>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                    className="rounded border border-panel-border bg-transparent px-2 py-0.5 text-xs" />
                </div>
              </th>
              <th className="px-3 py-2 text-left font-medium">告警名称</th>
              <th className="px-3 py-2 text-left font-medium w-28">触发次数</th>
              <th className="px-3 py-2 text-left font-medium">数据</th>
              <th className="px-3 py-2 text-left font-medium w-32">通知</th>
              <th className="px-3 py-2 text-right font-medium w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-16 text-center text-xs text-text-muted">
                <Inbox className="mx-auto mb-1 h-6 w-6 opacity-50" /> 暂无数据
              </td></tr>
            ) : list.map((a) => (
              <tr key={a.id} className="border-t border-panel-border/60">
                <td className="px-3 py-2 text-xs text-text-secondary">{a.time}</td>
                <td className="px-3 py-2">{a.ruleName}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">1</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{a.message}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                    a.level === "critical" ? "bg-status-critical/15 text-status-critical" : "bg-status-warning/15 text-status-warning"
                  }`}>
                    <AlertTriangle className="h-3 w-3" />
                    {a.level === "critical" ? "严重" : "警告"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setDetail(a)}
                    className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-0.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
                    <Eye className="h-3 w-3" /> 详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager total={list.length} />

      <VtDrawer open={!!detail} onClose={() => setDetail(null)} title="告警详情">
        {detail && (
          <div className="space-y-3 text-sm">
            <VtField label="规则名称"><span className="text-text-secondary">{detail.ruleName}</span></VtField>
            <VtField label="级别"><span className="text-text-secondary">{detail.level === "critical" ? "严重" : "警告"}</span></VtField>
            <VtField label="时间"><span className="text-text-secondary">{detail.time}</span></VtField>
            <VtField label="状态"><span className="text-text-secondary">{detail.acked ? "已确认" : "未确认"}</span></VtField>
            <VtField label="数据" full>
              <pre className="rounded border border-panel-border bg-panel/40 p-3 text-xs text-text-secondary">{detail.message}</pre>
            </VtField>
          </div>
        )}
      </VtDrawer>
    </div>
  );
}

/* ========== 子设备（网关） ========== */
function TabChildren({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const allDevices = useDevices();
  const { confirm, confirmNode } = useConfirm();
  const trees = product?.metadata.trees ?? [];
  const children = allDevices.filter((d) => d.gatewayId === device.id);

  const updateTrees = (next: SimpleTreeMetadata[]) => {
    if (!product) return;
    productActions.updateMetadata(product.id, (m) => ({ ...m, trees: next }));
  };

  const addChildNode = (parentId: string | null) => {
    const name = window.prompt("节点名称")?.trim();
    if (!name) return;
    const newNode: SimpleTreeMetadata = { id: `n${Date.now()}`, name, children: [] };
    if (parentId === null) { updateTrees([...trees, newNode]); return; }
    const walk = (list: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
      list.map((n) => n.id === parentId
        ? { ...n, children: [...(n.children ?? []), newNode] }
        : { ...n, children: walk(n.children ?? []) });
    updateTrees(walk(trees));
  };
  const renameNode = (id: string) => {
    const name = window.prompt("新名称")?.trim();
    if (!name) return;
    const walk = (list: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
      list.map((n) => n.id === id
        ? { ...n, name }
        : { ...n, children: walk(n.children ?? []) });
    updateTrees(walk(trees));
  };
  const deleteNode = (id: string) => {
    const walk = (list: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
      list.filter((n) => n.id !== id).map((n) => ({ ...n, children: walk(n.children ?? []) }));
    updateTrees(walk(trees));
  };

  return (
    <div className="grid h-full grid-cols-[300px_1fr] gap-4 overflow-hidden">
      {/* 左侧结构分路 */}
      <div className="flex flex-col overflow-hidden rounded border border-panel-border">
        <div className="flex items-center justify-between border-b border-panel-border bg-panel/40 px-3 py-2">
          <span className="text-xs font-medium text-foreground">结构分路</span>
          <div className="flex gap-1">
            <button onClick={() => addChildNode(null)}
              className="rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20">新增</button>
            <button className="rounded border border-panel-border px-2 py-0.5 text-[11px] text-text-secondary hover:border-primary/40">保存</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {trees.length === 0
            ? <div className="py-8 text-center text-xs text-text-muted">暂无节点</div>
            : trees.map((n) => (
                <TreeNode key={n.id} node={n} depth={0}
                  onAdd={addChildNode} onRename={renameNode} onDelete={deleteNode} />
              ))}
        </div>
      </div>

      {/* 右侧子设备列表 */}
      <div className="flex flex-col overflow-hidden rounded border border-panel-border">
        <div className="flex items-center justify-between border-b border-panel-border bg-panel/40 px-3 py-2">
          <span className="text-xs font-medium text-foreground">子设备列表</span>
          <button className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground hover:opacity-90">
            <Plus className="h-3 w-3" /> 添加
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel/60 text-xs text-text-muted">
                <th className="px-3 py-2 text-left font-medium">设备名称</th>
                <th className="px-3 py-2 text-left font-medium">产品名称</th>
                <th className="px-3 py-2 text-left font-medium w-40">关联网关</th>
                <th className="px-3 py-2 text-left font-medium w-32">所属机构</th>
                <th className="px-3 py-2 text-left font-medium w-24">创建人</th>
                <th className="px-3 py-2 text-left font-medium w-44">创建时间</th>
                <th className="px-3 py-2 text-left font-medium w-20">状态</th>
                <th className="px-3 py-2 text-right font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {children.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-16 text-center text-xs text-text-muted">
                  <Inbox className="mx-auto mb-1 h-6 w-6 opacity-50" /> 暂无数据
                </td></tr>
              ) : children.map((c) => (
                <tr key={c.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.productName}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.collectGateway ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.org}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.creator}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.createTime}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] ${
                      c.status === "online" ? "bg-status-online/15 text-status-online" :
                      c.status === "disabled" ? "bg-panel-heavy text-text-muted" :
                      "bg-status-critical/15 text-status-critical"
                    }`}>
                      {c.status === "online" ? "在线" : c.status === "disabled" ? "禁用" : "离线"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => confirm({
                      description: <>确定移除子设备 <span className="font-semibold text-foreground">「{c.name}」</span> 吗？</>,
                      onConfirm: () => deviceActions.update(c.id, { gatewayId: undefined, gatewayName: undefined }),
                    })}
                      className="rounded p-1 text-text-muted hover:text-status-critical">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager total={children.length} />
      </div>
      {confirmNode}
    </div>
  );
}

function TreeNode({ node, depth, onAdd, onRename, onDelete }: {
  node: SimpleTreeMetadata; depth: number;
  onAdd: (id: string) => void; onRename: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasKids = (node.children?.length ?? 0) > 0;
  return (
    <div>
      <div className="group flex items-center gap-1 rounded px-1 py-1 text-xs hover:bg-panel/60"
        style={{ paddingLeft: depth * 14 + 4 }}>
        <button onClick={() => setOpen((o) => !o)} className="text-text-muted">
          {hasKids ? (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="inline-block h-3 w-3" />}
        </button>
        <span className="flex-1 truncate text-foreground">{node.name}</span>
        <div className="hidden gap-1 group-hover:flex">
          <button onClick={() => onRename(node.id)}
            className="rounded bg-panel px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-primary">重命名</button>
          <button onClick={() => onAdd(node.id)}
            className="rounded bg-panel px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-primary">新增</button>
          <button onClick={() => onDelete(node.id)}
            className="rounded bg-panel px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-status-critical">删除</button>
        </div>
      </div>
      {open && hasKids && (
        <div>
          {node.children!.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1}
              onAdd={onAdd} onRename={onRename} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}


/* ========== 通用分页栏 ========== */
function Pager({ total }: { total: number }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-3 text-xs text-text-muted">
      <span>总共：{total} 条</span>
      <select className="rounded border border-panel-border bg-transparent px-1.5 py-0.5">
        <option>10条/页</option><option>20条/页</option><option>50条/页</option>
      </select>
      <div className="flex items-center gap-1">
        <button className="rounded border border-panel-border px-2 py-0.5 hover:border-primary/40">‹</button>
        <button className="rounded border border-primary/60 bg-primary/15 px-2 py-0.5 text-primary">1</button>
        <button className="rounded border border-panel-border px-2 py-0.5 hover:border-primary/40">›</button>
      </div>
    </div>
  );
}
