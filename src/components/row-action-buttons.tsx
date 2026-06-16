import { type ComponentType, type ReactNode, useState } from "react";
import { Button } from "antd";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  RadarChartOutlined,
  ReloadOutlined,
  SendOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/i18n";

/** 列表/详情操作列按钮统一尺寸与排版（与用户管理「编辑」一致：small + 12px 图标） */
export const ROW_ACTION_BTN_CLASS =
  "!inline-flex !h-6 !min-h-6 shrink-0 !items-center !justify-center !gap-1 !px-2 text-xs";

/** 操作列图标统一 12px（Ant Design / Lucide 通用） */
export const ROW_ACTION_ICON_CLASS = "!h-3 !w-3 shrink-0 text-xs leading-none";

export function RowActionGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-nowrap items-center justify-start gap-1 whitespace-nowrap">
      {children}
    </div>
  );
}

const ROW_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  编辑: EditOutlined,
  Edit: EditOutlined,
  删除: DeleteOutlined,
  Delete: DeleteOutlined,
  详情: EyeOutlined,
  Details: EyeOutlined,
  预览: EyeOutlined,
  Preview: EyeOutlined,
  导出: DownloadOutlined,
  Export: DownloadOutlined,
  启用: PoweroffOutlined,
  Enable: PoweroffOutlined,
  停用: PoweroffOutlined,
  Disable: PoweroffOutlined,
  禁用: PoweroffOutlined,
  重启: ReloadOutlined,
  Restart: ReloadOutlined,
  解绑: LinkOutlined,
  Unbind: LinkOutlined,
  物模型: AppstoreOutlined,
  新增子机构: ApartmentOutlined,
  下发: SendOutlined,
  同步: SyncOutlined,
  Sync: SyncOutlined,
  测试: PlayCircleOutlined,
  Test: PlayCircleOutlined,
  总招: RadarChartOutlined,
  Recruit: RadarChartOutlined,
};

export type RowActionBtnProps = {
  children?: ReactNode;
  /** 纯图标按钮时的无障碍文案（也可由 children 字符串推导） */
  label?: string;
  onClick?: () => void;
  danger?: boolean;
  icon?: ComponentType<{ className?: string }>;
  /** 仅显示图标，样式与文字按钮一致 */
  iconOnly?: boolean;
  disabled?: boolean;
  confirm?: { description: ReactNode; title?: string; confirmText?: string };
  className?: string;
};

export function RowActionBtn({
  children,
  label,
  onClick,
  danger,
  icon: IconProp,
  iconOnly = false,
  disabled,
  confirm,
  className = "",
}: RowActionBtnProps) {
  const { t } = useTranslation();
  const textLabel = typeof children === "string" ? children : (label ?? "");
  const Icon = IconProp ?? (textLabel ? ROW_ICON_MAP[textLabel] : undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const triggerConfirm = (danger || !!confirm) && !disabled;
  const onlyIcon = iconOnly || (children == null && !!Icon);

  const ariaLabel = label ?? (typeof children === "string" ? children : undefined);

  return (
    <>
      <Button
        size="small"
        type={onlyIcon ? "text" : "default"}
        disabled={disabled}
        danger={danger}
        icon={
          Icon ? (
            <span className="inline-flex items-center">
              <Icon className={ROW_ACTION_ICON_CLASS} />
            </span>
          ) : undefined
        }
        aria-label={onlyIcon ? ariaLabel : undefined}
        className={`${ROW_ACTION_BTN_CLASS} ${onlyIcon ? "!w-6 !min-w-6 !px-0" : ""} ${className}`.trim()}
        onClick={() => {
          if (disabled) return;
          if (triggerConfirm) setConfirmOpen(true);
          else onClick?.();
        }}
      >
        {!onlyIcon ? children : null}
      </Button>
      {triggerConfirm && (
        <ConfirmDialog
          open={confirmOpen}
          title={confirm?.title ?? (danger ? t("common.confirmDelete") : t("common.confirmAction"))}
          description={confirm?.description ?? <>{t("common.confirmActionDesc")}</>}
          confirmText={confirm?.confirmText ?? (danger ? t("common.delete") : t("common.confirm"))}
          danger={danger}
          onConfirm={() => onClick?.()}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

/** @deprecated 使用 RowActionBtn */
export const RowBtn = RowActionBtn;

/** 启用/禁用等切换型操作（与 RowActionBtn 同高） */
export function RowActionToggle({
  active,
  onClick,
  activeLabel,
  inactiveLabel,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  activeLabel: string;
  inactiveLabel: string;
  disabled?: boolean;
}) {
  return (
    <Button size="small" disabled={disabled} className={ROW_ACTION_BTN_CLASS} onClick={onClick}>
      {active ? activeLabel : inactiveLabel}
    </Button>
  );
}
