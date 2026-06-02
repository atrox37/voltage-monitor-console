import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Button, Result } from "antd";
import { Toaster } from "@/components/ui/sonner";
import { AntdAppProvider } from "@/providers/antd-app-provider";
import { hydrateAuthSession } from "@/lib/auth-session";
import { hydrateLocale } from "@/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Result
        status="404"
        title="404"
        subTitle="你访问的页面不存在或已被移除。"
        extra={<Link to="/"><Button type="primary">返回首页</Button></Link>}
      />
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Result
        status="error"
        title="页面加载失败"
        subTitle="出现了一些异常，请重试。"
        extra={(
          <>
            <Button type="primary" onClick={() => { router.invalidate(); reset(); }}>重试</Button>
            <Button href="/">返回首页</Button>
          </>
        )}
      />
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Voltage EMS 云端管理" },
      { name: "description", content: "Voltage EMS 云端能源监控管理平台" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Arimo:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    hydrateAuthSession();
    hydrateLocale();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AntdAppProvider>
        <Outlet />
        <Toaster position="top-center" richColors closeButton />
      </AntdAppProvider>
    </QueryClientProvider>
  );
}
