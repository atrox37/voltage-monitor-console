import { useEffect, useState } from "react";

import { Button, Checkbox, Drawer, Form, Input } from "antd";
import { useTranslation } from "@/i18n";

import type { SimpleFunctionMetadata } from "@/types/api/metadata";

export function FunctionDrawer({
  open,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  value: SimpleFunctionMetadata | null;
  onClose: () => void;
  onSave: (f: SimpleFunctionMetadata) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SimpleFunctionMetadata>({ id: "", name: "" });
  useEffect(() => {
    if (value) setDraft({ ...value, inputs: value.inputs ?? [], outputs: value.outputs ?? [] });
  }, [value]);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={value?.id ? t("common.editFunction") : t("common.addFunction")}
      size={480}
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
        labelCol={{ flex: "120px" }}
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
        labelCol={{ flex: "120px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </Form.Item>
      <Form.Item
        label={t("common.asyncLabel")}
        layout="horizontal"
        labelCol={{ flex: "120px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Checkbox
          checked={!!draft.async}
          onChange={(e) => setDraft({ ...draft, async: e.target.checked })}
        >
          {t("common.asyncExec")}
        </Checkbox>
      </Form.Item>
    </Drawer>
  );
}
