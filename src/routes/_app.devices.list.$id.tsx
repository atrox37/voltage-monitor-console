import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, RefreshCw, Send, Plus, X, BarChart3,
  CheckCircle2, AlertTriangle, Save, FileText, Bell, RotateCw, Inbox,
} from "lucide-react";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useConfirm } from "@/components/confirm-dialog";
import {
  deviceActions, useDevice, mockReadings, mockAlarms, mockEvents,
  type AlarmLog, type EventLog,
} from "@/lib/devices-store";
import { useProduct, PRODUCT_TYPE_LABEL } from "@/lib/products-store";
import type { SimpleFunctionMetadata, PropertyTagMetadata } from "@/types/api/metadata";

export const Route = createFileRoute("/_app/devices/list/$id")({
  component: DeviceDetailPage,
});

type TabKey = "info" | "meta" | "runtime" | "func" | "events" | "rules" | "alarm";

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
  const props = product?.metadata.properties ?? [];
  const fns   = product?.metadata.functions ?? [];
  const propertyTags: PropertyTagMetadata[] = product?.metadata.propertyTags ?? [
    { id: "properties", name: "Properties" },
    { id: "measurement", name: "Measurement" },
    { id: "action", name: "Action" },
  ];

  const [sub, setSub] = useState<"prop" | "fn">("prop");
  const [filterTag, setFilterTag] = useState<string>("properties");

  const filteredProps = useMemo(
    () => props.filter((p) => !p.tagId || p.tagId === filterTag || filterTag === "all"),
    [props, filterTag],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 二级 tab */}
      <div className="mb-2 flex gap-1 border-b border-panel-border/60">
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

      <div className="flex-1 overflow-auto rounded border border-panel-border">
        {sub === "prop" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel/60 text-xs text-text-muted">
                <th className="px-3 py-2 text-left font-medium">名称</th>
                <th className="px-3 py-2 text-left font-medium w-32">类型</th>
                <th className="px-3 py-2 text-left font-medium w-40">单位</th>
                <th className="px-3 py-2 text-left font-medium w-40">标签</th>
                <th className="px-3 py-2 text-right font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProps.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-12 text-center text-xs text-text-muted">暂无数据</td></tr>
              ) : filteredProps.map((p) => (
                <tr key={p.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.valueType?.type ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.valueType?.unit ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {propertyTags.find((t) => t.id === p.tagId)?.name ?? "Properties"}
                  </td>
                  <td className="px-3 py-2 text-right text-text-muted">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel/60 text-xs text-text-muted">
                <th className="px-3 py-2 text-left font-medium">名称</th>
                <th className="px-3 py-2 text-left font-medium w-24">标识</th>
                <th className="px-3 py-2 text-left font-medium w-24">异步</th>
                <th className="px-3 py-2 text-left font-medium w-32">入/出参</th>
              </tr>
            </thead>
            <tbody>
              {fns.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-12 text-center text-xs text-text-muted">暂无数据</td></tr>
              ) : fns.map((f) => (
                <tr key={f.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{f.name}</td>
                  <td className="px-3 py-2 text-text-secondary">{f.id}</td>
                  <td className="px-3 py-2 text-text-secondary">{f.async ? "是" : "否"}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {(f.inputs?.length ?? 0)} / {(f.outputs?.length ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 属性分组芯片 */}
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
          <button className="inline-flex items-center gap-1 rounded border border-dashed border-panel-border px-2 py-0.5 text-xs text-text-muted hover:border-primary/40 hover:text-primary">
            <Plus className="h-3 w-3" /> New Tag
          </button>
        </div>
      )}
    </div>
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

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {readings.map((r) => (
          <div key={r.id} className="rounded-lg border border-panel-border bg-panel/40 p-4">
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

/* ========== 设备告警 ========== */
function TabRules({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId)!;
  const product = useProduct(device.productId);
  const rules = product?.metadata.rules ?? [];
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(rules.map((r) => [r.id, (r.state ?? 1) === 1])),
  );
  const toggle = (id: string) => setEnabledMap((m) => ({ ...m, [id]: !m[id] }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto rounded border border-panel-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel/60 text-xs text-text-muted">
              <th className="px-3 py-2 text-left font-medium">规则名称</th>
              <th className="px-3 py-2 text-left font-medium w-32">触发方式</th>
              <th className="px-3 py-2 text-left font-medium w-40">轮询周期</th>
              <th className="px-3 py-2 text-left font-medium w-28">阈值次数</th>
              <th className="px-3 py-2 text-left font-medium w-24">状态</th>
              <th className="px-3 py-2 text-right font-medium w-28">
                <button className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:opacity-90">
                  <Plus className="h-3 w-3" /> 添加
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-24 text-center text-xs text-text-muted">
                <Bell className="mx-auto mb-1 h-6 w-6 opacity-50" /> 暂无数据
              </td></tr>
            ) : rules.map((r) => {
              const on = enabledMap[r.id] ?? true;
              return (
                <tr key={r.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{r.ruleData?.type ?? "time"}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{r.ruleData?.cron ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{r.ruleData?.count ?? 1}</td>
                  <td className="px-3 py-2">
                    {on ? (
                      <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">启用</span>
                    ) : (
                      <span className="rounded bg-panel-heavy px-1.5 py-0.5 text-[11px] text-text-muted">禁用</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => toggle(r.id)}
                      className="rounded border border-panel-border px-2 py-0.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
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
  const [from, setFrom] = useState("2026-05-22");
  const [to, setTo] = useState("2026-05-29");

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
              <th className="px-3 py-2 text-right font-medium w-40">详情</th>
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
                  {a.acked ? (
                    <span className="mr-1 inline-flex items-center gap-1 text-xs text-status-online">
                      <CheckCircle2 className="h-3 w-3" /> 已确认
                    </span>
                  ) : (
                    <button onClick={() => ack(a.id)}
                      className="mr-1 rounded border border-panel-border px-2 py-0.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">
                      确认
                    </button>
                  )}
                  <button onClick={() => del(a)}
                    className="rounded border border-status-critical/40 px-2 py-0.5 text-xs text-status-critical hover:bg-status-critical/10">
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager total={list.length} />
      {confirmNode}
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
