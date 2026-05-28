import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Zap, Bell, ChevronDown, ChevronRight, Search, LogOut, Globe,
} from "lucide-react";
import { NAV, findCrumbs } from "@/lib/nav-config";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = findCrumbs(pathname);

  // expand the group containing the active route
  const activeGroup = NAV.find((g) =>
    g.children.some((c) =>
      c.to === "/" ? pathname === "/" : pathname === c.to || pathname.startsWith(c.to + "/"),
    ),
  )?.key;
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV.map((g) => [g.key, true])),
  );
  useEffect(() => {
    if (activeGroup) setOpen((o) => ({ ...o, [activeGroup]: true }));
  }, [activeGroup]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-panel-border bg-background/60 backdrop-blur-md md:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/15 text-primary ring-1 ring-primary/40">
            <Zap className="h-4 w-4" />
          </div>
          <div className="font-heading text-sm font-bold tracking-wider text-foreground">
            VOLTAGE <span className="text-primary">EMS</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {NAV.map((g) => {
            const GroupIcon = g.icon;
            const isOpen = open[g.key];
            return (
              <div key={g.key} className="mb-1">
                <button
                  onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:bg-panel hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className="h-4 w-4" />
                    {g.label}
                  </span>
                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {isOpen && (
                  <div className="mt-0.5">
                    {g.children.map((c) => {
                      const Icon = c.icon;
                      const isActive =
                        c.to === "/"
                          ? pathname === "/"
                          : pathname === c.to || pathname.startsWith(c.to + "/");
                      return (
                        <Link
                          key={c.to}
                          to={c.to}
                          className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 pl-8 text-[15px] transition ${
                            isActive
                              ? "bg-primary/15 text-foreground"
                              : "text-text-secondary hover:text-foreground"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-primary" />
                          )}
                          <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                          <span>{c.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
        <header className="vt-page-header sticky top-0 z-30 border-b border-panel-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">{crumbs.group ?? "首页"}</span>
            <span className="text-text-muted">/</span>
            <span className="text-foreground">{crumbs.page ?? "总览"}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                placeholder="搜索"
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

        <Outlet />
      </div>
    </div>
  );
}
