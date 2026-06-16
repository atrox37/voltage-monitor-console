import { useMemo, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, InputNumber, Select } from "antd";
import { OptionToggle } from "@/components/option-toggle";
import { DetailTable } from "@/components/detail-table";
import type { ColumnsType } from "antd/es/table";
import { RowActionBtn, RowActionGroup } from "@/components/row-action-buttons";
import { vtActionColumn } from "@/lib/table-utils";
import { useConfirm } from "@/components/confirm-dialog";
import { showError } from "@/lib/api-message";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";
import {
  DATA_UNITS,
  PROPERTY_RW,
  defaultPropertyValueType,
  unitLabel,
} from "@/lib/data-types";
import { EnumEditor } from "@/features/products/components/enum-editor";

import type {
  SimplePropertyMetadata,
  SimpleFunctionMetadata,
  PropertyTagMetadata,
  EnumDataItem,
} from "@/types/api/metadata";

import {
  MetadataFunctionDrawer,
  type MetadataFunctionDraft,
} from "@/components/metadata-function-drawer";

export function TabMeta() {
  const { product, updateMetadata, dataTypes } = useProductEdit();
  const { confirm, confirmNode } = useConfirm();
  const [sub, setSub] = useState<"prop" | "func">("prop");

  /* —— 属性分组(propertyTags) 过滤 —— */
  const [selectedTagId, setSelectedTagId] = useState<string>("-1"); // -1 = 全部
  const [renameTag, setRenameTag] = useState<{ index: number; name: string } | null>(null);

  const propertyTags: PropertyTagMetadata[] = product?.metadata.propertyTags ?? [];
  const filteredProps = useMemo(() => {
    const all = product?.metadata.properties ?? [];
    if (selectedTagId === "-1") return all;
    return all.filter((p) => p.tagId === selectedTagId);
  }, [product?.metadata.properties, selectedTagId]);

  const addPropertyTag = () => {
    const id = `t${Date.now()}`;
    updateMetadata((m) => ({
      ...m,
      propertyTags: [...(m.propertyTags ?? []), { id, name: "新分组" }],
    }));
  };

  /* —— 属性 / 功能 抽屉草稿 —— */
  const [propDraft, setPropDraft] = useState<{
    data: SimplePropertyMetadata;
    index: number;
  } | null>(null);
  const [funcDraft, setFuncDraft] = useState<MetadataFunctionDraft | null>(null);

  const saveProp = () => {
    if (!propDraft || !propDraft.data.name.trim() || !propDraft.data.id.trim()) return;
    updateMetadata((m) => {
      const props = [...(m.properties ?? [])];
      if (propDraft.index < 0) props.push(propDraft.data);
      else props[propDraft.index] = propDraft.data;
      return { ...m, properties: props };
    });
    setPropDraft(null);
  };
  const saveFunc = (draft: MetadataFunctionDraft) => {
    if (!draft.data.name.trim() || !draft.data.id.trim()) {
      showError("请填写标识和名称");
      return;
    }
    updateMetadata((m) => {
      const fns = [...(m.functions ?? [])];
      if (draft.index < 0) fns.push(draft.data);
      else fns[draft.index] = draft.data;
      return { ...m, functions: fns };
    });
    setFuncDraft(null);
  };

  const propType = propDraft?.data.valueType?.type ?? "string";

  if (!product) return null;

  const newPropertyDraft = (): SimplePropertyMetadata => ({
    id: "",
    name: "",
    rw: "none",
    create: true,
    tagId: selectedTagId !== "-1" ? selectedTagId : undefined,
    valueType: defaultPropertyValueType("string"),
  });

  const propColumns: ColumnsType<SimplePropertyMetadata> = [
    { key: "name", title: "名称", dataIndex: "name" },
    {
      key: "id",
      title: "标识",
      dataIndex: "id",
      width: 160,
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "type",
      title: "类型",
      width: 128,
      render: (_, p) => <span className="text-text-secondary">{p.valueType?.type ?? "—"}</span>,
    },
    {
      key: "unit",
      title: "单位",
      width: 120,
      render: (_, p) => (
        <span className="whitespace-nowrap text-text-secondary">
          {p.valueType?.unit ? unitLabel(p.valueType.unit) : "—"}
        </span>
      ),
    },
    {
      key: "tag",
      title: "分组",
      width: 128,
      render: (_, p) => (
        <span className="text-text-secondary">
          {propertyTags.find((tag) => tag.id === p.tagId)?.name ?? "—"}
        </span>
      ),
    },
    vtActionColumn<SimplePropertyMetadata>(
      "操作",
      (p) => {
        const original = product.metadata.properties!.findIndex((x) => x.id === p.id);
        return (
          <RowActionGroup>
            <RowActionBtn onClick={() => setPropDraft({ data: { ...p }, index: original })}>
              编辑
            </RowActionBtn>
            <RowActionBtn
              danger
              confirm={{
                description: (
                  <>
                    确定删除属性{" "}
                    <span className="font-semibold text-foreground">「{p.name}」</span> 吗？
                  </>
                ),
              }}
              onClick={() =>
                updateMetadata((m) => ({
                  ...m,
                  properties: (m.properties ?? []).filter((_, idx) => idx !== original),
                }))
              }
            >
              删除
            </RowActionBtn>
          </RowActionGroup>
        );
      },
      160,
    ),
  ];

  const fnColumns: ColumnsType<SimpleFunctionMetadata> = [
    { key: "name", title: "名称", dataIndex: "name" },
    {
      key: "id",
      title: "标识",
      dataIndex: "id",
      width: 160,
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "async",
      title: "异步",
      width: 96,
      render: (_, f) => <span className="text-text-secondary">{f.async ? "是" : "否"}</span>,
    },
    {
      key: "io",
      title: "入参/出参",
      width: 128,
      render: (_, f) => (
        <span className="text-text-secondary">
          {f.inputs?.length ?? 0} / {f.outputs?.length ?? 0}
        </span>
      ),
    },
    vtActionColumn<SimpleFunctionMetadata>(
      "操作",
      (f) => {
        const i = product.metadata.functions!.findIndex((x) => x.id === f.id);
        return (
          <RowActionGroup>
            <RowActionBtn
              onClick={() => setFuncDraft({ data: JSON.parse(JSON.stringify(f)), index: i })}
            >
              编辑
            </RowActionBtn>
            <RowActionBtn
              danger
              confirm={{
                description: (
                  <>
                    确定删除功能{" "}
                    <span className="font-semibold text-foreground">「{f.name}」</span> 吗？
                  </>
                ),
              }}
              onClick={() =>
                updateMetadata((m) => ({
                  ...m,
                  functions: (m.functions ?? []).filter((_, idx) => idx !== i),
                }))
              }
            >
              删除
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
              ["prop", "属性"],
              ["func", "功能"],
            ] as const
          ).map(([k, l]) => {
            const active = sub === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSub(k)}
                className={`relative px-4 py-1.5 text-xs ${active ? "text-primary" : "text-text-secondary"}`}
              >
                {l}
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
          <PlusOutlined /> 新增{sub === "prop" ? "属性" : "功能"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        {sub === "prop" ? (
          <DetailTable<SimplePropertyMetadata>
            rowKey="id"
            columns={propColumns}
            dataSource={filteredProps}
            locale={{ emptyText: "暂无数据" }}
          />
        ) : (
          <DetailTable<SimpleFunctionMetadata>
            rowKey="id"
            columns={fnColumns}
            dataSource={product.metadata.functions ?? []}
            locale={{ emptyText: "暂无数据" }}
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
            全部
          </button>
          {propertyTags.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                selectedTagId === t.id
                  ? setRenameTag({ index: i, name: t.name })
                  : setSelectedTagId(t.id)
              }
              className={`rounded border px-2 py-0.5 text-xs ${
                selectedTagId === t.id
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-panel-border text-text-secondary hover:border-primary/40"
              }`}
            >
              {t.name}
            </button>
          ))}
          <button
            type="button"
            onClick={addPropertyTag}
            className="vt-detail-outline-btn border-dashed px-2 py-0.5 text-xs"
          >
            <PlusOutlined className="h-3 w-3" /> 新建分组
          </button>
        </div>
      )}

      {/* ===== 属性抽屉 ===== */}
      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!propDraft}
        onClose={() => setPropDraft(null)}
        title={propDraft && propDraft.index < 0 ? "新增属性" : "编辑属性"}
        size={520}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={() => setPropDraft(null)}>
              取消
            </Button>
            <Button type="primary" size="small" onClick={saveProp}>
              保存
            </Button>
          </div>
        }
      >
        {propDraft && (
          <>
            <Form.Item
              label="属性标识"
              required
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <Input
                value={propDraft.data.id}
                disabled={!propDraft.data.create}
                onChange={(e) =>
                  setPropDraft({ ...propDraft, data: { ...propDraft.data, id: e.target.value } })
                }
              />
            </Form.Item>
            <Form.Item
              label="属性名称"
              required
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <Input
                value={propDraft.data.name}
                onChange={(e) =>
                  setPropDraft({ ...propDraft, data: { ...propDraft.data, name: e.target.value } })
                }
              />
            </Form.Item>
            <Form.Item
              label="数据类型"
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <Select
                className="vt-select-control"
                classNames={{ popup: { root: "vt-select-popup" } }}
                style={{ width: "100%" }}
                value={propType}
                onChange={(v) =>
                  setPropDraft({
                    ...propDraft,
                    data: {
                      ...propDraft.data,
                      valueType: defaultPropertyValueType(String(v ?? "string")),
                    },
                  })
                }
                options={dataTypes.map((t) => ({ label: t.name, value: t.id }))}
              />
            </Form.Item>
            {propType === "number" && (
              <Form.Item
                label="小数位"
                layout="horizontal"
                labelCol={{ flex: "120px" }}
                wrapperCol={{ flex: 1 }}
                className="mb-3"
              >
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
                          extra: {
                            ...(propDraft.data.valueType?.extra ?? {}),
                            point: Number(v) || 0,
                          },
                        },
                      },
                    })
                  }
                />
              </Form.Item>
            )}
            {propType === "enum" && (
              <Form.Item label="枚举值" layout="vertical" className="mb-3">
                <EnumEditor
                  data={(propDraft.data.valueType?.extra?.enumData as EnumDataItem[]) ?? []}
                  onChange={(enumData) =>
                    setPropDraft({
                      ...propDraft,
                      data: {
                        ...propDraft.data,
                        valueType: {
                          ...(propDraft.data.valueType ?? { type: "enum" }),
                          extra: { ...(propDraft.data.valueType?.extra ?? {}), enumData },
                        },
                      },
                    })
                  }
                />
              </Form.Item>
            )}
            <Form.Item
              label="单位"
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
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
                  label: `${u.zh ?? u.en}${u.unit ? ` (${u.unit})` : ""}`,
                  value: u.unit,
                }))}
                placeholder="无"
              />
            </Form.Item>
            <Form.Item
              label="读写"
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <OptionToggle
                value={propDraft.data.rw ?? "readwrite"}
                onChange={(v) => setPropDraft({ ...propDraft, data: { ...propDraft.data, rw: v } })}
                options={PROPERTY_RW.map((rw) => ({ label: rw.label, value: rw.value }))}
              />
            </Form.Item>
            <Form.Item
              label="所属分组"
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <Select
                className="vt-select-control"
                classNames={{ popup: { root: "vt-select-popup" } }}
                style={{ width: "100%" }}
                allowClear
                value={propDraft.data.tagId || undefined}
                onChange={(v) =>
                  setPropDraft({
                    ...propDraft,
                    data: { ...propDraft.data, tagId: String(v ?? "") || undefined },
                  })
                }
                options={propertyTags.map((t) => ({ label: t.name, value: t.id }))}
                placeholder="无"
              />
            </Form.Item>
          </>
        )}
      </Drawer>

      <MetadataFunctionDrawer
        open={!!funcDraft}
        draft={funcDraft}
        dataTypes={dataTypes}
        onClose={() => setFuncDraft(null)}
        onSave={saveFunc}
      />

      {/* 分组重命名 */}
      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!renameTag}
        onClose={() => setRenameTag(null)}
        title="编辑分组"
        size={400}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="default"
              size="small"
              onClick={() => {
                if (!renameTag) return;
                confirm({
                  description: (
                    <>
                      确定删除分组{" "}
                      <span className="font-semibold text-foreground">
                        「{propertyTags[renameTag.index]?.name}」
                      </span>{" "}
                      吗？该分组下的属性会被设为未分组。
                    </>
                  ),
                  onConfirm: () => {
                    updateMetadata((m) => {
                      const tagId = (m.propertyTags ?? [])[renameTag.index]?.id;
                      return {
                        ...m,
                        propertyTags: (m.propertyTags ?? []).filter(
                          (_, i) => i !== renameTag.index,
                        ),
                        properties: (m.properties ?? []).map((p) =>
                          p.tagId === tagId ? { ...p, tagId: undefined } : p,
                        ),
                      };
                    });
                    setSelectedTagId("-1");
                    setRenameTag(null);
                  },
                });
              }}
            >
              删除分组
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={() => {
                if (!renameTag || !renameTag.name.trim()) return;
                updateMetadata((m) => ({
                  ...m,
                  propertyTags: (m.propertyTags ?? []).map((t, i) =>
                    i === renameTag.index ? { ...t, name: renameTag.name } : t,
                  ),
                }));
                setRenameTag(null);
              }}
            >
              保存
            </Button>
          </div>
        }
      >
        {renameTag && (
          <Form.Item
            label="分组名称"
            required
            layout="horizontal"
            labelCol={{ flex: "120px" }}
            wrapperCol={{ flex: 1 }}
            className="mb-3"
          >
            <Input
              autoFocus
              value={renameTag.name}
              onChange={(e) => setRenameTag({ ...renameTag, name: e.target.value })}
            />
          </Form.Item>
        )}
      </Drawer>

      {confirmNode}
    </div>
  );
}
