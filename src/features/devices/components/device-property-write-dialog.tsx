import { useEffect, useState } from "react";
import { Drawer, Form, Input, InputNumber, Select } from 'antd';
import { VtButton } from '@/components/vt-button';
import { detailFormItemProps, selectFormItemProps } from "@/components/drawer-form";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { requiredInputRule, requiredSelectRule } from "@/lib/form-validation";
import { useTranslation } from "@/i18n";
import type { EnumDataItem, SimplePropertyMetadata } from "@/types/api/metadata";

export function DevicePropertyWriteDialog({
  open,
  property,
  onClose,
  onSubmit,
}: {
  open: boolean;
  property: SimplePropertyMetadata | null;
  onClose: () => void;
  onSubmit: (propertyId: string, value: string | number) => void;
}) {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const [formApi] = Form.useForm<{ value: string | number }>();
  const [value, setValue] = useState<string | number>("");

  useEffect(() => {
    if (!open || !property) {
      setValue("");
      formApi.resetFields();
      return;
    }
    const vt = property.valueType?.type ?? "string";
    let initial: string | number = "";
    if (vt === "enum") {
      const items = (property.valueType?.extra?.enumData as EnumDataItem[] | undefined) ?? [];
      initial = items[0]?.key ?? "";
    } else if (["int", "long", "float", "double", "number"].includes(vt)) {
      initial = 0;
    }
    setValue(initial);
    formApi.setFieldsValue({ value: initial });
  }, [formApi, open, property]);

  if (!property) return null;

  const vt = property.valueType?.type ?? "string";
  const enumData = (property.valueType?.extra?.enumData as EnumDataItem[] | undefined) ?? [];
  const fieldLabel = property.name;

  const handleSubmit = async () => {
    try {
      await formApi.validateFields();
    } catch {
      return;
    }
    onSubmit(property.id, value);
  };

  return (
    <Drawer
      open={open}
      title={t("common.writeTo", { name: property.name })}
      onClose={onClose}
      destroyOnHidden
      size={420}
      footer={
        <div className="flex justify-end gap-2">
          <VtButton onClick={onClose}>
            {t("common.cancel")}
          </VtButton>
          <VtButton type="primary" onClick={() => void handleSubmit()}>
            {t("common.write")}
          </VtButton>
        </div>
      }
    >
      <Form form={formApi} layout="horizontal" className="mt-2">
        {vt === "string" && (
          <Form.Item
            name="value"
            label={fieldLabel}
            required
            {...detailFormItemProps}
            rules={[requiredInputRule(t, fieldLabel)]}
          >
            <Input
              value={String(value)}
              placeholder={ph.input(fieldLabel)}
              onChange={(e) => {
                setValue(e.target.value);
                formApi.setFieldValue("value", e.target.value);
              }}
            />
          </Form.Item>
        )}
        {["int", "long", "float", "double", "number"].includes(vt) && (
          <Form.Item
            name="value"
            label={fieldLabel}
            required
            {...detailFormItemProps}
            rules={[
              {
                validator: async (_, val) => {
                  if (val === "" || val === null || val === undefined) {
                    return Promise.reject(requiredInputRule(t, fieldLabel).message);
                  }
                },
              },
            ]}
          >
            <InputNumber
              className="w-full"
              value={Number(value) || 0}
              placeholder={ph.input(fieldLabel)}
              onChange={(n) => {
                const next = n ?? 0;
                setValue(next);
                formApi.setFieldValue("value", next);
              }}
            />
          </Form.Item>
        )}
        {vt === "enum" && (
          <Form.Item
            name="value"
            label={fieldLabel}
            required
            {...detailFormItemProps}
            {...selectFormItemProps}
            rules={[requiredSelectRule(t, fieldLabel)]}
          >
            <Select
              className="vt-select-control"
              classNames={{ popup: { root: "vt-select-popup" } }}
              style={{ width: "100%" }}
              value={String(value) || undefined}
              placeholder={ph.select(fieldLabel)}
              onChange={(v) => {
                setValue(v);
                formApi.setFieldValue("value", v);
              }}
              options={enumData.map((d) => ({ label: d.value, value: d.key }))}
            />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}
