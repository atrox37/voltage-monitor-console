import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Radio, X, CalendarDays } from "lucide-react";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, vtInputCls, VtBtn } from "@/components/vt-drawer";

export const Route = createFileRoute("/_app/ingest/gateways")({
  component: GatewaysPage,
});

type Gateway = {
  id: string;
  name: string;
  networkComponent: string;       // e.g. "mqtt-client"
  networkComponentType: string;   // e.g. "MQTT_CLIENT"
  protocol: string;               // e.g. "voltage-v1"
  org: string;
  enabled: boolean;
  updateTime: string;
};

const NETWORK_OPTIONS = [
  { name: "mqtt-client", type: "MQTT_CLIENT" },
  { name: "mqtt-aws",    type: "MQTT_CLIENT" },
];
const PROTOCOL_OPTIONS = ["mqtt-client", "voltage-v1", "kafka-v1"];

const seed: Gateway[] = [
  { id: "1", name: "mqtt-client网关",      networkComponent: "mqtt-client", networkComponentType: "MQTT_CLIENT", protocol: "mqtt-client", org: "Group Root", enabled: false, updateTime: "2025-01-16 06:38:05" },
  { id: "2", name: "mqtt-client-aws网关",  networkComponent: "mqtt-aws",    networkComponentType: "MQTT_CLIENT", protocol: "voltage-v1",  org: "Group Root", enabled: false, updateTime: "2025-01-16 06:38:05" },
];

