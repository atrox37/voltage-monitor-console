import { type ReactNode } from "react";
import { Button, Drawer, Form, Input, InputNumber, Segmented, Select, Upload } from "antd";
import { LoadingOutlined, UploadOutlined } from "@ant-design/icons";

export function VtDrawer({
  open,
  onClose,
  title,
  width = 480,
  footer,
  children,
  hideOverlay = false,
  zIndex = 1000,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  footer?: ReactNode;
  children: ReactNode;
  hideOverlay?: boolean;
  zIndex?: number;
}) {
  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={width}
      zIndex={zIndex}
      mask={!hideOverlay}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
      footer={footer ? <div className="flex justify-end gap-2">{footer}</div> : undefined}
    >
      {children}
    </Drawer>
  );
}

export function VtField({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <Form.Item
      label={label}
      required={required}
      layout={full ? "vertical" : "horizontal"}
      labelCol={full ? undefined : { flex: "72px" }}
      wrapperCol={full ? undefined : { flex: 1 }}
      className="mb-3"
    >
      {children}
    </Form.Item>
  );
}

/** 兼容旧页面原生 input — 推荐逐步改用 antd Input */
export const vtInputCls = "vt-ant-input-bridge";

export const vtSelectCls = "vt-ant-select-bridge";

export function VtBtn({
  variant = "primary",
  children,
  ...rest
}: Omit<React.ComponentProps<typeof Button>, "variant"> & { variant?: "primary" | "ghost" }) {
  return (
    <Button
      type={variant === "primary" ? "primary" : "default"}
      size="small"
      {...rest}
    >
      {children}
    </Button>
  );
}

export function VtSegmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T; tone?: "critical" | "online" }[];
}) {
  return (
    <Segmented
      size="small"
      value={value}
      onChange={(v) => onChange(v as T)}
      options={options.map((o) => ({ label: o.label, value: o.value }))}
    />
  );
}

export function VtFilePickButton({
  onClick,
  loading,
  title,
}: {
  onClick: () => void;
  loading?: boolean;
  title?: string;
}) {
  return (
    <Button
      icon={loading ? <LoadingOutlined spin /> : <UploadOutlined />}
      onClick={onClick}
      disabled={loading}
      title={title}
    />
  );
}

/** 统一导出 antd 表单控件，供新页面直接使用 */
export { Input as VtInput, InputNumber as VtInputNumber, Select as VtSelect, Upload as VtUpload };
