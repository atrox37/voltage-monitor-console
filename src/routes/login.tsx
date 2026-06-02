import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Spin, Typography } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { getCaptcha } from "@/api/auth";
import { authActions, hydrateAuthSession, isLoggedIn } from "@/lib/auth-session";
import { normalizeCaptchaSrc } from "@/lib/captcha";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    hydrateAuthSession();
    if (isLoggedIn()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await getCaptcha();
      setCaptchaImage(normalizeCaptchaSrc(res.base64 ?? res.image));
      setCaptcha("");
    } catch {
      setCaptchaImage("");
      toast.error(t("login.captchaFailed"));
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    void fetchCaptcha();
  }, []);

  const onSubmit = async () => {
    setError("");
    if (!account.trim() || !password) {
      setError(t("login.needAccountPassword"));
      return;
    }
    if (!captcha.trim()) {
      setError(t("login.needCaptcha"));
      return;
    }
    setLoading(true);
    try {
      await authActions.login({ account: account.trim(), password, captcha: captcha.trim() });
      toast.success(t("login.success"));
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("login.failed"));
      setCaptcha("");
      await fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
              <ThunderboltOutlined className="text-2xl" />
            </div>
            <Typography.Title level={3} className="!mb-0 !text-center">
              VOLTAGE <span className="text-primary">EMS</span>
            </Typography.Title>
            <Typography.Text type="secondary" className="text-xs">{t("login.subtitle")}</Typography.Text>
          </div>

          <Card bordered={false} className="!px-2">
            <Typography.Title level={4}>{t("login.title")}</Typography.Title>
            <Typography.Paragraph type="secondary" className="!text-xs">{t("login.desc")}</Typography.Paragraph>

            <Form layout="vertical" size="large" className="mt-4" onFinish={() => void onSubmit()}>
              <Form.Item label={t("login.account")} required>
                <Input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  autoComplete="username"
                  placeholder={t("login.accountPlaceholder")}
                />
              </Form.Item>
              <Form.Item label={t("login.password")} required>
                <Input.Password
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </Form.Item>
              <Form.Item label={t("login.captcha")} required>
                <div className="flex gap-3">
                  <Input
                    className="flex-1"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    maxLength={4}
                    placeholder={t("login.captchaPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => void fetchCaptcha()}
                    disabled={captchaLoading}
                    title={t("login.refreshCaptcha")}
                    className="flex h-10 w-[132px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-[var(--panel-border)] bg-[var(--background)]/40 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {captchaLoading ? (
                      <Spin size="small" />
                    ) : captchaImage ? (
                      <img src={captchaImage} alt={t("login.captcha")} className="h-full w-full object-contain" />
                    ) : (
                      <span className="px-1 text-xs text-[var(--text-muted)]">{t("login.clickRefresh")}</span>
                    )}
                  </button>
                </div>
              </Form.Item>

              {error && <Alert type="error" message={error} showIcon className="mb-4" />}

              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                {loading ? t("login.submitting") : t("login.submit")}
              </Button>
            </Form>

            <Typography.Text type="secondary" className="mt-6 block border-t border-[var(--panel-border)] pt-4 text-center text-[11px]">
              {t("login.copyright", { year: new Date().getFullYear() })}
            </Typography.Text>
          </Card>
        </div>
      </div>
    </div>
  );
}
