import { useEffect, useState } from "react";

import { Drawer, Form, Input, InputNumber, Select } from 'antd';
import { VtButton } from '@/components/vt-button';
import { detailCompactFormItemProps, selectFormItemProps } from "@/components/drawer-form";
import { OptionToggle } from "@/components/option-toggle";
import { EnumEditor } from "@/features/products/components/enum-editor";
import { useTranslation } from "@/i18n";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";
import {
  DATA_UNITS,
  dataTypeSelectOptions,
  defaultPropertyValueType,
  normalizePropertyType,
} from "@/lib/data-types";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { requiredInputRule, requiredSelectRule, validateEnumData } from "@/lib/form-validation";

import type { EnumDataItem, PropertyTagMetadata, SimplePropertyMetadata } from "@/types/api/metadata";

type PropertyFormValues = { id: string; name: string; tagId: string; dataType: string };

export function PropertyDrawer({
  open,
  value,
  onClose,
  onSave,
  tags,
}: {
  open: boolean;
  value: SimplePropertyMetadata | null;
  onClose: () => void;
  onSave: (p: SimplePropertyMetadata) => void;
  tags: PropertyTagMetadata[];
}) {
  const { t, locale } = useTranslation();
  const ph = useFormPlaceholder();
  const { dataTypes } = useDeviceEdit();
  const [formApi] = Form.useForm<PropertyFormValues>();
  const [draft, setDraft] = useState<SimplePropertyMetadata>({ id: "", name: "" });

  const propertyRwOptions = [
    { label: t("devices.thingModel.propertyRw.read"), value: "read" },
    { label: t("devices.thingModel.propertyRw.write"), value: "write" },
    { label: t("devices.thingModel.propertyRw.readwrite"), value: "readwrite" },
    { label: t("devices.thingModel.propertyRw.none"), value: "none" },
  ];

  useEffect(() => {
    if (!open || !value) {
      formApi.resetFields();
      return;
    }
    const normalizedType = normalizePropertyType(value.valueType?.type);
    const next: SimplePropertyMetadata = {
      ...value,
      rw: value.rw ?? "none",
      valueType: value.valueType
        ? {
            ...value.valueType,
            type: normalizedType,
            extra: value.valueType.extra ?? defaultPropertyValueType(normalizedType).extra,
          }
        : defaultPropertyValueType("string"),
    };
    setDraft(next);
    formApi.setFieldsValue({
      id: next.id,
      name: next.name,
      tagId: next.tagId ?? "",
      dataType: normalizedType,
    });
  }, [formApi, open, value]);

  const propType = normalizePropertyType(draft.valueType?.type);
  const isNew = !value?.id;

  const handleSave = async () => {
    formApi.setFields([{ name: "enumData", errors: [] }]);
    try {
      await formApi.validateFields(["id", "name", "tagId", "dataType"]);
    } catch {
      return;
    }
    if (propType === "enum") {
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
      title={isNew ? t("common.addProperty") : t("common.editProperty")}
      size={520}
      destroyOnHidden
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
            placeholder={ph.input(t("common.identifier"))}
            disabled={!isNew && !draft.create}
            onChange={(e) => {
              setDraft({ ...draft, id: e.target.value });
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
            placeholder={ph.input(t("common.name"))}
            onChange={(e) => {
              setDraft({ ...draft, name: e.target.value });
              formApi.setFieldValue("name", e.target.value);
            }}
          />
        </Form.Item>
        <Form.Item
          name="dataType"
          label={t("common.dataType")}
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
            value={propType}
            onChange={(v) => {
              formApi.setFields([{ name: "enumData", errors: [] }]);
              const dataType = String(v ?? "string");
              setDraft({
                ...draft,
                valueType: defaultPropertyValueType(dataType),
              });
              formApi.setFieldValue("dataType", dataType);
            }}
            options={dataTypeSelectOptions(t, dataTypes)}
          />
        </Form.Item>
        {propType === "number" && (
          <Form.Item label={t("common.decimalPlaces")} {...detailCompactFormItemProps}>
            <InputNumber
              className="w-full"
              min={0}
              max={10}
              value={draft.valueType?.extra?.point ?? 1}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  valueType: {
                    ...(draft.valueType ?? defaultPropertyValueType("number")),
                    extra: { ...(draft.valueType?.extra ?? {}), point: Number(v) || 0 },
                  },
                })
              }
            />
          </Form.Item>
        )}
        {propType === "enum" && (
          <Form.Item name="enumData" label={t("common.enumValues")} {...detailCompactFormItemProps}>
            <EnumEditor
              data={(draft.valueType?.extra?.enumData as EnumDataItem[]) ?? []}
              onChange={(enumData) => {
                formApi.setFields([{ name: "enumData", errors: [] }]);
                setDraft({
                  ...draft,
                  valueType: {
                    ...(draft.valueType ?? { type: "enum" }),
                    extra: { ...(draft.valueType?.extra ?? {}), enumData },
                  },
                });
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
            onChange={(v) =>
              setDraft({
                ...draft,
                valueType: {
                  ...(draft.valueType ?? defaultPropertyValueType(propType)),
                  unit: String(v ?? ""),
                },
              })
            }
            options={DATA_UNITS.filter((u) => u.unit).map((u) => ({
              label: `${locale === "zh-CN" ? u.zh ?? u.en : u.en}${u.unit ? ` (${u.unit})` : ""}`,
              value: u.unit,
            }))}
            placeholder={ph.select(t("common.unit"))}
          />
        </Form.Item>
        <Form.Item label={t("common.readWrite")} {...detailCompactFormItemProps}>
          <OptionToggle
            value={draft.rw ?? "readwrite"}
            onChange={(v) => setDraft({ ...draft, rw: v })}
            options={propertyRwOptions}
          />
        </Form.Item>
        <Form.Item
          name="tagId"
          label={t("common.group")}
          required
          {...detailCompactFormItemProps}
          {...selectFormItemProps}
          rules={[requiredSelectRule(t, t("common.group"))]}
        >
          <Select
            className="vt-select-control"
            classNames={{ popup: { root: "vt-select-popup" } }}
            style={{ width: "100%" }}
            value={draft.tagId || undefined}
            placeholder={ph.select(t("common.group"))}
            onChange={(v) => {
              const tagId = String(v ?? "");
              setDraft({ ...draft, tagId });
              formApi.setFieldValue("tagId", tagId);
            }}
            options={tags.map((tag) => ({ label: tag.name, value: tag.id }))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
