import { useEffect, useState } from "react";

import { Button, Drawer, Form, Input, Select } from "antd";
import { useTranslation } from "@/i18n";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";

import type { PropertyTagMetadata, SimplePropertyMetadata } from "@/types/api/metadata";
import { DATA_UNITS } from "@/lib/data-types";

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
  const { t } = useTranslation();
  const { dataTypes } = useDeviceEdit();
  const [draft, setDraft] = useState<SimplePropertyMetadata>({ id: "", name: "" });
  useEffect(() => {
    if (value) setDraft({ ...value, valueType: value.valueType ?? { type: "double" } });
  }, [value]);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={value?.id ? t("common.editProperty") : t("common.addProperty")}
      width={480}
      destroyOnHidden
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="default" size="small" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={() => draft.name && draft.id && onSave(draft)}
          >
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <Form.Item
        label={t("common.identifier")}
        required
        layout="horizontal"
        labelCol={{ flex: "72px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Input
          value={draft.id}
          disabled={!!value?.id}
          onChange={(e) => setDraft({ ...draft, id: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label={t("common.name")}
        required
        layout="horizontal"
        labelCol={{ flex: "72px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </Form.Item>
      <Form.Item
        label={t("common.type")}
        layout="horizontal"
        labelCol={{ flex: "72px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Select
          className="vt-select-control"
          classNames={{ popup: { root: "vt-select-popup" } }}
          style={{ width: "100%" }}
          value={draft.valueType?.type ?? "double"}
          onChange={(v) =>
            setDraft({
              ...draft,
              valueType: { ...(draft.valueType ?? { type: "double" }), type: String(v ?? "") },
            })
          }
          options={dataTypes.map((d) => ({ label: d.name, value: d.id }))}
        />
      </Form.Item>
      <Form.Item
        label={t("common.unit")}
        layout="horizontal"
        labelCol={{ flex: "72px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Select
          className="vt-select-control"
          classNames={{ popup: { root: "vt-select-popup" } }}
          style={{ width: "100%" }}
          allowClear
          value={draft.valueType?.unit || undefined}
          onChange={(v) =>
            setDraft({
              ...draft,
              valueType: { ...(draft.valueType ?? { type: "double" }), unit: String(v ?? "") },
            })
          }
          options={DATA_UNITS.filter((u) => u.unit).map((u) => ({
            label: `${u.zh ?? u.en}${u.unit ? ` (${u.unit})` : ""}`,
            value: u.unit,
          }))}
          placeholder={t("common.none")}
        />
      </Form.Item>
      <Form.Item
        label={t("common.tag")}
        layout="horizontal"
        labelCol={{ flex: "72px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Select
          className="vt-select-control"
          classNames={{ popup: { root: "vt-select-popup" } }}
          style={{ width: "100%" }}
          allowClear
          value={draft.tagId || undefined}
          onChange={(v) => setDraft({ ...draft, tagId: String(v ?? "") || undefined })}
          options={tags.map((tag) => ({ label: tag.name, value: tag.id }))}
          placeholder={t("common.ungrouped")}
        />
      </Form.Item>
    </Drawer>
  );
}
