import { useState } from "react";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Form } from "antd";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";
import { PRODUCT_TYPE_LABEL } from "@/features/products/lib/product-mappers";

import type { TagModel } from "@/types/api/metadata";

import { DescField } from "../components/desc-field";

export function TabInfo() {
  const { product, orgNodes, updateProduct, updateMetadata } = useProductEdit();
  const [tagDraft, setTagDraft] = useState<{ tag: TagModel; index: number } | null>(null);
  if (!product) return null;

  const setField = <K extends "name" | "sn">(k: K, v: string) => {
    updateProduct({ [k]: v });
  };
  const closeTag = (i: number) => {
    updateMetadata((m) => ({
      ...m,
      tags: (m.tags ?? []).filter((_, idx) => idx !== i),
    }));
  };
  const saveTag = () => {
    if (!tagDraft || !tagDraft.tag.tagName.trim()) return;
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
        <DescField label="产品名称">
          <input
            className="w-full"
            value={product.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </DescField>
        <DescField label="产品型号">
          <input
            className="w-full"
            value={product.sn}
            onChange={(e) => setField("sn", e.target.value)}
          />
        </DescField>
        <DescField label="产品类型">
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
              product.type === "gateway"
                ? "bg-primary/15 text-primary"
                : product.type === "device"
                  ? "bg-status-online/15 text-status-online"
                  : "bg-status-warning/15 text-status-warning"
            }`}
          >
            {PRODUCT_TYPE_LABEL[product.type]}
          </span>
        </DescField>
        <DescField label="创建人">
          <span className="text-text-secondary">{product.creator}</span>
        </DescField>
        <DescField label="所属机构">
          <OrgTreeSelect
            nodes={orgNodes}
            value={product.orgId}
            onChange={(v) => updateProduct({ orgId: v })}
          />
        </DescField>
        <DescField label="更新时间">
          <span className="font-mono text-xs text-text-secondary">{product.updateTime}</span>
        </DescField>
      </div>

      <div>
        <div className="mb-2 text-sm text-foreground">标签</div>
        <div className="flex flex-wrap items-center gap-2">
          {(product.metadata.tags ?? []).map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded border border-panel-border bg-panel/40 px-2 py-0.5 text-xs text-text-secondary"
            >
              <button
                onClick={() => setTagDraft({ tag: { ...t }, index: i })}
                className="hover:text-primary"
              >
                {t.tagName}
              </button>
              <button
                onClick={() => closeTag(i)}
                className="text-text-muted hover:text-status-critical"
              >
                <CloseOutlined className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() =>
              setTagDraft({ tag: { tagKey: "", tagName: "", optional: false }, index: -1 })
            }
            className="vt-detail-outline-btn border-dashed px-2 py-0.5 text-xs"
          >
            <PlusOutlined className="h-3 w-3" /> 新增标签
          </button>
        </div>
      </div>

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!tagDraft}
        onClose={() => setTagDraft(null)}
        title={tagDraft && tagDraft.index < 0 ? "新增标签" : "编辑标签"}
        size={420}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={() => setTagDraft(null)}>
              取消
            </Button>
            <Button type="primary" size="small" onClick={saveTag}>
              保存
            </Button>
          </div>
        }
      >
        {tagDraft && (
          <>
            <Form.Item
              label="Key"
              required
              layout="horizontal"
              labelCol={{ flex: "72px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <input
                className="w-full"
                value={tagDraft.tag.tagKey ?? ""}
                onChange={(e) =>
                  setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, tagKey: e.target.value } })
                }
              />
            </Form.Item>
            <Form.Item
              label="名称"
              required
              layout="horizontal"
              labelCol={{ flex: "72px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <input
                className="w-full"
                value={tagDraft.tag.tagName}
                onChange={(e) =>
                  setTagDraft({ ...tagDraft, tag: { ...tagDraft.tag, tagName: e.target.value } })
                }
              />
            </Form.Item>
            <Form.Item
              label="必填"
              layout="horizontal"
              labelCol={{ flex: "72px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <select
                className="vt-select-control"
                value={tagDraft.tag.optional ? "1" : "0"}
                onChange={(e) =>
                  setTagDraft({
                    ...tagDraft,
                    tag: { ...tagDraft.tag, optional: e.target.value === "1" },
                  })
                }
              >
                <option value="0">是</option>
                <option value="1">否</option>
              </select>
            </Form.Item>
          </>
        )}
      </Drawer>
    </div>
  );
}
