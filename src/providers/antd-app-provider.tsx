import { App, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import type { ReactNode } from "react";

dayjs.locale("zh-cn");

/** Voltage EMS 深色工业风 — 对齐 styles.css token */
export const antdTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#ff6900",
    colorSuccess: "#6dd400",
    colorWarning: "#ff6e08",
    colorError: "#da2d2c",
    colorInfo: "#fe9900",
    colorBgBase: "#17233d",
    colorBgContainer: "#1a2438",
    colorBgElevated: "#212c49",
    colorBorder: "rgba(166, 182, 210, 0.25)",
    colorText: "#f5f7fb",
    colorTextSecondary: "#a6b6d2",
    colorTextTertiary: "#8b9bb8",
    colorTextPlaceholder: "#8b9bb8",
    borderRadius: 6,
    fontFamily: '"Arimo", "Inter", system-ui, sans-serif',
    fontSize: 14,
    controlHeight: 32,
  },
  components: {
    Layout: {
      bodyBg: "#17233d",
      headerBg: "#17233d",
      siderBg: "#141b2e",
      triggerBg: "#212c49",
    },
    Menu: {
      darkItemBg: "#141b2e",
      darkSubMenuItemBg: "#141b2e",
      darkItemSelectedBg: "rgba(255, 105, 0, 0.15)",
      darkItemHoverBg: "rgba(54, 68, 102, 0.35)",
    },
    Table: {
      headerBg: "#1f2d47",
      headerColor: "#a6b6d2",
      headerSplitColor: "transparent",
      rowHoverBg: "#243048",
      borderColor: "rgba(166, 182, 210, 0.12)",
      cellPaddingBlock: 10,
      cellPaddingInline: 16,
      colorBgContainer: "#1c2640",
      fixedHeaderBg: "#1f2d47",
      stickyScrollBarBg: "rgba(96, 128, 188, 0.42)",
      stickyScrollBarBorderRadius: 999,
      rowSelectedBg: "#243048",
      rowSelectedHoverBg: "#2a3850",
    },
    Card: {
      colorBgContainer: "rgba(54, 68, 102, 0.2)",
    },
    Drawer: {
      colorBgElevated: "#17233d",
    },
    Modal: {
      contentBg: "#17233d",
      headerBg: "#17233d",
    },
    Message: {
      contentBg: "#212c49",
    },
    Select: {
      colorBgContainer: "#1a2438",
      colorBgElevated: "#212c49",
      optionSelectedBg: "rgba(255, 105, 0, 0.18)",
      optionActiveBg: "rgba(54, 68, 102, 0.55)",
      colorText: "#f5f7fb",
      colorTextPlaceholder: "#8b9bb8",
      controlItemBgHover: "rgba(54, 68, 102, 0.45)",
      selectorBg: "#1a2438",
    },
    TreeSelect: {
      colorBgContainer: "#1a2438",
      colorBgElevated: "#212c49",
      nodeHoverBg: "rgba(54, 68, 102, 0.45)",
      nodeSelectedBg: "rgba(255, 105, 0, 0.18)",
    },
  },
} as const;

export function AntdAppProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
