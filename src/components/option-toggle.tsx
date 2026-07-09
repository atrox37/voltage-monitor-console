import type { ReactNode } from "react";



export type OptionToggleItem<T extends string | number | boolean> = {

  label: ReactNode;

  value: T;

};



type ToggleLabelFn = (key: string, params?: Record<string, unknown>) => string;



/** 启用在前、禁用在后 */

export function enabledDisabledNumberOptions(

  t: ToggleLabelFn,

  keys: "common" | "status" = "common",

): OptionToggleItem<0 | 1>[] {

  const enabled = keys === "status" ? t("status.enabled") : t("common.enabled");

  const disabled = keys === "status" ? t("status.disabled") : t("common.disabled");

  return [

    { label: enabled, value: 1 },

    { label: disabled, value: 0 },

  ];

}



/** 开启在前、关闭在后 */

export function onOffNumberOptions(t: ToggleLabelFn): OptionToggleItem<0 | 1>[] {

  return [

    { label: t("common.on"), value: 1 },

    { label: t("common.off"), value: 0 },

  ];

}



/** 启用在前、关闭在后（规则工作状态） */

export function enableOffNumberOptions(t: ToggleLabelFn): OptionToggleItem<0 | 1>[] {

  return [

    { label: t("common.enable"), value: 1 },

    { label: t("common.off"), value: 0 },

  ];

}



/** 启用在前、禁用在后（字符串值） */

export function enabledDisabledStringOptions(

  t: ToggleLabelFn,

): OptionToggleItem<"enabled" | "disabled">[] {

  return [

    { label: t("common.enabled"), value: "enabled" },

    { label: t("common.disabled"), value: "disabled" },

  ];

}



/** 必填在前、非必填在后（0=必填 optional:false，1=非必填 optional:true） */

export function requiredOptionalNumberOptions(t: ToggleLabelFn): OptionToggleItem<0 | 1>[] {

  return [

    { label: t("common.required"), value: 0 },

    { label: t("common.notRequired"), value: 1 },

  ];

}



type OptionToggleProps<T extends string | number | boolean> = {

  value: T;

  onChange: (value: T) => void;

  options: OptionToggleItem<T>[];

  disabled?: boolean;

  className?: string;

};



export function OptionToggle<T extends string | number | boolean>({

  value,

  onChange,

  options,

  disabled,

  className = "",

}: OptionToggleProps<T>) {

  return (

    <div className={`vt-option-toggle ${className}`.trim()} role="group">

      {options.map((opt) => {

        const active = value === opt.value || String(value) === String(opt.value);

        return (

          <button

            key={String(opt.value)}

            type="button"

            disabled={disabled}

            aria-pressed={active}

            onClick={() => !disabled && onChange(opt.value)}

            className={`vt-option-toggle__btn${active ? " vt-option-toggle__btn--active" : ""}`}

          >

            {opt.label}

          </button>

        );

      })}

    </div>

  );

}


