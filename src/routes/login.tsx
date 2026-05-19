import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Zap, Shield, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function generateCaptcha() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@voltage.com");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [expected, setExpected] = useState(() => generateCaptcha());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const captchaColors = useMemo(
    () => ["#ff6900", "#6dd400", "#fe9900", "#7dd3fc", "#a78bfa"],
    [],
  );

  const refreshCaptcha = () => setExpected(generateCaptcha());

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (captcha.toUpperCase() !== expected) {
      setError("验证码错误");
      refreshCaptcha();
      setCaptcha("");
      return;
    }
    if (!email || !password) {
      setError("请输入账号和密码");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    navigate({ to: "/" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--text-secondary) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-energy-ess/25 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* Brand panel */}
          <div className="hidden flex-col justify-between lg:flex">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <div className="font-heading text-xl font-bold tracking-wide text-foreground">
                  VOLTAGE <span className="text-primary">EMS</span>
                </div>
                <div className="text-xs text-text-secondary">Cloud Management Console</div>
              </div>
            </div>

            <div>
              <h1 className="font-heading text-4xl font-bold leading-tight text-foreground">
                工业级
                <span className="text-primary"> 能源管理 </span>
                云平台
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary">
                统一接入 PV / ESS / DG 设备，实时监控运行状态、告警与能效。
                为多站点、多机构提供一体化的远程运维体验。
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { label: "在线设备", value: "1,284", unit: "台", color: "text-status-online" },
                  { label: "今日产能", value: "32.6", unit: "MWh", color: "text-energy-pv" },
                  { label: "活跃告警", value: "07", unit: "条", color: "text-status-warning" },
                ].map((k) => (
                  <div key={k.label} className="vt-glass p-3">
                    <div className="text-[11px] uppercase tracking-wider text-text-muted">
                      {k.label}
                    </div>
                    <div className="mt-1 flex items-baseline">
                      <span className={`vt-kpi-value text-2xl ${k.color}`}>{k.value}</span>
                      <span className="vt-kpi-unit">{k.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Shield className="h-3.5 w-3.5" />
              加密传输 · 多因素鉴权 · 操作审计
            </div>
          </div>

          {/* Login form */}
          <div className="vt-glass vt-glass-strong p-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
                <Zap className="h-5 w-5" />
              </div>
              <div className="font-heading text-lg font-bold text-foreground">
                VOLTAGE <span className="text-primary">EMS</span>
              </div>
            </div>

            <h2 className="vt-section-title text-lg">登录</h2>
            <p className="mt-1 text-xs text-text-secondary">使用授权账号进入云端管理控制台</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <Field label="账号 / Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className={inputCls}
                  placeholder="name@voltage.com"
                />
              </Field>

              <Field label="密码">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={inputCls}
                  placeholder="••••••••"
                />
              </Field>

              <Field label="验证码">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    maxLength={4}
                    className={`${inputCls} flex-1`}
                    placeholder="请输入验证码"
                  />
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    title="换一张"
                    className="group relative flex h-10 w-[120px] select-none items-center justify-center overflow-hidden rounded-md border border-panel-border bg-background/40"
                  >
                    <span className="absolute inset-0 flex items-center justify-center gap-1 font-heading text-lg font-bold tracking-[0.3em]">
                      {expected.split("").map((c, i) => (
                        <span
                          key={i}
                          style={{
                            color: captchaColors[i % captchaColors.length],
                            transform: `rotate(${(i - 1.5) * 8}deg) translateY(${(i % 2) * -2}px)`,
                            display: "inline-block",
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </span>
                    <span className="absolute inset-0 bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <RefreshCw className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-text-secondary" />
                    </span>
                  </button>
                </div>
              </Field>

              {error && (
                <div className="rounded-md border border-status-critical/40 bg-status-critical/10 px-3 py-2 text-xs text-status-critical">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold tracking-wider text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                <span className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/20 opacity-0 transition group-hover:opacity-100" />
                {loading ? "登录中…" : "登 录"}
              </button>

              <div className="flex justify-between text-xs text-text-secondary">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-primary" />
                  记住账号
                </label>
                <a href="#" className="hover:text-primary">忘记密码？</a>
              </div>
            </form>

            <div className="mt-8 border-t border-panel-border pt-4 text-center text-[11px] text-text-muted">
              © {new Date().getFullYear()} Voltage Energy · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-md border border-panel-border bg-background/40 px-3 text-sm text-foreground placeholder:text-text-muted outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
