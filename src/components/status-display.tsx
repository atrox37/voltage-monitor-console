import { Tag } from "antd";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

/** 列表/详情统一状态语义色：正面=绿，负面=红 */
export type StatusKind = "online" | "offline" | "enabled" | "disabled" | "warning" | "critical";

const STATUS_META: Record<
  StatusKind,
  { tagColor: "success" | "error" | "warning" | "default"; i18nKey: string; pill: string }
> = {
  online: {
    tagColor: "success",
    i18nKey: "status.online",
    pill: "bg-status-online/15 text-status-online",
  },
  enabled: {
    tagColor: "success",
    i18nKey: "status.enabled",
    pill: "bg-status-online/15 text-status-online",
  },
  offline: {
    tagColor: "error",
    i18nKey: "status.offline",
    pill: "bg-status-critical/15 text-status-critical",
  },
  disabled: {
    tagColor: "error",
    i18nKey: "status.disabled",
    pill: "bg-status-critical/15 text-status-critical",
  },
  warning: {
    tagColor: "warning",
    i18nKey: "status.warning",
    pill: "bg-status-warning/15 text-status-warning",
  },
  critical: {
    tagColor: "error",
    i18nKey: "status.critical",
    pill: "bg-status-critical/15 text-status-critical",
  },
};

export function StatusBadge({ status }: { status: StatusKind }) {
  const { t } = useTranslation();
  const s = STATUS_META[status];
  return <Tag color={s.tagColor}>{t(s.i18nKey)}</Tag>;
}

/** 表格内紧凑状态标签（无 Ant Tag 边框） */
export function StatusPill({ status, className }: { status: StatusKind; className?: string }) {
  const { t } = useTranslation();
  const s = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px]",
        s.pill,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(s.i18nKey)}
    </span>
  );
}

/** 运行/启用 vs 停用/离线 */
export function enabledStatusKind(enabled: boolean): "enabled" | "disabled" {
  return enabled ? "enabled" : "disabled";
}

/** 网络组件连接状态（分页行 t2：SUCCESS / FAIL / LOADING） */
export function NetworkConnectStatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation();
  if (status === "SUCCESS") {
    return <Tag color="success">{t("ingest.components.connected")}</Tag>;
  }
  if (status === "FAIL") {
    return <Tag color="warning">{t("ingest.components.notConnected")}</Tag>;
  }
  if (status === "LOADING") {
    return <Tag color="processing">{t("ingest.components.connecting")}</Tag>;
  }
  return <span className="text-text-muted">—</span>;
}

export function deviceConnectionStatus(status: string | undefined): StatusKind {
  if (status === "online") return "online";
  if (status === "disabled") return "disabled";
  return "offline";
}
