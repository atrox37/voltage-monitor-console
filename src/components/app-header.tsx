import { VtButton } from "@/components/vt-button";
import { Avatar, Dropdown, Layout, Space, Typography } from "antd";
import {
  DownOutlined,
  GlobalOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useTranslation, type Locale } from "@/i18n";

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
      <VtButton
        type="text"
        icon={sidebarExpanded ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        onClick={onToggleSidebar}
        title={sidebarExpanded ? t("header.collapseSidebar") : t("header.expandSidebar")}
      />

      <Space size="middle">
        <Dropdown menu={langItems} trigger={["click"]}>
          <VtButton icon={<GlobalOutlined />}>
            {locale === "zh-CN" ? t("header.langZh") : t("header.langEn")}
            <DownOutlined className="!text-[10px] opacity-70" />
          </VtButton>
        </Dropdown>
        <Dropdown menu={userItems} trigger={["click"]}>
          <VtButton className="!flex !items-center !gap-2">
            <Avatar className="!bg-primary !text-[10px] !font-bold">
              {avatarLetter}
            </Avatar>
            <Typography.Text ellipsis className="max-w-[8rem] !text-xs">
              {displayName}
            </Typography.Text>
            <DownOutlined className="!text-[10px] opacity-70" />
          </VtButton>
        </Dropdown>
      </Space>
    </Header>
  );
}
