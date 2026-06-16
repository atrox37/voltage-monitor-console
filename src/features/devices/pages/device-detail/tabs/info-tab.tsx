import { Link } from "@tanstack/react-router";

import { Input, Select, Tag } from "antd";
import { useTranslation } from "@/i18n";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";

import { useProductTypeLabel } from "@/features/products/lib/product-type-i18n";
import type { TagModel } from "@/types/api/metadata";

import { Row } from "../components/detail-row";

export function TabInfo() {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const productTypeLabel = useProductTypeLabel();
  const { device, orgNodes, gateways, updateDevice, updateMetadata } = useDeviceEdit();
  if (!device) return null;
  const isChildren = device.productType === "children";

  const setTag = (index: number, patch: Partial<TagModel>) => {
    updateMetadata((m) => {
      const tags = [...(m.tags ?? [])];
      tags[index] = { ...tags[index], ...patch };
      return { ...m, tags };
    });
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto">
      <div className="text-sm font-semibold text-foreground">{device.name}</div>

      {/* 基本字段区 */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
        <Row label={t("common.deviceName")}>
          <Input
            placeholder={ph.input(t("common.deviceName"))}
            value={device.name}
            onChange={(e) => updateDevice({ name: e.target.value })}
          />
        </Row>
        <Row label={t("common.deviceSn")}>
          <Input
            placeholder={ph.input(t("common.deviceSn"))}
            value={device.sn}
            onChange={(e) => updateDevice({ sn: e.target.value })}
          />
        </Row>
        <Row label={t("common.orgBelong")}>
          <OrgTreeSelect
            nodes={orgNodes}
            value={device.orgId}
            placeholder={ph.select(t("common.orgBelong"))}
            onChange={(v) => updateDevice({ orgId: v })}
          />
        </Row>

        <Row label={t("common.productName")}>
          <Link
            to="/devices/products/$id"
            params={{ id: device.productId }}
            className="text-primary hover:underline"
          >
            {device.productName}
          </Link>
        </Row>
        <Row label={t("common.productType")}>
          <Tag color="processing">{productTypeLabel(device.productType)}</Tag>
        </Row>
        <Row label={t("common.owner")}>
          <span className="text-text-secondary">{device.creator}</span>
        </Row>

        {/* 子设备：展示关联网关（只读） */}
        {isChildren && (
          <Row label={t("common.gatewayDevice")}>
            <span className="text-text-secondary">{device.gatewayName ?? "—"}</span>
          </Row>
        )}
        <Row label={t("common.collectGateway")}>
          {isChildren ? (
            <span className="text-text-secondary">{device.gatewayName ?? "—"}</span>
          ) : (
            <Select
              className="vt-select-control"
              classNames={{ popup: { root: "vt-select-popup" } }}
              style={{ width: "100%" }}
              allowClear
              value={device.gatewayId || undefined}
              onChange={(v) => {
                const id = String(v ?? "");
                const gw = gateways.find((g) => String(g.gatewayPo?.id ?? "") === id);
                updateDevice({
                  gatewayId: id || undefined,
                  gatewayName: gw?.gatewayPo?.name ?? "",
                });
              }}
              options={gateways.map((g) => ({
                label: g.gatewayPo?.name ?? "—",
                value: String(g.gatewayPo?.id ?? ""),
              }))}
              placeholder={ph.select(t("common.collectGateway"))}
            />
          )}
        </Row>
        <Row label={t("common.collectMode")}>
          {device.networkType ? (
            <Tag color="processing">{device.networkType}</Tag>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </Row>

        <Row label={t("common.createTime")}>
          <span className="text-text-secondary">{device.createTime}</span>
        </Row>
        <Row label={t("common.updateTime")}>
          <span className="text-text-secondary">{device.updateTime}</span>
        </Row>
      </div>

      {/* 设备标签 */}
      {(device.metadata.tags ?? []).length > 0 && (
        <div>
          <div className="mb-2 text-sm text-foreground">{t("devices.detail.info.deviceTags")}</div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
            {(device.metadata.tags ?? []).map((tag, index) => (
              <div
                key={`${tag.tagKey}-${index}`}
                className="grid grid-cols-[140px_1fr] items-center gap-3"
              >
                <span className="text-xs font-medium text-foreground">{tag.tagName}</span>
                <Input
                  value={tag.tagValue ?? ""}
                  onChange={(e) => setTag(index, { tagValue: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
