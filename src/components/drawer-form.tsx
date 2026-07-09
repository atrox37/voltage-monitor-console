import type { ReactNode } from "react";
import { VtButton } from "@/components/vt-button";

/** 列表页抽屉 label 宽度 */
export const FORM_LABEL_WIDTH = "120px";

/** 详情页二级抽屉 / 告警规则 / 通知模板等长标签 */
export const DETAIL_FORM_LABEL_WIDTH = "168px";

/** 详情页物模型、标签等短标签 */
export const DETAIL_COMPACT_LABEL_WIDTH = "88px";

/** 常规抽屉表单项：label 在左，控件在右 */
export const drawerFormItemProps = {
  layout: "horizontal" as const,
  labelCol: { flex: FORM_LABEL_WIDTH },
  wrapperCol: { flex: 1 },
  className: "mb-3",
};

/** 列表/复合区域：label 在上，内容占满宽度（如主题、总招） */
export const drawerBlockFormItemProps = {
  layout: "vertical" as const,
  className: "mb-3",
};

/** 抽屉 body：顶部固定区 + 下方表单滚动 */
export const drawerScrollBodyStyles = {
  body: {
    padding: 0,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden" as const,
  },
} as const;

export const drawerStickySectionClass =
  "shrink-0 space-y-3 border-b border-panel-border px-6 py-3";

export const drawerScrollSectionClass = "min-h-0 flex-1 overflow-y-auto px-6 py-3";

/**
 * 二级 Drawer 应作为一级 Drawer 的 children 渲染（Ant Design 嵌套抽屉），
 * 点击遮罩时先关闭二级，再次点击才关闭一级。
 */
export const nestedDrawerProps = {
  destroyOnHidden: true,
  styles: { body: { paddingTop: 8 } },
} as const;

/** 详情页嵌套抽屉：label 在左，控件在右 */
export const detailFormItemProps = {
  layout: "horizontal" as const,
  labelCol: { flex: DETAIL_FORM_LABEL_WIDTH },
  wrapperCol: { flex: 1 },
  className: "mb-3",
};

/** 详情页物模型、标签等：较短 label 宽度 */
export const detailCompactFormItemProps = {
  layout: "horizontal" as const,
  labelCol: { flex: DETAIL_COMPACT_LABEL_WIDTH },
  wrapperCol: { flex: 1 },
  className: "mb-3",
};

/** 详情页列表/复合区域：label 在上，内容占满宽度 */
export const detailBlockFormItemProps = {
  layout: "vertical" as const,
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
        <VtButton
          key={a.key}
          type={a.type ?? "default"}
          danger={a.danger}
          disabled={a.disabled}
          onClick={a.onClick}
        >
          {a.label}
        </VtButton>
      ))}
    </div>
  );
}
