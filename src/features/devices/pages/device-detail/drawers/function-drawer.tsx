import { useEffect, useState } from "react";

import { Button, Checkbox, Drawer, Form, Input } from "antd";
import { detailFormItemProps } from "@/components/drawer-form";
import { useTranslation } from "@/i18n";
import { requiredInputRule } from "@/lib/form-validation";

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
  const [formApi] = Form.useForm<{ id: string; name: string }>();
  const [draft, setDraft] = useState<SimpleFunctionMetadata>({ id: "", name: "" });

  useEffect(() => {
    if (!value) {
      formApi.resetFields();
      return;
    }
    const next = { ...value, inputs: value.inputs ?? [], outputs: value.outputs ?? [] };
    setDraft(next);
    formApi.setFieldsValue({ id: next.id, name: next.name });
  }, [formApi, value]);

  const handleSave = async () => {
    try {
      await formApi.validateFields();
    } catch {
      return;
    }
    onSave(draft);
  };

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
          <Button type="primary" size="small" onClick={() => void handleSave()}>
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <Form form={formApi} layout="horizontal">
        <Form.Item
          name="id"
          label={t("common.identifier")}
          required
          {...detailFormItemProps}
          rules={[requiredInputRule(t, t("common.identifier"))]}
        >
          <Input
            value={draft.id}
            disabled={!!value?.id}
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
          {...detailFormItemProps}
          rules={[requiredInputRule(t, t("common.name"))]}
        >
          <Input
            value={draft.name}
            onChange={(e) => {
              setDraft({ ...draft, name: e.target.value });
              formApi.setFieldValue("name", e.target.value);
            }}
          />
        </Form.Item>
        <Form.Item label={t("common.asyncLabel")} {...detailFormItemProps}>
          <Checkbox
            checked={!!draft.async}
            onChange={(e) => setDraft({ ...draft, async: e.target.checked })}
          >
            {t("common.asyncExec")}
          </Checkbox>
        </Form.Item>
      </Form>
    </Drawer>
  );
}
