import { useEffect, useState } from "react";
import { Button, Checkbox, Drawer, Form, Input } from "antd";
import { ArgParamDrawer } from "@/features/products/components/arg-param-drawer";
import { ArgSection } from "@/features/products/pages/product-detail/components/arg-section";
import { showError } from "@/lib/api-message";
import { useTranslation } from "@/i18n";
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
  const [local, setLocal] = useState<MetadataFunctionDraft | null>(draft);
  const [argTarget, setArgTarget] = useState<{
    kind: "inputs" | "outputs";
    index: number;
    initial: SimpleFunctionParam | null;
  } | null>(null);

  useEffect(() => {
    setLocal(draft);
    if (!draft) setArgTarget(null);
  }, [draft]);

  const saveArgParam = (param: SimpleFunctionParam) => {
    if (!local || !argTarget) return;
    const list = [...(local.data[argTarget.kind] ?? [])];
    if (argTarget.index < 0) list.push(param);
    else list[argTarget.index] = param;
    setLocal({ ...local, data: { ...local.data, [argTarget.kind]: list } });
    setArgTarget(null);
  };

  const handleSave = () => {
    if (!local) return;
    if (!local.data.id.trim() || !local.data.name.trim()) {
      showError(t("common.requiredHint"));
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
        onClose={onClose}
        title={isNew ? t("common.addFunction") : t("common.editFunction")}
        size={560}
        mask={!argTarget}
        keyboard={!argTarget}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="primary" size="small" onClick={handleSave}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        {local && (
          <>
            <Form.Item
              label={t("common.identifier")}
              required
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <Input
                value={local.data.id}
                disabled={!isNew && !local.data.create}
                onChange={(e) =>
                  setLocal({ ...local, data: { ...local.data, id: e.target.value } })
                }
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
              <Input
                value={local.data.name}
                onChange={(e) =>
                  setLocal({ ...local, data: { ...local.data, name: e.target.value } })
                }
              />
            </Form.Item>
            <Form.Item
              label={t("common.asyncLabel")}
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
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
          </>
        )}
      </Drawer>

      <ArgParamDrawer
        open={!!argTarget}
        initial={argTarget?.initial ?? null}
        dataTypes={dataTypes}
        onClose={() => setArgTarget(null)}
        onSave={saveArgParam}
      />
    </>
  );
}
