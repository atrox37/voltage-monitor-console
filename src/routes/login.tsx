import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Zap, RefreshCw } from "lucide-react";

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
        <div className="w-full max-w-md">
          {/* Platform name */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
              <Zap className="h-6 w-6" />
            </div>
            <div className="text-center">
              <div className="font-heading text-2xl font-bold tracking-wide text-foreground">
                VOLTAGE <span className="text-primary">EMS</span>
              </div>
              <div className="mt-1 text-xs text-text-secondary">Cloud Management Console</div>
            </div>
          </div>

          {/* Login form */}
          <div className="vt-glass vt-glass-strong p-8">
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
                {loading ? "登录中…" : "登 录"}
              </button>
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
