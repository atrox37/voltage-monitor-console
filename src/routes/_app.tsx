import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";

import { useEffect, useMemo, useState } from "react";

import { Layout, Menu, Typography } from "antd";

import { ThunderboltOutlined } from "@ant-design/icons";

import { useTranslation } from "@/i18n";

import { useNavGroups } from "@/i18n/nav";

import { authActions, hydrateAuthSession, isLoggedIn, useAuth } from "@/lib/auth-session";

import { cancelAllPendingRequests } from "@/lib/request";

import { AppHeader } from "@/components/app-header";



const { Sider, Content } = Layout;



export const Route = createFileRoute("/_app")({

  beforeLoad: () => {

    if (typeof window === "undefined") return;

    hydrateAuthSession();

    if (!isLoggedIn()) {

      throw redirect({ to: "/login" });

    }

  },

  component: AppLayout,

});



function AppLayout() {

  const navigate = useNavigate();

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { t } = useTranslation();

  const navGroups = useNavGroups();

  const { displayName } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);

  const [collapsed, setCollapsed] = useState(false);



  const activeGroup = navGroups.find((g) =>

    g.children.some((c) =>

      c.to === "/" ? pathname === "/" : pathname === c.to || pathname.startsWith(c.to + "/"),

    ),

  )?.key;



  const [openKeys, setOpenKeys] = useState<string[]>(() => navGroups.map((g) => g.key));



  useEffect(() => {

    if (activeGroup) setOpenKeys((keys) => Array.from(new Set([...keys, activeGroup])));

  }, [activeGroup]);



  const selectedKey = useMemo(() => {

    for (const g of navGroups) {

      for (const c of g.children) {

        const hit = c.to === "/" ? pathname === "/" : pathname === c.to || pathname.startsWith(c.to + "/");

        if (hit) return c.to;

      }

    }

    return pathname;

  }, [navGroups, pathname]);



  const menuItems = useMemo(

    () =>

      navGroups.map((g) => {

        const GroupIcon = g.icon;

        return {

          key: g.key,

          label: g.label,

          icon: <GroupIcon className="h-4 w-4" />,

          children: g.children.map((c) => {

            const ItemIcon = c.icon;

            return {

              key: c.to,

              label: c.label,

              icon: <ItemIcon className="h-4 w-4" />,

            };

          }),

        };

      }),

    [navGroups],

  );



  const handleLogout = async () => {

    if (loggingOut) return;

    setLoggingOut(true);

    try {

      cancelAllPendingRequests();

      await authActions.logout();

      await navigate({ to: "/login" });

    } finally {

      setLoggingOut(false);

    }

  };



  const avatarLetter = (displayName || "A").charAt(0).toUpperCase();



  return (

    <Layout className="h-screen min-h-0 overflow-hidden">

      <Sider

        collapsible

        collapsed={collapsed}

        onCollapse={setCollapsed}

        width={240}

        theme="dark"

        className="hidden h-full md:block [&_.ant-layout-sider-children]:flex [&_.ant-layout-sider-children]:h-full [&_.ant-layout-sider-children]:flex-col"

        trigger={null}

      >

        <div className={`flex h-14 shrink-0 items-center gap-2 border-b border-[var(--panel-border)] ${collapsed ? "justify-center px-0" : "px-4"}`}>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/15 text-primary ring-1 ring-primary/40">

            <ThunderboltOutlined />

          </div>

          {!collapsed && (

            <Typography.Text strong className="!text-foreground tracking-wider">

              VOLTAGE <span className="text-primary">EMS</span>

            </Typography.Text>

          )}

        </div>

        <div className={`vt-ant-sider-menu min-h-0 flex-1 ${collapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"}`}>

          <Menu

            theme="dark"

            mode="inline"

            inlineCollapsed={collapsed}

            selectedKeys={[selectedKey]}

            {...(collapsed ? {} : { openKeys, onOpenChange: setOpenKeys })}

            triggerSubMenuAction="click"

            getPopupContainer={() => document.body}

            classNames={{ popup: { root: "vt-ant-sider-submenu-popup" } }}

            onClick={({ key }) => {

              if (typeof key === "string" && key.startsWith("/")) {

                void navigate({ to: key });

              }

            }}

            items={menuItems}

            className="border-none"

          />

        </div>

        {!collapsed && (

          <div className="shrink-0 border-t border-[var(--panel-border)] px-3 py-3 text-[11px] text-[var(--text-muted)]">

            <div className="flex items-center justify-between">

              <span>v2.6.0</span>

              <span className="flex items-center gap-1">

                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--status-online)]" />

                {t("common.online")}

              </span>

            </div>

          </div>

        )}

      </Sider>



      <Layout className="min-w-0">

        <AppHeader

          displayName={displayName}

          avatarLetter={avatarLetter}

          loggingOut={loggingOut}

          sidebarExpanded={!collapsed}

          onToggleSidebar={() => setCollapsed((v) => !v)}

          onLogout={() => void handleLogout()}

        />

        <Content className="min-h-0 overflow-hidden bg-[var(--page)]">

          <Outlet />

        </Content>

      </Layout>

    </Layout>

  );

}


