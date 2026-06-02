import { Dropdown, Layout, Space, Typography } from "antd";
import {
  GlobalOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useTranslation, type Locale } from "@/i18n";
import { HeaderSearch } from "@/components/header-search";

const { Header } = Layout;

type AppHeaderProps = {
  displayName: string;
  avatarLetter: string;
  loggingOut: boolean;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
};

export function AppHeader({
  displayName,
  avatarLetter,
  loggingOut,
  sidebarExpanded,
  onToggleSidebar,
  onLogout,
}: AppHeaderProps) {
  const { t, locale, setLocale } = useTranslation();

  const pickLocale = (next: Locale) => setLocale(next);

  const langItems = {
    items: [
      { key: "zh-CN", label: t("header.langZh"), onClick: () => pickLocale("zh-CN") },
      { key: "en-US", label: t("header.langEn"), onClick: () => pickLocale("en-US") },
    ],
  };

  const userItems = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: t("header.logout"),
        danger: true,
        disabled: loggingOut,
        onClick: onLogout,
      },
    ],
  };

  return (
    <Header className="flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--background)] px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        title={sidebarExpanded ? t("header.collapseSidebar") : t("header.expandSidebar")}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] text-[var(--text-secondary)] transition hover:text-foreground"
      >
        {sidebarExpanded ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
      </button>

      <Space size="middle">
        <HeaderSearch />
        <Dropdown menu={langItems} trigger={["click"]}>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-foreground"
          >
            <GlobalOutlined />
            {locale === "zh-CN" ? t("header.langZh") : t("header.langEn")}
          </button>
        </Dropdown>
        <Dropdown menu={userItems} trigger={["click"]}>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-[var(--panel-border)] px-2 py-1 text-[var(--text-secondary)] hover:text-foreground"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-[var(--primary-foreground)]">
              {avatarLetter}
            </div>
            <Typography.Text ellipsis className="max-w-[8rem] !text-xs">
              {displayName}
            </Typography.Text>
          </button>
        </Dropdown>
      </Space>
    </Header>
  );
}
