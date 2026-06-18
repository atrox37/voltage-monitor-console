import { useEffect, useState } from "react";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Select } from "antd";
import { detailFormItemProps } from "@/components/drawer-form";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useTranslation } from "@/i18n";
import { requiredInputRule, requiredSelectRule } from "@/lib/form-validation";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";
import { useProductTypeLabel } from "@/features/products/lib/product-type-i18n";
import type { TagModel } from "@/types/api/metadata";
import { DescField } from "../components/desc-field";

export function TabInfo() {
  const ph = useFormPlaceholder();
  const { t } = useTranslation();
  const getProductTypeLabel = useProductTypeLabel();
  const { product, orgNodes, updateProduct, updateMetadata } = useProductEdit();
  const [tagFormApi] = Form.useForm<{ tagKey: string; tagName: string; optional: string }>();
  const [tagDraft, setTagDraft] = useState<{ tag: TagModel; index: number } | null>(null);

  useEffect(() => {
    if (!tagDraft) {
      tagFormApi.resetFields();
      return;
    }
    tagFormApi.setFieldsValue({
      tagKey: tagDraft.tag.tagKey ?? "",
      tagName: tagDraft.tag.tagName ?? "",
      optional: tagDraft.tag.optional ? "1" : "0",
    });
  }, [tagDraft, tagFormApi]);

  if (!product) return null;

  const tagRequiredOptions = [
    { label: t("common.yes"), value: "0" },
    { label: t("common.no"), value: "1" },
  ];

  const setField = <K extends "name" | "sn">(k: K, v: string) => {
    updateProduct({ [k]: v });
  };

  const closeTag = (i: number) => {
    updateMetadata((m) => ({
      ...m,
      tags: (m.tags ?? []).filter((_, idx) => idx !== i),
    }));
  };

  const saveTag = async () => {
    if (!tagDraft) return;
    try {
      await tagFormApi.validateFields();
    } catch {
      return;
    }
    updateMetadata((m) => {
      const tags = [...(m.tags ?? [])];
      if (tagDraft.index < 0) tags.push(tagDraft.tag);
      else tags[tagDraft.index] = tagDraft.tag;
      return { ...m, tags };
    });
    setTagDraft(null);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto">
      <div className="text-sm font-semibold text-foreground">{product.name}</div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
        <DescField label={t("common.productName")}>
          <Input
            value={product.name}
            placeholder={ph.input(t("common.productName"))}
            onChange={(e) => setField("name", e.target.value)}
          />
        </DescField>
        <DescField label={t("common.productModel")}>
          <Input
            value={product.sn}
            placeholder={ph.input(t("common.productModel"))}
            onChange={(e) => setField("sn", e.target.value)}
          />
        </DescField>
        <DescField label={t("common.productType")}>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
              product.type === "gateway"
                ? "bg-primary/15 text-primary"
                : product.type === "device"
                  ? "bg-status-online/15 text-status-online"
                  : "bg-status-warning/15 text-status-warning"
            }`}
          >
            {getProductTypeLabel(product.type)}
          </span>
        </DescField>
        <DescField label={t("common.creator")}>
          <span className="text-text-secondary">{product.creator}</span>
        </DescField>
        <DescField label={t("common.orgBelong")}>
          <OrgTreeSelect
            nodes={orgNodes}
            value={product.orgId}
            placeholder={ph.select(t("common.orgBelong"))}
            onChange={(v) => updateProduct({ orgId: v })}
          />
        </DescField>
        <DescField label={t("common.updateTime")}>
          <span className="font-mono text-xs text-text-secondary">{product.updateTime}</span>
        </DescField>
      </div>

      <div>
        <div className="mb-2 text-sm text-foreground">{t("devices.products.detail.info.tags")}</div>
        <div className="flex flex-wrap items-center gap-2">
          {(product.metadata.tags ?? []).map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded border border-panel-border bg-panel/40 px-2 py-0.5 text-xs text-text-secondary"
            >
              <button
                type="button"
                onClick={() => setTagDraft({ tag: { ...item }, index: i })}
                className="hover:text-primary"
              >
                {item.tagName}
              </button>
              <button
                type="button"
                onClick={() => closeTag(i)}
                className="text-text-muted hover:text-status-critical"
              >
                <CloseOutlined className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() =>
              setTagDraft({ tag: { tagKey: "", tagName: "", optional: false }, index: -1 })
            }
            className="vt-detail-outline-btn border-dashed px-2 py-0.5 text-xs"
          >
            <PlusOutlined className="h-3 w-3" /> {t("devices.products.detail.info.addTag")}
          </button>
        </div>
      </div>

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!tagDraft}
        onClose={() => {
          setTagDraft(null);
          tagFormApi.resetFields();
        }}
        title={tagDraft && tagDraft.index < 0 ? t("common.addTag") : t("common.editTag")}
        size={480}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={() => setTagDraft(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="primary" size="small" onClick={() => void saveTag()}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        {tagDraft && (
          <Form form={tagFormApi} layout="horizontal">
            <Form.Item
              name="tagKey"
              label="Key"
              required
              {...detailFormItemProps}
              rules={[requiredInputRule(t, "Key")]}
            >
              <Input
                value={tagDraft.tag.tagKey ?? ""}
                placeholder={ph.input("Key")}
                onChange={(e) => {
                  setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, tagKey: e.target.value } });
                  tagFormApi.setFieldValue("tagKey", e.target.value);
                }}
              />
            </Form.Item>
            <Form.Item
              name="tagName"
              label={t("common.name")}
              required
              {...detailFormItemProps}
              rules={[requiredInputRule(t, t("common.name"))]}
            >
              <Input
                value={tagDraft.tag.tagName}
                placeholder={ph.input(t("common.name"))}
                onChange={(e) => {
                  setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, tagName: e.target.value } });
                  tagFormApi.setFieldValue("tagName", e.target.value);
                }}
              />
            </Form.Item>
            <Form.Item
              name="optional"
              label={t("common.required")}
              required
              {...detailFormItemProps}
              rules={[requiredSelectRule(t, t("common.required"))]}
            >
              <Select
                className="vt-select-control"
                classNames={{ popup: { root: "vt-select-popup" } }}
                style={{ width: "100%" }}
                placeholder={ph.select(t("common.required"))}
                value={tagDraft.tag.optional ? "1" : "0"}
                options={tagRequiredOptions}
                onChange={(v) => {
                  setTagDraft({
                    ...tagDraft,
                    tag: { ...tagDraft.tag, optional: v === "1" },
                  });
                  tagFormApi.setFieldValue("optional", v);
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </div>
  );
}
