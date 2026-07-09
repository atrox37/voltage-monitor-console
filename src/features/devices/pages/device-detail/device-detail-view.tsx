import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftOutlined, SaveOutlined, SyncOutlined } from "@ant-design/icons";
import { Empty, Spin, Tabs, Tag } from 'antd';
import { VtButton } from '@/components/vt-button';
import { useTranslation } from "@/i18n";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";

import { DeviceAlarmRulesTab } from "@/features/devices/components/device-alarm-rules-tab";

import { TabInfo } from "./tabs/info-tab";
import { TabMeta } from "./tabs/meta-tab";
import { TabRuntime } from "./tabs/runtime-tab";
import { TabFunc } from "./tabs/func-tab";
import { TabEvents } from "./tabs/events-tab";
import { TabAlarm } from "./tabs/alarm-tab";
import { TabChildren } from "./tabs/children-tab";
import type { DeviceDetailTabKey } from "./types";
type TabKey = DeviceDetailTabKey;

export function DeviceDetailView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { device, loading, saving, syncing, save, syncModel } = useDeviceEdit();
  const [tab, setTab] = useState<TabKey>("info");

  // 当设备切换时（如从网关跳转到子设备），重置 tab 到基本信息
  useEffect(() => {
    setTab("info");
  }, [device?.id]);

  if (loading) {
    return (
      <main className="vt-page-content vt-page-fill">
        <div className="vt-glass flex flex-1 items-center justify-center">
          <Spin description={t("devices.detail.loading")} />
        </div>
      </main>
    );
  }

  if (!device) {
    return (
      <main className="vt-page-content">
        <div className="vt-glass flex flex-1 items-center justify-center">
          <Empty
            description={t("devices.detail.notFound")}
            extra={
              <Link to="/devices/list">
                <VtButton type="primary">
                  {t("common.backToList")}
                </VtButton>
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const isGateway = device.productType === "gateway";
  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: t("devices.detail.tabs.info") },
    { key: "meta", label: t("devices.detail.tabs.meta") },
    { key: "runtime", label: t("devices.detail.tabs.runtime") },
    { key: "func", label: t("devices.detail.tabs.func") },
    { key: "events", label: t("devices.detail.tabs.events") },
    { key: "rules", label: t("devices.detail.tabs.rules") },
    { key: "alarm", label: t("devices.detail.tabs.alarm") },
    ...(isGateway ? [{ key: "children" as TabKey, label: t("devices.detail.tabs.children") }] : []),
  ];

  const statusColor =
    device.status === "online" ? "success" : device.status === "disabled" ? "default" : "error";
  const statusLabel =
    device.status === "online"
      ? t("status.online")
      : device.status === "disabled"
        ? t("status.disabled")
        : t("status.offline");

  return (
    <main className="vt-page-content vt-page-fill flex flex-col gap-2 !overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <VtButton
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate({ to: "/devices/list" })}
          >
            {t("common.back")}
          </VtButton>
          <h2 className="vt-section-title text-base">{device.name}</h2>
          <span className="text-[11px] text-text-muted">ID</span>
          <span className="text-xs text-text-secondary">{device.id}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{t("common.status")}</span>
          <Tag color={statusColor}>{statusLabel}</Tag>
          <VtButton
            icon={<SyncOutlined spin={syncing} />}
            disabled={syncing}
            onClick={() => void syncModel()}
          >
            {t("common.modelSync")}
          </VtButton>
          <VtButton
            type="primary"
            icon={<SaveOutlined />}
            disabled={saving}
            loading={saving}
            onClick={() => void save()}
          >
            {saving ? t("common.saving") : t("common.save")}
          </VtButton>
        </div>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        destroyInactiveTabPane
        className="vt-detail-tabs min-h-0 flex-1"
        items={tabs.map((tabItem) => ({
          key: tabItem.key,
          label: tabItem.label,
          children: (
            <div className="vt-glass flex h-full min-h-0 flex-col overflow-hidden p-5">
              {tabItem.key === "info" && <TabInfo />}
              {tabItem.key === "meta" && <TabMeta />}
              {tabItem.key === "runtime" && <TabRuntime />}
              {tabItem.key === "func" && <TabFunc />}
              {tabItem.key === "events" && <TabEvents />}
              {tabItem.key === "rules" && <DeviceAlarmRulesTab />}
              {tabItem.key === "alarm" && <TabAlarm />}
              {tabItem.key === "children" && <TabChildren />}
            </div>
          ),
        }))}
      />
    </main>
  );
}
