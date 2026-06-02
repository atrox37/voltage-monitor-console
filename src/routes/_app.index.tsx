import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sun, Battery, Fuel, AlertTriangle, TrendingUp,
} from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import { VtDataTable } from "@/components/vt-table";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  type AlarmRow = { key: number; lvl: number; site: string; dev: string; msg: string; t: string };
  const alarmRows: AlarmRow[] = [
    { key: 0, lvl: 1, site: "杭州·余杭", dev: "GW-INV-08", msg: "通信中断超过 5 分钟", t: "02:14:08" },
    { key: 1, lvl: 2, site: "深圳·南山 B2", dev: "ESS-Rack-02", msg: "电压偏低 / 380→352 V", t: "01:52:31" },
    { key: 2, lvl: 3, site: "上海·浦东 R1", dev: "PV-String-12", msg: "组件温度偏高", t: "01:30:11" },
    { key: 3, lvl: 2, site: "成都·天府", dev: "DG-03", msg: "启动延迟", t: "00:48:02" },
  ];
  const alarmColumns: ColumnsType<AlarmRow> = [
    {
      key: "lvl",
      title: "级别",
      width: 88,
      render: (_, a) => (
        <span className={`inline-flex items-center gap-1 alarm-level--${a.lvl}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {a.lvl === 1 ? "严重" : a.lvl === 2 ? "警告" : "提示"}
        </span>
      ),
    },
    { key: "site", title: "站点", dataIndex: "site" },
    { key: "dev", title: "设备", dataIndex: "dev", render: (v) => <span className="text-text-secondary">{v}</span> },
    { key: "msg", title: "描述", dataIndex: "msg", render: (v) => <span className="text-text-secondary">{v}</span> },
    {
      key: "t",
      title: "时间",
      dataIndex: "t",
      width: 96,
      render: (v) => <span className="font-mono text-xs text-text-muted">{v}</span>,
    },
  ];

  return (
    <main className="vt-page-content">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Sun}           label="光伏产能" value="18.42" unit="MWh" trend="+6.2%" color="text-energy-pv" />
        <KpiCard icon={Battery}       label="储能容量" value="74.8"  unit="%"   trend="充电中" color="text-energy-ess" />
        <KpiCard icon={Fuel}          label="柴发待机" value="04"    unit="台"  trend="可用"   color="text-energy-dg" />
        <KpiCard icon={AlertTriangle} label="活跃告警" value="07"    unit="条"  trend="↑ 2"   color="text-status-warning" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="vt-glass lg:col-span-2 p-4">
          <div className="flex items-center justify-between">
            <h3 className="vt-section-title text-sm">实时功率曲线</h3>
            <div className="flex gap-1 text-xs">
              {["1H","6H","24H","7D"].map((t,i)=>(
                <button key={t} className={`rounded px-2 py-1 ${i===2?"bg-primary/20 text-primary":"text-text-secondary hover:text-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <SparklineChart />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-secondary">
            <Legend color="bg-energy-pv"  label="光伏 PV" />
            <Legend color="bg-energy-ess" label="储能 ESS" />
            <Legend color="bg-energy-dg"  label="柴发 DG" />
          </div>
        </div>

        <div className="vt-glass p-4">
          <h3 className="vt-section-title text-sm">站点状态</h3>
          <ul className="mt-4 space-y-3">
            {[
              { name: "上海·浦东 R1", status: "online",   detail: "PV · 312 kW" },
              { name: "苏州·工业园",   status: "online",   detail: "ESS · 76%" },
              { name: "深圳·南山 B2",   status: "warning",  detail: "电压偏低" },
              { name: "成都·天府新区", status: "online",   detail: "PV · 198 kW" },
              { name: "杭州·余杭",     status: "critical", detail: "通信中断" },
            ].map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm text-foreground">{s.name}</div>
                  <div className="text-[11px] text-text-muted">{s.detail}</div>
                </div>
                <StatusPill status={s.status as Status} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="vt-glass p-0">
        <div className="vt-toolbar border-b border-panel-border">
          <h3 className="vt-section-title text-sm">最新告警</h3>
          <div className="flex gap-2">
            <button className="rounded border border-panel-border bg-panel px-3 py-1 text-xs text-text-secondary hover:text-foreground">导出</button>
            <Link to="/notif/configs" className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">查看全部</Link>
          </div>
        </div>
        <VtDataTable<AlarmRow>
          rowKey="key"
          size="small"
          pagination={false}
          columns={alarmColumns}
          dataSource={alarmRows}
        />
      </section>
    </main>
  );
}

function KpiCard({
  icon: Icon, label, value, unit, trend, color,
}: { icon: any; label: string; value: string; unit: string; trend: string; color: string }) {
  return (
    <div className="vt-glass p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-text-secondary">{label}</div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-3 flex items-baseline">
        <span className={`vt-kpi-value text-3xl ${color}`}>{value}</span>
        <span className="vt-kpi-unit">{unit}</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-text-muted">
        <TrendingUp className="h-3 w-3" /> {trend}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

type Status = "online" | "warning" | "critical";
function StatusPill({ status }: { status: Status }) {
  const map = {
    online:   { cls: "text-status-online bg-status-online/15",     label: "正常" },
    warning:  { cls: "text-status-warning bg-status-warning/15",   label: "告警" },
    critical: { cls: "text-status-critical bg-status-critical/15", label: "故障" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

function SparklineChart() {
  const w = 600, h = 160, pad = 10;
  const gen = (seed: number, base: number, amp: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const x = pad + (i / 24) * (w - pad * 2);
      const noise = Math.sin(i * 0.7 + seed) * amp + Math.cos(i * 0.3 + seed) * (amp * 0.5);
      const y = h - pad - (base + noise);
      pts.push([x, Math.max(pad, Math.min(h - pad, y))]);
    }
    return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  };
  return (
    <div className="mt-4 w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={i} x1={pad} x2={w - pad}
            y1={pad + ((h - pad * 2) / 3) * i} y2={pad + ((h - pad * 2) / 3) * i}
            stroke="currentColor" className="text-panel-border" strokeDasharray="3 4" strokeWidth="0.5" />
        ))}
        <polyline fill="none" stroke="var(--energy-pv)"  strokeWidth="1.8" points={gen(1, 80, 25)} />
        <polyline fill="none" stroke="var(--energy-ess)" strokeWidth="1.8" points={gen(3, 55, 18)} />
        <polyline fill="none" stroke="var(--energy-dg)"  strokeWidth="1.8" points={gen(5, 30, 12)} />
      </svg>
    </div>
  );
}
