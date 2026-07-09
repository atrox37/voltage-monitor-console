import { useEffect, useMemo, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Drawer, Form, Input, InputNumber, Select } from 'antd';
import { VtButton } from '@/components/vt-button';
import type { ColumnsType } from "antd/es/table";
import { DetailTable } from "@/components/detail-table";
import {
  MetadataFunctionDrawer,
  type MetadataFunctionDraft,
} from "@/components/metadata-function-drawer";
import { OptionToggle } from "@/components/option-toggle";
import { RowActionBtn, RowActionGroup } from "@/components/row-action-buttons";
import { useTranslation } from "@/i18n";
import {
  DATA_UNITS,
  dataTypeSelectOptions,
  defaultPropertyValueType,
  normalizePropertyType,
  propertyTypeLabel,
  unitLabel,
} from "@/lib/data-types";
import { detailCompactFormItemProps, selectFormItemProps } from "@/components/drawer-form";
import { requiredInputRule, requiredSelectRule, validateEnumData } from "@/lib/form-validation";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { vtActionColumn } from "@/lib/table-utils";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";
import { EnumEditor } from "@/features/products/components/enum-editor";
import type {
  EnumDataItem,
  PropertyTagMetadata,
  SimpleFunctionMetadata,
  SimplePropertyMetadata,
} from "@/types/api/metadata";

