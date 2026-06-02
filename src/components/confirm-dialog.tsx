import { type ReactNode, useCallback, useState } from "react";
import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

export function ConfirmDialog({
  open,
  title = "确认操作",
  description,
  confirmText = "删除",
  cancelText = "取消",
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
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={() => {
        onConfirm();
        onClose();
      }}
      okText={confirmText}
      cancelText={cancelText}
      okButtonProps={{ danger }}
      centered
      destroyOnClose
    >
      <div className="flex gap-3 py-2">
        <ExclamationCircleOutlined className={`text-lg ${danger ? "text-[#da2d2c]" : "text-[#ff6900]"}`} />
        <div className="text-sm text-[var(--text-secondary)]">{description}</div>
      </div>
    </Modal>
  );
}

export function useConfirm() {
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
      confirmText={state?.confirmText}
      danger={state?.danger ?? true}
      onConfirm={() => state?.onConfirm()}
      onClose={() => setState(null)}
    />
  );

  return { confirm, confirmNode };
}
