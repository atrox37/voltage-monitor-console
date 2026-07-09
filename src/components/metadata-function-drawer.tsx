import { useEffect, useState } from "react";
import { Checkbox, Drawer, Form, Input } from 'antd';
import { VtButton } from '@/components/vt-button';
import { detailCompactFormItemProps } from "@/components/drawer-form";
import { ArgParamDrawer } from "@/features/products/components/arg-param-drawer";
import { ArgSection } from "@/features/products/pages/product-detail/components/arg-section";
import { useTranslation } from "@/i18n";
import { requiredInputRule } from "@/lib/form-validation";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import type { SimpleFunctionMetadata, SimpleFunctionParam } from "@/types/api/metadata";

export type MetadataFunctionDraft = {
  data: SimpleFunctionMetadata;
  index: number;
};

type MetadataFunctionDrawerProps = {
  open: boolean;
  draft: MetadataFunctionDraft | null;
  dataTypes: { id: string; name: string }[];
  onClose: () => void;
  onSave: (draft: MetadataFunctionDraft) => void;
};

export function MetadataFunctionDrawer({
  open,
  draft,
  dataTypes,
  onClose,
  onSave,
}: MetadataFunctionDrawerProps) {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const [formApi] = Form.useForm<{ id: string; name: string }>();
  const [local, setLocal] = useState<MetadataFunctionDraft | null>(draft);
  const [argTarget, setArgTarget] = useState<{
    kind: "inputs" | "outputs";
    index: number;
    initial: SimpleFunctionParam | null;
  } | null>(null);

  useEffect(() => {
    setLocal(draft);
    if (!draft) {
      setArgTarget(null);
      formApi.resetFields();
      return;
    }
    formApi.setFieldsValue({ id: draft.data.id, name: draft.data.name });
  }, [draft, formApi]);

  const saveArgParam = (param: SimpleFunctionParam) => {
    if (!local || !argTarget) return;
    const list = [...(local.data[argTarget.kind] ?? [])];
    if (argTarget.index < 0) list.push(param);
    else list[argTarget.index] = param;
    setLocal({ ...local, data: { ...local.data, [argTarget.kind]: list } });
    setArgTarget(null);
  };

  const handleClose = () => {
    setArgTarget(null);
    onClose();
  };

  const handleSave = async () => {
    if (!local) return;
    try {
      await formApi.validateFields();
    } catch {
      return;
    }
    onSave(local);
  };

  const isNew = (local?.index ?? -1) < 0;

  return (
    <>
      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={open}
        onClose={handleClose}
        title={isNew ? t("common.addFunction") : t("common.editFunction")}
        size={560}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton type="default" onClick={handleClose}>
              {t("common.cancel")}
            </VtButton>
            <VtButton type="primary" onClick={() => void handleSave()}>
              {t("common.save")}
            </VtButton>
          </div>
        }
      >
        {local && (
          <Form form={formApi} layout="horizontal">
            <Form.Item
              name="id"
              label={t("common.identifier")}
              required
              {...detailCompactFormItemProps}
              rules={[requiredInputRule(t, t("common.identifier"))]}
            >
              <Input
                value={local.data.id}
                placeholder={ph.input(t("common.identifier"))}
                disabled={!isNew && !local.data.create}
                onChange={(e) => {
                  setLocal({ ...local, data: { ...local.data, id: e.target.value } });
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
                value={local.data.name}
                placeholder={ph.input(t("common.name"))}
                onChange={(e) => {
                  setLocal({ ...local, data: { ...local.data, name: e.target.value } });
                  formApi.setFieldValue("name", e.target.value);
                }}
              />
            </Form.Item>
            <Form.Item label={t("common.asyncLabel")} {...detailCompactFormItemProps}>
              <Checkbox
                checked={!!local.data.async}
                onChange={(e) =>
                  setLocal({ ...local, data: { ...local.data, async: e.target.checked } })
                }
              >
                {t("common.asyncExec")}
              </Checkbox>
            </Form.Item>
            <ArgSection
              title={t("common.inputParams")}
              items={local.data.inputs ?? []}
              onAdd={() => setArgTarget({ kind: "inputs", index: -1, initial: null })}
              onEdit={(i) =>
                setArgTarget({
                  kind: "inputs",
                  index: i,
                  initial: { ...(local.data.inputs ?? [])[i] },
                })
              }
              onDelete={(i) => {
                const list = (local.data.inputs ?? []).filter((_, idx) => idx !== i);
                setLocal({ ...local, data: { ...local.data, inputs: list } });
              }}
            />
            <ArgSection
              title={t("common.outputResult")}
              items={local.data.outputs ?? []}
              onAdd={() => setArgTarget({ kind: "outputs", index: -1, initial: null })}
              onEdit={(i) =>
                setArgTarget({
                  kind: "outputs",
                  index: i,
                  initial: { ...(local.data.outputs ?? [])[i] },
                })
              }
              onDelete={(i) => {
                const list = (local.data.outputs ?? []).filter((_, idx) => idx !== i);
                setLocal({ ...local, data: { ...local.data, outputs: list } });
              }}
            />
          </Form>
        )}

        <ArgParamDrawer
          open={!!argTarget}
          initial={argTarget?.initial ?? null}
          dataTypes={dataTypes}
          onClose={() => setArgTarget(null)}
          onSave={saveArgParam}
        />
      </Drawer>
    </>
  );
}
