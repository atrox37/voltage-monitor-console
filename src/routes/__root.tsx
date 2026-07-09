import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter } from "@tanstack/react-router";
import { Result } from "antd";
import { VtButton } from "@/components/vt-button";
import { AntdAppProvider } from "@/providers/antd-app-provider";
import { useTranslation } from "@/i18n";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <AntdAppProvider>
      <div className="flex min-h-screen items-center justify-center px-4">
        <Result
          status="404"
          title={<span className="text-foreground">404</span>}
          subTitle={<span className="text-text-secondary">{t("errors.notFoundDesc")}</span>}
          extra={
            <Link to="/">
              <VtButton type="primary">{t("errors.backHome")}</VtButton>
            </Link>
          }
        />
      </div>
    </AntdAppProvider>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  console.error(error);
  const router = useRouter();
  return (
    <AntdAppProvider>
      <div className="flex min-h-screen items-center justify-center px-4">
        <Result
          status="error"
          title={<span className="text-foreground">{t("errors.loadFailedTitle")}</span>}
          subTitle={<span className="text-text-secondary">{t("errors.loadFailedDesc")}</span>}
          extra={
            <div className="flex items-center justify-center gap-3">
              <VtButton
                type="primary"
                onClick={() => {
                  router.invalidate();
                  reset();
                }}
              >
                {t("errors.retry")}
              </VtButton>
              <VtButton
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                {t("errors.backHome")}
              </VtButton>
            </div>
          }
        />
      </div>
    </AntdAppProvider>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AntdAppProvider>
        <Outlet />
      </AntdAppProvider>
    </QueryClientProvider>
  );
}
