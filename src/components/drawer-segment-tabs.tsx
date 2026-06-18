type DrawerSegmentTabOption = {
  value: string;
  label: string;
};

type DrawerSegmentTabsProps = {
  options: DrawerSegmentTabOption[];
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** 所有选项文字均使用白色（选中橙色底，未选中深色底） */
  allTextWhite?: boolean;
  className?: string;
};

/** 抽屉顶部类型切换条（网络组件 MQTT CLIENT / 通知配置渠道等） */
export function DrawerSegmentTabs({
  options,
  value,
  onChange,
  disabled,
  allTextWhite = false,
  className = "mb-5",
}: DrawerSegmentTabsProps) {
  return (
    <div className={className}>
      <div className="inline-flex overflow-hidden rounded-md border border-panel-border">
        {options.map((opt) => {
          const active = value === opt.value;
          const inactiveText = allTextWhite
            ? "text-white/75 hover:text-white"
            : "text-text-secondary hover:text-foreground";
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange?.(opt.value)}
              className={`px-4 py-1.5 text-xs transition ${
                active ? "bg-primary text-white" : `bg-panel ${inactiveText}`
              } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
