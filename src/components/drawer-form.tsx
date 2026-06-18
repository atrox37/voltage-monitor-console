import type { ReactNode } from "react";
import { Button } from "antd";

/** 列表页抽屉 label 宽度 */
export const FORM_LABEL_WIDTH = "120px";

/** 详情页二级抽屉 / 告警规则 / 通知模板等长标签 */
export const DETAIL_FORM_LABEL_WIDTH = "168px";

export const drawerFormItemProps = {
  layout: "horizontal" as const,
  labelCol: { flex: FORM_LABEL_WIDTH },
  wrapperCol: { flex: 1 },
  className: "mb-3",
};

/** 详情页嵌套抽屉：更宽的 label，避免英文换行挤压 */
export const detailFormItemProps = {
  layout: "horizontal" as const,
  labelCol: { flex: DETAIL_FORM_LABEL_WIDTH },
  wrapperCol: { flex: 1 },
  className: "mb-3",
};

/**
 * Form.Item 包裹 Select 时，空字符串会被当作有效值，placeholder 不显示。
 * 与 Form 联用时在 Form.Item 上展开此配置。
 */
export const selectFormItemProps = {
  getValueProps: (value: string | number | null | undefined) => ({
    value: value === "" || value === null || value === undefined ? undefined : value,
  }),
};

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
