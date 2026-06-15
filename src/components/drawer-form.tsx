import type { ReactNode } from "react";
import { Button } from "antd";

export const drawerFormItemProps = {
  layout: "horizontal" as const,
  labelCol: { flex: "88px" },
  wrapperCol: { flex: 1 },
  className: "mb-3",
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
