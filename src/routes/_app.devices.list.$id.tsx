import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, RefreshCw, Send, Plus, X, Activity,
  CheckCircle2, AlertTriangle, Save, FileText, Bell,
} from "lucide-react";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useConfirm } from "@/components/confirm-dialog";
import {
  deviceActions, useDevice, mockReadings, mockAlarms, mockEvents,
  type AlarmLog, type EventLog,
} from "@/lib/devices-store";
import { useProduct, PRODUCT_TYPE_LABEL } from "@/lib/products-store";
import type { TagModel, SimpleFunctionMetadata } from "@/types/api/metadata";

export const Route = createFileRoute("/_app/devices/list/$id")({
  component: DeviceDetailPage,
});

type TabKey = "info" | "meta" | "runtime" | "func" | "events" | "rules" | "alarm";

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

  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "基本信息" },
    { key: "meta", label: "模型属性" },
    { key: "runtime", label: "运行状态" },
    { key: "func", label: "设备功能" },
    { key: "events", label: "日志信息" },
    { key: "rules", label: "设备告警" },
    { key: "alarm", label: "告警记录" },
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
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/devices/list" })}
            className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 返回
          </button>
          <h2 className="vt-section-title text-base">{device.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">状态</span>
          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${statusCls}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabel}
          </span>
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
        {tab === "info"    && <TabInfo deviceId={device.id} />}
        {tab === "meta"    && <TabMeta deviceId={device.id} />}
        {tab === "runtime" && <TabRuntime deviceId={device.id} />}
        {tab === "func"    && <TabFunc deviceId={device.id} />}
        {tab === "events"  && <TabEvents deviceId={device.id} />}
        {tab === "rules"   && <TabRules deviceId={device.id} />}
        {tab === "alarm"   && <TabAlarm deviceId={device.id} />}
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
  const [tagDraft, setTagDraft] = useState<{ tag: TagModel; index: number } | null>(null);

  const setField = <K extends keyof typeof device>(k: K, v: (typeof device)[K]) =>
    deviceActions.update(deviceId, { [k]: v } as Partial<typeof device>);

  const removeTag = (i: number) =>
    deviceActions.setTags(deviceId, device.tags.filter((_, idx) => idx !== i));

  const saveTag = () => {
    if (!tagDraft || !tagDraft.tag.tagName.trim()) return;
    const tags = [...device.tags];
    if (tagDraft.index < 0) tags.push(tagDraft.tag);
    else tags[tagDraft.index] = tagDraft.tag;
    deviceActions.setTags(deviceId, tags);
    setTagDraft(null);
  };

  return (
    <div className="space-y-5">
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
          <span className="inline-block rounded bg-panel-heavy px-2 py-0.5 text-xs text-text-secondary">
            {PRODUCT_TYPE_LABEL[device.productType]}
          </span>
        </Row>
        <Row label="所属人">
          <span className="text-text-secondary">{device.creator}</span>
        </Row>
        <Row label="网关设备">
          <span className="text-text-secondary">{device.gatewayName ?? "—"}</span>
        </Row>
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
        <Row label="最近上报">
          <span className="text-text-secondary">{device.statusTime}</span>
        </Row>
      </div>

      <div>
        <div className="mb-2 text-xs text-text-muted">设备标签</div>
        <div className="flex flex-wrap items-center gap-2">
          {device.tags.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded border border-panel-border bg-panel/40 px-2 py-0.5 text-xs text-text-secondary">
              <button onClick={() => setTagDraft({ tag: { ...t }, index: i })} className="hover:text-primary">
                {t.tagName}{t.tagValue ? `: ${t.tagValue}` : ""}
              </button>
              <button onClick={() => removeTag(i)} className="text-text-muted hover:text-status-critical">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setTagDraft({ tag: { tagKey: "", tagName: "", tagValue: "" }, index: -1 })}
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
          <VtBtn onClick={saveTag}><Save className="mr-1 inline h-3 w-3" /> 保存</VtBtn>
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
          </>
        )}
      </VtDrawer>
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
  const props = product?.metadata.properties ?? [];

  if (props.length === 0) {
    return <div className="py-16 text-center text-sm text-text-muted">所属产品未定义物模型属性。</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 text-xs text-text-muted">
        以下属性来自所属产品 <span className="text-text-secondary">{device.productName}</span> 的物模型定义，共 {props.length} 项。
      </div>
      <div className="flex-1 overflow-auto rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium">标识</th>
              <th className="px-3 py-2 text-left font-medium">名称</th>
              <th className="px-3 py-2 text-left font-medium">数据类型</th>
              <th className="px-3 py-2 text-left font-medium">单位</th>
              <th className="px-3 py-2 text-left font-medium">读写</th>
            </tr>
          </thead>
          <tbody>
            {props.map((p) => (
              <tr key={p.id} className="border-t border-panel-border/60">
                <td className="px-3 py-2 text-text-secondary">{p.id}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 text-text-secondary">{p.valueType?.type ?? "—"}</td>
                <td className="px-3 py-2 text-text-secondary">{p.valueType?.unit ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-panel-heavy px-1.5 py-0.5 text-[11px] text-text-secondary">
                    {p.rw ?? "readwrite"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== 运行状态 ========== */
function TabRuntime({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const props = product?.metadata.properties ?? [];

  const [seed, setSeed] = useState(1);
  const [auto, setAuto] = useState(true);
  const readings = useMemo(() => mockReadings(props, seed), [props, seed]);

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
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Activity className="h-3.5 w-3.5 text-status-online" />
          实时上报 · 共 {props.length} 项
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-text-secondary">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)}
              className="h-3 w-3 accent-primary" />
            自动刷新 (3s)
          </label>
          <VtBtn variant="ghost" onClick={() => setSeed((s) => s + 1)}>
            <RefreshCw className="mr-1 inline h-3 w-3" /> 刷新
          </VtBtn>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {readings.map((r) => (
          <div key={r.id} className="rounded-lg border border-panel-border bg-panel/40 p-4">
            <div className="text-xs text-text-muted">{r.name}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-foreground">{r.value}</span>
              {r.unit && <span className="text-xs text-text-secondary">{r.unit}</span>}
            </div>
            <div className="mt-2 text-[10px] text-text-muted">{r.updateTime}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== 设备功能 ========== */
function TabFunc({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const fns = product?.metadata.functions ?? [];
  const [active, setActive] = useState<SimpleFunctionMetadata | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [log, setLog] = useState<{ id: string; fn: string; time: string; result: string }[]>([]);

  const openFn = (fn: SimpleFunctionMetadata) => {
    setActive(fn);
    setInputs(Object.fromEntries((fn.inputs ?? []).map((p) => [p.id, ""])));
  };

  const invoke = () => {
    if (!active) return;
    const id = String(Date.now());
    const payload = (active.inputs ?? []).map((p) => `${p.name}=${inputs[p.id] || "-"}`).join(", ");
    setLog((l) => [
      { id, fn: active.name, time: new Date().toLocaleString(),
        result: `调用 ${active.name}(${payload}) → 成功${active.async ? " (异步)" : ""}` },
      ...l,
    ]);
    setActive(null);
  };

  if (fns.length === 0) {
    return <div className="py-16 text-center text-sm text-text-muted">所属产品未定义功能。</div>;
  }

  return (
    <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-2 overflow-auto">
        {fns.map((f) => (
          <button key={f.id} onClick={() => openFn(f)}
            className="rounded border border-panel-border bg-panel/40 px-3 py-2.5 text-left transition hover:border-primary/40">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{f.name}</span>
              {f.async && <span className="rounded bg-status-warning/15 px-1.5 py-0.5 text-[10px] text-status-warning">异步</span>}
            </div>
            <div className="mt-0.5 text-[11px] text-text-muted">
              {f.id} · 入 {f.inputs?.length ?? 0} / 出 {f.outputs?.length ?? 0}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col overflow-hidden rounded border border-panel-border bg-panel/20">
        <div className="border-b border-panel-border px-4 py-2 text-xs font-semibold text-text-secondary">调用日志</div>
        <div className="flex-1 overflow-auto">
          {log.length === 0 ? (
            <div className="py-16 text-center text-xs text-text-muted">尚无调用记录</div>
          ) : (
            <ul className="divide-y divide-panel-border/60">
              {log.map((l) => (
                <li key={l.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{l.fn}</span>
                    <span className="text-[10px] text-text-muted">{l.time}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-text-secondary">{l.result}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <VtDrawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `调用 · ${active.name}` : ""}
        width={460}
        footer={<>
          <VtBtn variant="ghost" onClick={() => setActive(null)}>取消</VtBtn>
          <VtBtn onClick={invoke}><Send className="mr-1 inline h-3 w-3" /> 下发</VtBtn>
        </>}
      >
        {active && (
          (active.inputs ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-text-muted">该功能无输入参数，点击下发即可执行。</div>
          ) : (active.inputs ?? []).map((p) => (
            <VtField key={p.id} label={p.name}>
              <input className={vtInputCls} value={inputs[p.id] ?? ""}
                placeholder={`${p.valueType?.type ?? "string"}${p.valueType?.unit ? ` (${p.valueType.unit})` : ""}`}
                onChange={(e) => setInputs({ ...inputs, [p.id]: e.target.value })} />
            </VtField>
          ))
        )}
      </VtDrawer>
    </div>
  );
}

/* ========== 日志信息 ========== */
function TabEvents({ deviceId }: { deviceId: string }) {
  const [list, setList] = useState<EventLog[]>(() => mockEvents(deviceId));
  const [filter, setFilter] = useState<"all" | EventLog["type"]>("all");

  const filtered = filter === "all" ? list : list.filter((e) => e.type === filter);
  const typeMap: Record<EventLog["type"], { label: string; cls: string }> = {
    property: { label: "属性",   cls: "bg-status-info/15 text-status-info" },
    function: { label: "功能",   cls: "bg-primary/15 text-primary" },
    online:   { label: "上线",   cls: "bg-status-online/15 text-status-online" },
    offline:  { label: "下线",   cls: "bg-panel-heavy text-text-muted" },
    error:    { label: "错误",   cls: "bg-status-critical/15 text-status-critical" },
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <FileText className="h-3.5 w-3.5" /> 共 {filtered.length} 条记录
        </div>
        <div className="flex items-center gap-1">
          {(["all", "property", "function", "online", "offline", "error"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded border px-2 py-0.5 text-xs transition ${
                filter === k
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-panel-border text-text-secondary hover:border-primary/40"
              }`}>
              {k === "all" ? "全部" : typeMap[k].label}
            </button>
          ))}
          <VtBtn variant="ghost" onClick={() => setList(mockEvents(deviceId))}>
            <RefreshCw className="mr-1 inline h-3 w-3" /> 刷新
          </VtBtn>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium w-20">类型</th>
              <th className="px-3 py-2 text-left font-medium">来源</th>
              <th className="px-3 py-2 text-left font-medium">内容</th>
              <th className="px-3 py-2 text-left font-medium w-44">时间</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-10 text-center text-xs text-text-muted">暂无日志</td></tr>
            ) : filtered.map((e) => (
              <tr key={e.id} className="border-t border-panel-border/60">
                <td className="px-3 py-2">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${typeMap[e.type].cls}`}>
                    {typeMap[e.type].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-secondary">{e.source}</td>
                <td className="px-3 py-2 text-text-secondary text-xs">{e.payload}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{e.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== 设备告警 (产品级规则在该设备下的启停) ========== */
function TabRules({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const rules = product?.metadata.rules ?? [];
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(rules.map((r) => [r.id, (r.state ?? 1) === 1])),
  );

  if (rules.length === 0) {
    return <div className="py-16 text-center text-sm text-text-muted">所属产品未定义告警规则。</div>;
  }

  const toggle = (id: string) => setEnabledMap((m) => ({ ...m, [id]: !m[id] }));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2 text-xs text-text-secondary">
        <Bell className="h-3.5 w-3.5" />
        以下告警规则继承自产品 <span className="text-foreground">{device.productName}</span>，可在本设备下启停。
      </div>
      <div className="flex-1 overflow-auto rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium">规则名称</th>
              <th className="px-3 py-2 text-left font-medium">触发方式</th>
              <th className="px-3 py-2 text-left font-medium">规则 SQL</th>
              <th className="px-3 py-2 text-left font-medium">状态</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const on = enabledMap[r.id] ?? true;
              return (
                <tr key={r.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-text-secondary text-xs">
                    {r.ruleData?.type === "cron" ? `cron · ${r.ruleData.cron ?? "-"}` : `time · ${r.ruleData?.cron ?? "-"}`}
                  </td>
                  <td className="px-3 py-2 text-text-secondary text-xs">{r.ruleMeta?.sql ?? "—"}</td>
                  <td className="px-3 py-2">
                    {on ? (
                      <span className="inline-flex items-center gap-1 rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> 启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-panel-heavy px-1.5 py-0.5 text-[11px] text-text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> 禁用
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => toggle(r.id)}
                      className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
                      {on ? "禁用" : "启用"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== 告警记录 ========== */
function TabAlarm({ deviceId }: { deviceId: string }) {
  const { confirm, confirmNode } = useConfirm();
  const [list, setList] = useState<AlarmLog[]>(() => mockAlarms(deviceId));

  const ack = (id: string) =>
    setList((l) => l.map((a) => a.id === id ? { ...a, acked: true } : a));
  const del = (a: AlarmLog) =>
    confirm({
      description: <>确定删除告警记录 <span className="font-semibold text-foreground">「{a.ruleName}」</span> 吗？</>,
      onConfirm: () => setList((l) => l.filter((x) => x.id !== a.id)),
    });

  return (
    <div className="flex h-full flex-col">
      <div className="overflow-hidden rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium">告警规则</th>
              <th className="px-3 py-2 text-left font-medium">级别</th>
              <th className="px-3 py-2 text-left font-medium">描述</th>
              <th className="px-3 py-2 text-left font-medium">时间</th>
              <th className="px-3 py-2 text-left font-medium">状态</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-xs text-text-muted">暂无告警</td></tr>
            ) : list.map((a) => (
              <tr key={a.id} className="border-t border-panel-border/60">
                <td className="px-3 py-2">{a.ruleName}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                    a.level === "critical" ? "bg-status-critical/15 text-status-critical" : "bg-status-warning/15 text-status-warning"
                  }`}>
                    <AlertTriangle className="h-3 w-3" />
                    {a.level === "critical" ? "严重" : "警告"}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-secondary">{a.message}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{a.time}</td>
                <td className="px-3 py-2">
                  {a.acked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-status-online">
                      <CheckCircle2 className="h-3 w-3" /> 已确认
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">未确认</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {!a.acked && (
                    <button onClick={() => ack(a.id)}
                      className="mx-0.5 inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
                      确认
                    </button>
                  )}
                  <button onClick={() => del(a)}
                    className="mx-0.5 inline-flex items-center gap-1 rounded border border-status-critical/40 px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10">
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirmNode}
    </div>
  );
}
