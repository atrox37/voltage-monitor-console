import { useEffect, useState } from "react";
import { Drawer, Form, Input, InputNumber, Select } from 'antd';
import { VtButton } from '@/components/vt-button';
import { detailCompactFormItemProps, selectFormItemProps } from "@/components/drawer-form";
import { useTranslation } from "@/i18n";
import {
  DATA_UNITS,
  dataTypeSelectOptions,
  defaultPropertyValueType,
  normalizePropertyType,
} from "@/lib/data-types";
import { requiredInputRule, requiredSelectRule, validateEnumData } from "@/lib/form-validation";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import type { EnumDataItem, SimpleFunctionParam } from "@/types/api/metadata";
import { EnumEditor } from "./enum-editor";

type ArgParamDrawerProps = {
  open: boolean;
  initial: SimpleFunctionParam | null;
  dataTypes: { id: string; name: string }[];
  onClose: () => void;
  onSave: (param: SimpleFunctionParam) => void;
};

const emptyParam = (): SimpleFunctionParam => ({
  id: "",
  name: "",
  valueType: defaultPropertyValueType("string"),
});

export function ArgParamDrawer({ open, initial, dataTypes, onClose, onSave }: ArgParamDrawerProps) {
  const { t, locale } = useTranslation();
  const ph = useFormPlaceholder();
  const [formApi] = Form.useForm<{ id: string; name: string; dataType: string }>();
  const [draft, setDraft] = useState<SimpleFunctionParam>(emptyParam);
  const valueType = normalizePropertyType(draft.valueType?.type);

  useEffect(() => {
    if (!open) return;
    formApi.setFields([{ name: "enumData", errors: [] }]);
    if (initial) {
      const normalized = normalizePropertyType(initial.valueType?.type);
      const next = {
        ...initial,
        valueType: {
          ...(initial.valueType ?? defaultPropertyValueType("string")),
          type: normalized,
        },
      };
      setDraft(next);
      formApi.setFieldsValue({ id: next.id, name: next.name, dataType: normalized });
    } else {
      const next = emptyParam();
      setDraft(next);
      formApi.setFieldsValue({ id: "", name: "", dataType: "string" });
    }
  }, [formApi, open, initial]);

  const handleSave = async () => {
    formApi.setFields([{ name: "enumData", errors: [] }]);
    try {
      await formApi.validateFields(["id", "name", "dataType"]);
    } catch {
      return;
    }
    if (valueType === "enum") {
      const enumErr = validateEnumData(
        t,
        (draft.valueType?.extra?.enumData as EnumDataItem[]) ?? [],
      );
      if (enumErr) {
        formApi.setFields([{ name: "enumData", errors: [enumErr] }]);
        return;
      }
    }
    onSave(draft);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("common.paramInfo")}
      size={420}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <div className="flex justify-end gap-2">
          <VtButton type="default" onClick={onClose}>
            {t("common.cancel")}
          </VtButton>
          <VtButton type="primary" onClick={() => void handleSave()}>
            {t("common.save")}
          </VtButton>
        </div>
      }
    >
      <Form form={formApi} layout="horizontal">
        <Form.Item
          name="id"
          label={t("common.identifier")}
          required
          {...detailCompactFormItemProps}
          rules={[requiredInputRule(t, t("common.identifier"))]}
        >
          <Input
            value={draft.id}
            onChange={(e) => {
              setDraft((d) => ({ ...d, id: e.target.value }));
              formApi.setFieldValue("id", e.target.value);
            }}
          />
        </Form.Item>
        <Form.Item
          name="name"
          label={t("common.name")}
          required
          {...detailCompactFormItemProps}
          rules={[requiredInputRule(t, t("common.name"))]}
        >
          <Input
            value={draft.name}
            onChange={(e) => {
              setDraft((d) => ({ ...d, name: e.target.value }));
              formApi.setFieldValue("name", e.target.value);
            }}
          />
        </Form.Item>
        <Form.Item
          name="dataType"
          label={t("common.type")}
          required
          {...detailCompactFormItemProps}
          {...selectFormItemProps}
          rules={[requiredSelectRule(t, t("common.dataType"))]}
        >
          <Select
            className="vt-select-control"
            classNames={{ popup: { root: "vt-select-popup" } }}
            style={{ width: "100%" }}
            placeholder={ph.select(t("common.dataType"))}
            value={valueType}
            onChange={(v) => {
              formApi.setFields([{ name: "enumData", errors: [] }]);
              const dataType = String(v ?? "string");
              setDraft((d) => ({ ...d, valueType: defaultPropertyValueType(dataType) }));
              formApi.setFieldValue("dataType", dataType);
            }}
            options={dataTypeSelectOptions(t, dataTypes)}
          />
        </Form.Item>
        {valueType === "number" && (
          <Form.Item label={t("common.decimalPlaces")} {...detailCompactFormItemProps}>
            <InputNumber
              className="w-full"
              min={0}
              max={10}
              value={draft.valueType?.extra?.point ?? 1}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  valueType: {
                    ...(d.valueType ?? defaultPropertyValueType("number")),
                    extra: { ...(d.valueType?.extra ?? {}), point: Number(v) || 0 },
                  },
                }))
              }
            />
          </Form.Item>
        )}
        {valueType === "enum" && (
          <Form.Item name="enumData" label={t("common.enumValues")} {...detailCompactFormItemProps}>
            <EnumEditor
              data={(draft.valueType?.extra?.enumData as EnumDataItem[]) ?? []}
              onChange={(enumData) => {
                formApi.setFields([{ name: "enumData", errors: [] }]);
                setDraft((d) => ({
                  ...d,
                  valueType: {
                    ...(d.valueType ?? { type: "enum" }),
                    extra: { ...(d.valueType?.extra ?? {}), enumData },
                  },
                }));
              }}
            />
          </Form.Item>
        )}
        <Form.Item label={t("common.unit")} {...detailCompactFormItemProps}>
          <Select
            className="vt-select-control"
            classNames={{ popup: { root: "vt-select-popup" } }}
            style={{ width: "100%" }}
            allowClear
            value={draft.valueType?.unit || undefined}
            placeholder={ph.select(t("common.unit"))}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                valueType: { ...(d.valueType ?? defaultPropertyValueType(valueType)), unit: String(v ?? "") },
              }))
            }
            options={DATA_UNITS.filter((u) => u.unit).map((u) => ({
              label: `${locale === "zh-CN" ? u.zh ?? u.en : u.en}${u.unit ? ` (${u.unit})` : ""}`,
              value: u.unit,
            }))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
