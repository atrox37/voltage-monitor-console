import type { ReactNode } from "react";
import { Button } from "antd";

/** 表单 label 区固定宽度（中英文长标签） */
export const FORM_LABEL_WIDTH = "120px";

export const drawerFormItemProps = {
  layout: "horizontal" as const,
  labelCol: { flex: FORM_LABEL_WIDTH },
  wrapperCol: { flex: 1 },
  className: "mb-3",
};

/** 详情页抽屉内 Form.Item 与 drawerFormItemProps 一致 */
export const detailFormItemProps = drawerFormItemProps;

export function drawerFooter(
  actions: Array<{
    key: string;
    label: ReactNode;
    onClick: () => void;
    type?: "default" | "primary";
    disabled?: boolean;
    danger?: boolean;
  }>,
) {
  return (
    <div className="flex justify-end gap-2">
      {actions.map((a) => (
        <Button
          key={a.key}
          size="small"
          type={a.type ?? "default"}
          danger={a.danger}
          disabled={a.disabled}
          onClick={a.onClick}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
