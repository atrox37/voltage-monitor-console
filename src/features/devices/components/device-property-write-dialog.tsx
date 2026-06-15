import { useEffect, useState } from "react";
import { Button, Drawer, Form, Input, InputNumber, Select } from "antd";
import type { SimplePropertyMetadata } from "@/types/api/metadata";
import type { EnumDataItem } from "@/types/api/metadata";

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
  const [value, setValue] = useState<string | number>("");

  useEffect(() => {
    if (!property) {
      setValue("");
      return;
    }
    const vt = property.valueType?.type ?? "string";
    if (vt === "enum") {
      const items = (property.valueType?.extra?.enumData as EnumDataItem[] | undefined) ?? [];
      setValue(items[0]?.key ?? "");
    } else if (["int", "long", "float", "double", "number"].includes(vt)) {
      setValue(0);
    } else {
      setValue("");
    }
  }, [property]);

  if (!property) return null;

  const vt = property.valueType?.type ?? "string";
  const enumData = (property.valueType?.extra?.enumData as EnumDataItem[] | undefined) ?? [];

  return (
    <Drawer
      open={open}
      title={`\u5199\u5165\uff1a${property.name}`}
      onClose={onClose}
      destroyOnHidden
      width={420}
      footer={
        <div className="flex justify-end gap-2">
          <Button size="small" onClick={onClose}>
            {"\u53d6\u6d88"}
          </Button>
          <Button type="primary" size="small" onClick={() => onSubmit(property.id, value)}>
            {"\u5199\u5165"}
          </Button>
        </div>
      }
    >
      <Form layout="vertical" className="mt-2">
        {vt === "string" && (
          <Form.Item label={property.name}>
            <Input value={String(value)} onChange={(e) => setValue(e.target.value)} />
          </Form.Item>
        )}
        {["int", "long", "float", "double", "number"].includes(vt) && (
          <Form.Item label={property.name}>
            <InputNumber
              className="w-full"
              value={Number(value) || 0}
              onChange={(n) => setValue(n ?? 0)}
            />
          </Form.Item>
        )}
        {vt === "enum" && (
          <Form.Item label={property.name}>
            <Select
              value={String(value)}
              onChange={(v) => setValue(v)}
              options={enumData.map((d) => ({ label: d.value, value: d.key }))}
            />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}