export function TabMeta() {
  const { t, locale } = useTranslation();
  const ph = useFormPlaceholder();
  const { product, updateMetadata, dataTypes } = useProductEdit();
  const [propFormApi] = Form.useForm<{ id: string; name: string; tagId: string; dataType: string }>();
  const [renameFormApi] = Form.useForm<{ name: string }>();
  const [newTagFormApi] = Form.useForm<{ name: string }>();
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [sub, setSub] = useState<"prop" | "func">("prop");
  const [selectedTagId, setSelectedTagId] = useState<string>("-1");
  const [renameTag, setRenameTag] = useState<{ index: number; name: string } | null>(null);
  const [propDraft, setPropDraft] = useState<{ data: SimplePropertyMetadata; index: number } | null>(
    null,
  );
  const [funcDraft, setFuncDraft] = useState<MetadataFunctionDraft | null>(null);

  useEffect(() => {
    if (!propDraft) {
      propFormApi.resetFields();
      return;
    }
    propFormApi.setFieldsValue({
      id: propDraft.data.id,
      name: propDraft.data.name,
      tagId: propDraft.data.tagId ?? "",
      dataType: normalizePropertyType(propDraft.data.valueType?.type),
    });
  }, [propDraft, propFormApi]);

  useEffect(() => {
    if (!renameTag) {
      renameFormApi.resetFields();
      return;
    }
    renameFormApi.setFieldsValue({ name: renameTag.name });
  }, [renameTag, renameFormApi]);

  if (!product) return null;

  const propertyTags: PropertyTagMetadata[] = product.metadata.propertyTags ?? [];
  const filteredProps = useMemo(() => {
    const all = product.metadata.properties ?? [];
    if (selectedTagId === "-1") return all;
    return all.filter((p) => p.tagId === selectedTagId);
  }, [product.metadata.properties, selectedTagId]);

  const propertyRwOptions = [
    { label: t("devices.thingModel.propertyRw.read"), value: "read" },
    { label: t("devices.thingModel.propertyRw.write"), value: "write" },
    { label: t("devices.thingModel.propertyRw.readwrite"), value: "readwrite" },
    { label: t("devices.thingModel.propertyRw.none"), value: "none" },
  ];

  const closeMetaDrawers = () => {
    setPropDraft(null);
    setFuncDraft(null);
    setRenameTag(null);
    setNewTagOpen(false);
    setNewTagName("");
    propFormApi.resetFields();
    renameFormApi.resetFields();
    newTagFormApi.resetFields();
  };

  const switchSubTab = (key: "prop" | "func") => {
    if (sub === key) return;
    closeMetaDrawers();
    setSub(key);
  };

  const addPropertyTag = (name: string) => {
    const id = `t${Date.now()}`;
    updateMetadata((m) => ({
      ...m,
      propertyTags: [...(m.propertyTags ?? []), { id, name: name.trim() }],
    }));
    setSelectedTagId(id);
    setNewTagOpen(false);
    setNewTagOpen(false);
    setNewTagName("");
    newTagFormApi.resetFields();
  };

  const saveProp = async () => {
    if (!propDraft) return;
    propFormApi.setFields([{ name: "enumData", errors: [] }]);
    try {
      await propFormApi.validateFields(["id", "name", "tagId", "dataType"]);
    } catch {
      return;
    }
    const currentPropType = normalizePropertyType(propDraft.data.valueType?.type);
    if (currentPropType === "enum") {
      const enumErr = validateEnumData(
        t,
        (propDraft.data.valueType?.extra?.enumData as EnumDataItem[]) ?? [],
      );
      if (enumErr) {
        propFormApi.setFields([{ name: "enumData", errors: [enumErr] }]);
        return;
      }
    }
    updateMetadata((m) => {
      const props = [...(m.properties ?? [])];
      if (propDraft.index < 0) props.push(propDraft.data);
      else props[propDraft.index] = propDraft.data;
      return { ...m, properties: props };
    });
    setPropDraft(null);
  };

  const saveFunc = (draft: MetadataFunctionDraft) => {
    updateMetadata((m) => {
      const fns = [...(m.functions ?? [])];
      if (draft.index < 0) fns.push(draft.data);
      else fns[draft.index] = draft.data;
      return { ...m, functions: fns };
    });
    setFuncDraft(null);
  };

  const propType = normalizePropertyType(propDraft?.data.valueType?.type);

  const newPropertyDraft = (): SimplePropertyMetadata => ({
    id: "",
    name: "",
    rw: "none",
    create: true,
    tagId: selectedTagId !== "-1" ? selectedTagId : undefined,
    valueType: defaultPropertyValueType("string"),
  });

  const propColumns: ColumnsType<SimplePropertyMetadata> = [
    { key: "name", title: t("common.name"), dataIndex: "name" },
    {
      key: "id",
      title: t("common.identifier"),
      dataIndex: "id",
      width: 160,
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "type",
      title: t("common.type"),
      width: 128,
      render: (_, p) => (
        <span className="text-text-secondary">{propertyTypeLabel(t, p.valueType?.type)}</span>
      ),
    },
    {
      key: "unit",
      title: t("common.unit"),
      width: 120,
      render: (_, p) => (
        <span className="whitespace-nowrap text-text-secondary">
          {p.valueType?.unit ? unitLabel(p.valueType.unit) : "?"}
        </span>
      ),
    },
    {
      key: "tag",
      title: t("common.group"),
      width: 128,
      render: (_, p) => (
        <span className="text-text-secondary">
          {propertyTags.find((tag) => tag.id === p.tagId)?.name ?? t("common.none")}
        </span>
      ),
    },
    vtActionColumn<SimplePropertyMetadata>(
      t("common.actions"),
      (p) => {
        const original = product.metadata.properties!.findIndex((x) => x.id === p.id);
        return (
          <RowActionGroup>
            <RowActionBtn onClick={() => setPropDraft({ data: { ...p }, index: original })}>
              {t("common.edit")}
            </RowActionBtn>
            <RowActionBtn
              danger
              confirm={{
                description: t("devices.products.detail.meta.confirmDeleteProperty", { name: p.name }),
              }}
              onClick={() =>
                updateMetadata((m) => ({
                  ...m,
                  properties: (m.properties ?? []).filter((_, idx) => idx !== original),
                }))
              }
            >
              {t("common.delete")}
            </RowActionBtn>
          </RowActionGroup>
        );
      },
      160,
    ),
  ];

  const fnColumns: ColumnsType<SimpleFunctionMetadata> = [
    { key: "name", title: t("common.name"), dataIndex: "name" },
    {
      key: "id",
      title: t("common.identifier"),
      dataIndex: "id",
      width: 160,
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "async",
      title: t("common.asyncLabel"),
      width: 96,
      render: (_, f) => <span className="text-text-secondary">{f.async ? t("common.yes") : t("common.no")}</span>,
    },
    {
      key: "io",
      title: t("common.inOutParams"),
      width: 128,
      render: (_, f) => (
        <span className="text-text-secondary">
          {t("devices.thingModel.paramInOut", {
            in: f.inputs?.length ?? 0,
            out: f.outputs?.length ?? 0,
          })}
        </span>
      ),
    },
    vtActionColumn<SimpleFunctionMetadata>(
      t("common.actions"),
      (f) => {
        const index = product.metadata.functions!.findIndex((x) => x.id === f.id);
        return (
          <RowActionGroup>
            <RowActionBtn
              onClick={() => setFuncDraft({ data: JSON.parse(JSON.stringify(f)), index })}
            >
              {t("common.edit")}
            </RowActionBtn>
            <RowActionBtn
              danger
              confirm={{
                description: t("devices.products.detail.meta.confirmDeleteFunction", {
                  name: f.name,
                }),
              }}
              onClick={() =>
                updateMetadata((m) => ({
                  ...m,
                  functions: (m.functions ?? []).filter((_, idx) => idx !== index),
                }))
              }
            >
              {t("common.delete")}
            </RowActionBtn>
          </RowActionGroup>
        );
      },
      160,
    ),
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center justify-between border-b border-panel-border/60">
        <div className="flex gap-1">
          {(
            [
              ["prop", t("devices.products.detail.meta.subTabProperty")],
              ["func", t("devices.products.detail.meta.subTabFunction")],
            ] as const
          ).map(([key, label]) => {
            const active = sub === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => switchSubTab(key)}
                className={`relative px-4 py-1.5 text-xs ${active ? "text-primary" : "text-text-secondary"}`}
              >
                {label}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() =>
            sub === "prop"
              ? setPropDraft({ data: newPropertyDraft(), index: -1 })
              : setFuncDraft({
                  data: { id: "", name: "", async: false, inputs: [], outputs: [], create: true },
                  index: -1,
                })
          }
          className="vt-detail-action-btn mb-1 px-2.5 py-1 text-xs"
        >
          <PlusOutlined />{" "}
          {sub === "prop"
            ? t("devices.products.detail.meta.addProperty")
            : t("devices.products.detail.meta.addFunction")}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        {sub === "prop" ? (
          <DetailTable rowKey="id" columns={propColumns} dataSource={filteredProps} locale={{ emptyText: t("common.noData") }} />
        ) : (
          <DetailTable
            rowKey="id"
            columns={fnColumns}
            dataSource={product.metadata.functions ?? []}
            locale={{ emptyText: t("common.noData") }}
          />
        )}
      </div>

      {sub === "prop" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-panel-border/60 pt-3">
          <button
            type="button"
            onClick={() => setSelectedTagId("-1")}
            className={`rounded border px-2 py-0.5 text-xs ${
              selectedTagId === "-1"
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-panel-border text-text-secondary hover:border-primary/40"
            }`}
          >
            {t("common.all")}
          </button>
          {propertyTags.map((tag, i) => (
            <button
              key={tag.id}
              type="button"
              onClick={() =>
                selectedTagId === tag.id
                  ? setRenameTag({ index: i, name: tag.name })
                  : setSelectedTagId(tag.id)
              }
              className={`rounded border px-2 py-0.5 text-xs ${
                selectedTagId === tag.id
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-panel-border text-text-secondary hover:border-primary/40"
              }`}
            >
              {tag.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setNewTagName("");
              newTagFormApi.setFieldsValue({ name: "" });
              setNewTagOpen(true);
            }}
            className="vt-detail-outline-btn border-dashed px-2 py-0.5 text-xs"
          >
            <PlusOutlined className="h-3 w-3" /> {t("common.newGroup")}
          </button>
        </div>
      )}

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!propDraft}
        onClose={() => {
          setPropDraft(null);
          propFormApi.resetFields();
        }}
        title={propDraft && propDraft.index < 0 ? t("common.addProperty") : t("common.editProperty")}
        size={520}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton type="default" onClick={() => setPropDraft(null)}>
              {t("common.cancel")}
            </VtButton>
            <VtButton type="primary" onClick={() => void saveProp()}>
              {t("common.save")}
            </VtButton>
          </div>
        }
      >
        {propDraft && (
          <Form form={propFormApi} layout="horizontal">
            <Form.Item
              name="id"
              label={t("common.identifier")}
              required
              {...detailCompactFormItemProps}
              rules={[requiredInputRule(t, t("common.identifier"))]}
            >
              <Input
                value={propDraft.data.id}
                placeholder={ph.input(t("common.identifier"))}
                disabled={!propDraft.data.create}
                onChange={(e) => {
                  setPropDraft({ ...propDraft, data: { ...propDraft.data, id: e.target.value } });
                  propFormApi.setFieldValue("id", e.target.value);
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
                value={propDraft.data.name}
                placeholder={ph.input(t("common.name"))}
                onChange={(e) => {
                  setPropDraft({ ...propDraft, data: { ...propDraft.data, name: e.target.value } });
                  propFormApi.setFieldValue("name", e.target.value);
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
                  propFormApi.setFields([{ name: "enumData", errors: [] }]);
                  const dataType = String(v ?? "string");
                  setPropDraft({
                    ...propDraft,
                    data: {
                      ...propDraft.data,
                      valueType: defaultPropertyValueType(dataType),
                    },
                  });
                  propFormApi.setFieldValue("dataType", dataType);
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
                  value={propDraft.data.valueType?.extra?.point ?? 1}
                  onChange={(v) =>
                    setPropDraft({
                      ...propDraft,
                      data: {
                        ...propDraft.data,
                        valueType: {
                          ...(propDraft.data.valueType ?? defaultPropertyValueType("number")),
                          extra: { ...(propDraft.data.valueType?.extra ?? {}), point: Number(v) || 0 },
                        },
                      },
                    })
                  }
                />
              </Form.Item>
            )}
            {propType === "enum" && (
              <Form.Item name="enumData" label={t("common.enumValues")} {...detailCompactFormItemProps}>
                <EnumEditor
                  data={(propDraft.data.valueType?.extra?.enumData as EnumDataItem[]) ?? []}
                  onChange={(enumData) => {
                    propFormApi.setFields([{ name: "enumData", errors: [] }]);
                    setPropDraft({
                      ...propDraft,
                      data: {
                        ...propDraft.data,
                        valueType: {
                          ...(propDraft.data.valueType ?? { type: "enum" }),
                          extra: { ...(propDraft.data.valueType?.extra ?? {}), enumData },
                        },
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
                value={propDraft.data.valueType?.unit || undefined}
                onChange={(v) =>
                  setPropDraft({
                    ...propDraft,
                    data: {
                      ...propDraft.data,
                      valueType: {
                        ...(propDraft.data.valueType ?? defaultPropertyValueType(propType)),
                        unit: String(v ?? ""),
                      },
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
                value={propDraft.data.rw ?? "readwrite"}
                onChange={(v) => setPropDraft({ ...propDraft, data: { ...propDraft.data, rw: v } })}
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
                value={propDraft.data.tagId || undefined}
                placeholder={ph.select(t("common.group"))}
                onChange={(v) => {
                  const tagId = String(v ?? "");
                  setPropDraft({
                    ...propDraft,
                    data: { ...propDraft.data, tagId },
                  });
                  propFormApi.setFieldValue("tagId", tagId);
                }}
                options={propertyTags.map((tag) => ({ label: tag.name, value: tag.id }))}
              />
            </Form.Item>
          </Form>
        )}
      </Drawer>

      <MetadataFunctionDrawer
        open={!!funcDraft}
        draft={funcDraft}
        dataTypes={dataTypes}
        onClose={() => setFuncDraft(null)}
        onSave={saveFunc}
      />

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!renameTag}
        onClose={() => {
          setRenameTag(null);
          renameFormApi.resetFields();
        }}
        title={t("common.editGroup")}
        size={400}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton
              type="default"
              onClick={() => {
                if (!renameTag) return;
                updateMetadata((m) => {
                  const tagId = (m.propertyTags ?? [])[renameTag.index]?.id;
                  return {
                    ...m,
                    propertyTags: (m.propertyTags ?? []).filter((_, i) => i !== renameTag.index),
                    properties: (m.properties ?? []).map((p) =>
                      p.tagId === tagId ? { ...p, tagId: undefined } : p,
                    ),
                  };
                });
                setSelectedTagId("-1");
                setRenameTag(null);
              }}
            >
              {t("common.deleteGroup")}
            </VtButton>
            <VtButton
              type="primary"
              onClick={async () => {
                if (!renameTag) return;
                try {
                  await renameFormApi.validateFields();
                } catch {
                  return;
                }
                updateMetadata((m) => ({
                  ...m,
                  propertyTags: (m.propertyTags ?? []).map((tag, i) =>
                    i === renameTag.index ? { ...tag, name: renameTag.name } : tag,
                  ),
                }));
                setRenameTag(null);
              }}
            >
              {t("common.save")}
            </VtButton>
          </div>
        }
      >
        {renameTag && (
          <Form form={renameFormApi} layout="horizontal">
            <Form.Item
              name="name"
              label={t("common.name")}
              required
              {...detailCompactFormItemProps}
              rules={[requiredInputRule(t, t("common.name"))]}
            >
              <Input
                autoFocus
                value={renameTag.name}
                placeholder={ph.input(t("common.name"))}
                onChange={(e) => {
                  setRenameTag({ ...renameTag, name: e.target.value });
                  renameFormApi.setFieldValue("name", e.target.value);
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Drawer>

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={newTagOpen}
        onClose={() => {
          setNewTagOpen(false);
          setNewTagName("");
          newTagFormApi.resetFields();
        }}
        title={t("common.newGroup")}
        size={400}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton
              type="default"
              onClick={() => {
                setNewTagOpen(false);
                setNewTagName("");
                newTagFormApi.resetFields();
              }}
            >
              {t("common.cancel")}
            </VtButton>
            <VtButton
              type="primary"
              onClick={async () => {
                try {
                  const values = await newTagFormApi.validateFields();
                  addPropertyTag(values.name);
                } catch {
                  // validation errors shown on fields
                }
              }}
            >
              {t("common.save")}
            </VtButton>
          </div>
        }
      >
        <Form form={newTagFormApi} layout="horizontal">
          <Form.Item
            name="name"
            label={t("common.name")}
            required
            {...detailCompactFormItemProps}
            rules={[requiredInputRule(t, t("common.name"))]}
          >
            <Input
              autoFocus
              placeholder={ph.input(t("common.name"))}
              value={newTagName}
              onChange={(e) => {
                setNewTagName(e.target.value);
                newTagFormApi.setFieldValue("name", e.target.value);
              }}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
