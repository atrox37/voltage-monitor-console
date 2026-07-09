import { Button, type ButtonProps } from "antd";

/**
 * 与列表筛选区「查询 / 重置」同款按钮：默认 middle 尺寸（controlHeight 32），
 * 全站操作按钮统一使用此组件以保持文本、图标与 padding 一致。
 */
export function VtButton({ size = "middle", ...props }: ButtonProps) {
  return <Button size={size} {...props} />;
}