function GatewaysPage() {
  const [rows, setRows] = useState<Gateway[]>(seed);
  const [editing, setEditing] = useState<Gateway | null>(null);
  const [adding, setAdding] = useState(false);
  const [zhaoTarget, setZhaoTarget] = useState<Gateway | null>(null);

  const handleSave = (g: Gateway) => {
    setRows((rs) => {
      const exists = rs.some((r) => r.id === g.id);
      return exists ? rs.map((r) => (r.id === g.id ? g : r)) : [...rs, g];
    });
    setEditing(null);
    setAdding(false);
  };

  return (
    <>
      <ListPageTemplate<Gateway>
        title="网关列表"
        filters={[
          { type: "text", key: "name", label: "名称" },
          { type: "select", key: "org", label: "机构", options: [
            { label: "Group Root", value: "Group Root" },
          ] },
          { type: "select", key: "networkComponentType", label: "网络组件类型", options: [
            { label: "MQTT CLIENT", value: "MQTT_CLIENT" },
          ] },
        ]}
        columns={[
          { key: "name", title: "名称" },
          { key: "networkComponent", title: "网络组件（类型）", render: (r) => (
            <span className="inline-flex items-center gap-2">
              <span className="text-foreground">{r.networkComponent}</span>
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">{r.networkComponentType}</span>
            </span>
          ) },
          { key: "protocol", title: "协议库" },
          { key: "org", title: "机构" },
          { key: "enabled", title: "状态", render: (r) => (
            <button
              onClick={() => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, enabled: !x.enabled } : x))}
              className={`rounded px-2 py-0.5 text-[11px] ${
                r.enabled
                  ? "bg-status-online/15 text-status-online"
                  : "bg-status-warning/15 text-status-warning"
              }`}
            >
              {r.enabled ? "是" : "否"}
            </button>
          ) },
          { key: "updateTime", title: "更新日期", render: (r) => <span className="text-text-secondary">{r.updateTime}</span> },
        ]}
        rows={rows}
        onAdd={() => setAdding(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing(r)}>编辑</RowBtn>
            <RowBtn icon={Radio} onClick={() => setZhaoTarget(r)}>总招</RowBtn>
            <RowBtn danger onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>删除</RowBtn>
          </>
        )}
      />

      {(editing || adding) && (
        <GatewayDrawer
          mode={adding ? "add" : "edit"}
          value={editing ?? {
            id: String(Date.now()),
            name: "", networkComponent: "", networkComponentType: "",
            protocol: "", org: "Group Root", enabled: false,
            updateTime: new Date().toISOString().slice(0, 19).replace("T", " "),
          }}
          onClose={() => { setEditing(null); setAdding(false); }}
          onSave={handleSave}
        />
      )}

      {zhaoTarget && (
        <ZhaoDialog gateway={zhaoTarget} onClose={() => setZhaoTarget(null)} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
function GatewayDrawer({
  mode, value, onClose, onSave,
}: {
  mode: "add" | "edit";
  value: Gateway;
  onClose: () => void;
  onSave: (g: Gateway) => void;
}) {
  const [d, setD] = useState<Gateway>(value);
  const set = <K extends keyof Gateway>(k: K, v: Gateway[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  return (
    <VtDrawer
      open
      onClose={onClose}
      title={mode === "add" ? "添加" : "编辑"}
      width={520}
      footer={
        <>
          <VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
          <VtBtn onClick={() => onSave({
            ...d,
            updateTime: new Date().toISOString().slice(0, 19).replace("T", " "),
          })}>保存</VtBtn>
        </>
      }
    >
      <VtField label="名称" required>
        <input className={vtInputCls} placeholder="请输入名称"
          value={d.name} onChange={(e) => set("name", e.target.value)} />
      </VtField>

      <VtField label="网络组件" required>
        <select
          className={vtInputCls}
          value={d.networkComponent}
          onChange={(e) => {
            const opt = NETWORK_OPTIONS.find((o) => o.name === e.target.value);
            set("networkComponent", e.target.value);
            if (opt) set("networkComponentType", opt.type);
          }}
        >
          <option value="">请选择</option>
          {NETWORK_OPTIONS.map((o) => (
            <option key={o.name} value={o.name}>{o.name} ({o.type})</option>
          ))}
        </select>
      </VtField>

      <VtField label="协议库" required>
        <select
          className={vtInputCls}
          value={d.protocol}
          onChange={(e) => set("protocol", e.target.value)}
        >
          <option value="">请选择</option>
          {PROTOCOL_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </VtField>

      <VtField label="状态">
        <button
          type="button"
          onClick={() => set("enabled", !d.enabled)}
          className={`inline-flex h-6 w-12 items-center rounded-full px-0.5 transition ${
            d.enabled ? "bg-primary justify-end" : "bg-panel-heavy justify-start"
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-white shadow" />
        </button>
        <span className="ml-2 text-xs text-text-secondary">{d.enabled ? "开启" : "关闭"}</span>
      </VtField>
    </VtDrawer>
  );
}

/* ------------------------------------------------------------------ */
type ZhaoRecord = {
  time: string;
  name: string;
  device: string;
  sn: string;
  status: "成功" | "超时";
};

function generateRecords(): ZhaoRecord[] {
  const names = ["告警数据总招", "设备数据总招"];
  const out: ZhaoRecord[] = [];
  const baseTimes = [
    "2026-05-28 01:03:34", "2026-05-28 01:03:15",
    "2026-05-27 23:42:34", "2026-05-27 23:42:15",
    "2026-05-27 23:32:36", "2026-05-27 23:22:11",
    "2026-05-26 18:11:02", "2026-05-25 09:30:44",
  ];
  baseTimes.forEach((t, i) => {
    names.forEach((n, j) => {
      const hasDevice = (i + j) % 2 === 1;
      out.push({
        time: t,
        name: n,
        device: hasDevice ? "18b204606258a197_Station" : "",
        sn: hasDevice ? "18b204606258a197" : "",
        status: hasDevice ? "成功" : "超时",
      });
    });
  });
  return out;
}

function ZhaoDialog({ gateway, onClose }: { gateway: Gateway; onClose: () => void }) {
  const [deviceData, setDeviceData] = useState(false);
  const [alarmData, setAlarmData] = useState(false);
  const [from, setFrom] = useState("2026-05-22");
  const [to, setTo] = useState("2026-05-29");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const allRecords = useMemo(() => generateRecords(), []);
  const totalPages = Math.max(1, Math.ceil(allRecords.length / pageSize));
  const pageRows = allRecords.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-[760px] max-h-[85vh] flex-col overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">总招 · {gateway.name}</h3>
          <button onClick={onClose} className="rounded p-1 text-text-muted hover:bg-panel hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDeviceData((v) => !v)}
              className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs ${
                deviceData ? "border-primary/60 bg-primary/10 text-primary" : "border-panel-border text-text-secondary"
              }`}
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                deviceData ? "border-primary bg-primary text-primary-foreground" : "border-panel-border"
              }`}>{deviceData ? "✓" : ""}</span>
              设备数据总招
            </button>
            <button
              type="button"
              onClick={() => setAlarmData((v) => !v)}
              className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs ${
                alarmData ? "border-primary/60 bg-primary/10 text-primary" : "border-panel-border text-text-secondary"
              }`}
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                alarmData ? "border-primary bg-primary text-primary-foreground" : "border-panel-border"
              }`}>{alarmData ? "✓" : ""}</span>
              告警数据总招
            </button>
          </div>

          <div className="mb-2 text-xs font-semibold text-foreground">记录</div>

          <div className="mb-3 flex items-center gap-2 rounded-md border border-panel-border bg-background/40 px-2 py-1.5 text-xs text-text-secondary w-fit">
            <CalendarDays className="h-3.5 w-3.5 text-text-muted" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent text-foreground outline-none"
            />
            <span>至</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent text-foreground outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-md border border-panel-border">
            <table className="w-full text-xs">
              <thead className="bg-panel/40 text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">时间</th>
                  <th className="px-3 py-2 text-left font-medium">总招名称</th>
                  <th className="px-3 py-2 text-left font-medium">设备名称</th>
                  <th className="px-3 py-2 text-left font-medium">设备Sn</th>
                  <th className="px-3 py-2 text-left font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={i} className="border-t border-panel-border/60">
                    <td className="px-3 py-2 text-text-secondary">{r.time}</td>
                    <td className="px-3 py-2 text-foreground">{r.name}</td>
                    <td className="px-3 py-2 text-text-secondary">{r.device}</td>
                    <td className="px-3 py-2 text-text-secondary">{r.sn}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 ${
                        r.status === "成功"
                          ? "bg-status-online/15 text-status-online"
                          : "bg-status-warning/15 text-status-warning"
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-7 w-7 items-center justify-center rounded border border-panel-border bg-panel text-text-secondary disabled:opacity-40"
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-7 min-w-[28px] rounded px-2 text-xs ${
                  page === p
                    ? "bg-primary text-primary-foreground"
                    : "border border-panel-border bg-panel text-text-secondary"
                }`}
              >{p}</button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-7 w-7 items-center justify-center rounded border border-panel-border bg-panel text-text-secondary disabled:opacity-40"
            >›</button>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn
            onClick={() => {
              const picks = [deviceData && "设备数据总招", alarmData && "告警数据总招"].filter(Boolean);
              alert(picks.length ? `已发送：${picks.join("、")}` : "请先选择需要发送的总招类型");
            }}
          >
            发送
          </VtBtn>
        </footer>
      </div>
    </div>
  );
}
