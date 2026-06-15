import { type ReactNode, useCallback, useState } from "react";
import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "@/i18n";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  danger = true,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      title={title ?? t("common.confirmAction")}
      open={open}
      onCancel={onClose}
      onOk={() => {
        onConfirm();
        onClose();
      }}
      okText={confirmText ?? (danger ? t("common.delete") : t("common.confirm"))}
      cancelText={cancelText ?? t("common.cancel")}
      okButtonProps={{ danger }}
      centered
      destroyOnHidden
    >
      <div className="flex gap-3 py-2">
        <ExclamationCircleOutlined
          className={`text-lg ${danger ? "text-[#da2d2c]" : "text-[#ff6900]"}`}
        />
        <div className="text-sm text-[var(--text-secondary)]">{description}</div>
      </div>
    </Modal>
  );
}

export function useConfirm() {
  const { t } = useTranslation();
  const [state, setState] = useState<{
    description: ReactNode;
    title?: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const confirm = useCallback(
    (opts: {
      description: ReactNode;
      title?: string;
      confirmText?: string;
      danger?: boolean;
      onConfirm: () => void;
    }) => setState(opts),
    [],
  );

  const confirmNode = (
    <ConfirmDialog
      open={!!state}
      title={state?.title}
      description={state?.description ?? ""}
      confirmText={state?.confirmText ?? t("common.delete")}
      danger={state?.danger ?? true}
      onConfirm={() => state?.onConfirm()}
      onClose={() => setState(null)}
    />
  );

  return { confirm, confirmNode };
}
