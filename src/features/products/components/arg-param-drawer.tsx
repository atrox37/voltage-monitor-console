import { Button, Drawer, Form, Input, InputNumber, Select } from "antd";
import { useEffect, useState } from "react";
import { DATA_UNITS, defaultPropertyValueType } from "@/lib/data-types";
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

/** 功能参数二次抽屉：独立草稿状态，避免嵌套 Drawer 焦点陷阱导致无法输入 */
export function ArgParamDrawer({ open, initial, dataTypes, onClose, onSave }: ArgParamDrawerProps) {
  const [draft, setDraft] = useState<SimpleFunctionParam>(emptyParam);
  const valueType = draft.valueType?.type ?? "string";

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDraft({
        ...initial,
        valueType: initial.valueType ?? defaultPropertyValueType("string"),
      });
    } else {
      setDraft(emptyParam());
    }
  }, [open, initial]);

  const canSave = draft.id.trim() && draft.name.trim();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="参数信息"
      size={420}
      zIndex={1100}
      mask={false}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="default" size="small" onClick={onClose}>
            取消
          </Button>
          <Button
            type="primary"
            size="small"
            disabled={!canSave}
            onClick={() => canSave && onSave(draft)}
          >
            保存
          </Button>
        </div>
      }
    >
      <Form.Item
        label="参数标识"
        required
        layout="horizontal"
        labelCol={{ flex: "120px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Input value={draft.id} onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))} />
      </Form.Item>
      <Form.Item
        label="参数名称"
        required
        layout="horizontal"
        labelCol={{ flex: "120px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
      </Form.Item>
      <Form.Item
        label="类型"
        layout="horizontal"
        labelCol={{ flex: "120px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Select
          className="vt-select-control"
          classNames={{ popup: { root: "vt-select-popup" } }}
          style={{ width: "100%" }}
          value={valueType}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              valueType: defaultPropertyValueType(String(v ?? "string")),
            }))
          }
          options={dataTypes.map((t) => ({ label: t.name, value: t.id }))}
        />
      </Form.Item>
      {valueType === "number" && (
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
        <Form.Item label="枚举值" layout="vertical" className="mb-3">
          <EnumEditor
            data={(draft.valueType?.extra?.enumData as EnumDataItem[]) ?? []}
            onChange={(enumData) =>
              setDraft((d) => ({
                ...d,
                valueType: {
                  ...(d.valueType ?? { type: "enum" }),
                  extra: { ...(d.valueType?.extra ?? {}), enumData },
                },
              }))
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
          value={draft.valueType?.unit || undefined}
          placeholder="无"
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              valueType: {
                ...(d.valueType ?? defaultPropertyValueType(valueType)),
                unit: String(v ?? ""),
              },
            }))
          }
          options={DATA_UNITS.filter((u) => u.unit).map((u) => ({
            label: `${u.zh ?? u.en}${u.unit ? ` (${u.unit})` : ""}`,
            value: u.unit,
          }))}
        />
      </Form.Item>
    </Drawer>
  );
}
