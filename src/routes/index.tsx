import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Zap, LayoutDashboard, Settings, Bell, Server, Network,
  ChevronDown, Search, LogOut, Activity, Sun, Battery, Fuel,
  AlertTriangle, TrendingUp, Globe,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const nav = [
  { label: "总览", icon: LayoutDashboard, key: "overview", active: true },
  { label: "设备管理", icon: Server, key: "devices" },
  { label: "设备接入", icon: Network, key: "ingest" },
  { label: "通知管理", icon: Bell, key: "notif" },
  { label: "系统管理", icon: Settings, key: "system" },
];

function Dashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("overview");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-panel-border bg-background/60 backdrop-blur-md md:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/15 text-primary ring-1 ring-primary/40">
            <Zap className="h-4 w-4" />
          </div>
          <div className="font-heading text-sm font-bold tracking-wider text-foreground">
            VOLTAGE <span className="text-primary">EMS</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`group relative mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-primary/15 text-foreground"
                    : "text-text-secondary hover:bg-panel hover:text-foreground"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary" />
                )}
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-panel-border px-3 py-3 text-[11px] text-text-muted">
          <div className="flex items-center justify-between">
            <span>v2.6.0</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-online" />
              在线
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="vt-page-shell flex-1 min-w-0">
        {/* Topbar */}
        <header className="vt-page-header border-b border-panel-border bg-background/40 backdrop-blur-md">
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-text-secondary hover:text-foreground">总览</Link>
            <span className="text-text-muted">/</span>
            <span className="text-foreground">实时监控</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                placeholder="搜索设备 / 站点"
                className="h-8 w-56 rounded-md border border-panel-border bg-background/40 pl-8 pr-3 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-primary/60"
              />
            </div>
            <button className="relative rounded-md border border-panel-border bg-panel p-1.5 text-text-secondary hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-status-critical" />
            </button>
            <button className="flex items-center gap-1 rounded-md border border-panel-border bg-panel px-2 py-1.5 text-xs text-text-secondary hover:text-foreground">
              <Globe className="h-3.5 w-3.5" /> 中文 <ChevronDown className="h-3 w-3" />
            </button>
            <div className="flex items-center gap-2 rounded-md border border-panel-border bg-panel px-2 py-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                A
              </div>
              <span className="text-xs text-foreground">admin</span>
              <button
                onClick={() => navigate({ to: "/login" })}
                title="退出"
                className="text-text-muted hover:text-status-critical"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="vt-page-content">
          {/* KPI row */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard icon={Sun}     label="光伏产能" value="18.42" unit="MWh" trend="+6.2%" color="text-energy-pv" />
            <KpiCard icon={Battery} label="储能容量" value="74.8"  unit="%"   trend="充电中" color="text-energy-ess" />
            <KpiCard icon={Fuel}    label="柴发待机" value="04"    unit="台"  trend="可用"   color="text-energy-dg" />
            <KpiCard icon={AlertTriangle} label="活跃告警" value="07" unit="条" trend="↑ 2"  color="text-status-warning" />
          </section>

          {/* Two-column */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Realtime power */}
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

            {/* Site status */}
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

          {/* Alarms table */}
          <section className="vt-glass p-0">
            <div className="vt-toolbar border-b border-panel-border">
              <h3 className="vt-section-title text-sm">最新告警</h3>
              <div className="flex gap-2">
                <button className="rounded border border-panel-border bg-panel px-3 py-1 text-xs text-text-secondary hover:text-foreground">
                  导出
                </button>
                <button className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  查看全部
                </button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2 font-medium">级别</th>
                  <th className="px-4 py-2 font-medium">站点</th>
                  <th className="px-4 py-2 font-medium">设备</th>
                  <th className="px-4 py-2 font-medium">描述</th>
                  <th className="px-4 py-2 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { lvl:1, site:"杭州·余杭",   dev:"GW-INV-08",  msg:"通信中断超过 5 分钟",   t:"02:14:08" },
                  { lvl:2, site:"深圳·南山 B2", dev:"ESS-Rack-02", msg:"电压偏低 / 380→352 V", t:"01:52:31" },
                  { lvl:3, site:"上海·浦东 R1", dev:"PV-String-12", msg:"组件温度偏高",       t:"01:30:11" },
                  { lvl:2, site:"成都·天府",   dev:"DG-03",       msg:"启动延迟",            t:"00:48:02" },
                ].map((a,i)=>(
                  <tr key={i} className="border-t border-panel-border/60 hover:bg-panel/40">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 alarm-level--${a.lvl}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {a.lvl===1?"严重":a.lvl===2?"警告":"提示"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{a.site}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{a.dev}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{a.msg}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-muted">{a.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </div>
  );
}

/* --- helpers --- */

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
  // Three SVG polylines representing PV/ESS/DG over 24h
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
        {/* grid */}
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={i} x1={pad} x2={w - pad} y1={pad + ((h - pad * 2) / 3) * i} y2={pad + ((h - pad * 2) / 3) * i}
            stroke="currentColor" className="text-panel-border" strokeDasharray="3 4" strokeWidth="0.5" />
        ))}
        <polyline fill="none" stroke="var(--energy-pv)"  strokeWidth="1.8" points={gen(1, 80, 25)} />
        <polyline fill="none" stroke="var(--energy-ess)" strokeWidth="1.8" points={gen(3, 55, 18)} />
        <polyline fill="none" stroke="var(--energy-dg)"  strokeWidth="1.8" points={gen(5, 30, 12)} />
        <Activity x={w-28} y={8} width={20} height={20} className="text-text-muted" />
      </svg>
    </div>
  );
}
