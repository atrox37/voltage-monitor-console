import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Drawer, Form, Input } from 'antd';
import { VtButton } from '@/components/vt-button';
import { detailFormItemProps } from "@/components/drawer-form";
import { useTranslation } from "@/i18n";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";
import type { SimpleTreeMetadata } from "@/types/api/metadata";
import { TreeNode } from "../components/tree-node";

export function TabTree() {
  const { t } = useTranslation();
  const { product, updateMetadata } = useProductEdit();
  const [renameOf, setRenameOf] = useState<{ id: string; name: string } | null>(null);

  if (!product) return null;

  const newId = () => `n${Math.floor(Math.random() * 1e6)}`;

  const append = (parentId: string | null) => {
    updateMetadata((m) => {
      const trees = JSON.parse(JSON.stringify(m.trees ?? [])) as SimpleTreeMetadata[];
      const node = { id: newId(), name: t("common.defaultNodeName"), children: [] };
      if (parentId === null) {
        trees.push(node);
        return { ...m, trees };
      }
      const walk = (nodes: SimpleTreeMetadata[]) => {
        for (const current of nodes) {
          if (current.id === parentId) {
            (current.children ??= []).push(node);
            return true;
          }
          if (current.children && walk(current.children)) return true;
        }
        return false;
      };
      walk(trees);
      return { ...m, trees };
    });
  };

  const remove = (id: string) => {
    updateMetadata((m) => {
      const filter = (nodes: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        nodes
          .filter((n) => n.id !== id)
          .map((n) => ({ ...n, children: n.children ? filter(n.children) : [] }));
      return { ...m, trees: filter(m.trees ?? []) };
    });
  };

  const rename = () => {
    if (!renameOf) return;
    updateMetadata((m) => {
      const walk = (nodes: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        nodes.map((n) =>
          n.id === renameOf.id
            ? { ...n, name: renameOf.name }
            : { ...n, children: n.children ? walk(n.children) : [] },
        );
      return { ...m, trees: walk(m.trees ?? []) };
    });
    setRenameOf(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center justify-between border-b border-panel-border/60 pb-2">
        <span className="text-xs font-medium text-foreground">{t("common.structurePath")}</span>
        <button type="button" onClick={() => append(null)} className="vt-detail-action-btn px-2.5 py-1 text-xs">
          <PlusOutlined /> {t("common.addRootNode")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {(product.metadata.trees ?? []).length === 0 ? (
            <div className="py-10 text-center text-xs text-text-muted">{t("common.noData")}</div>
          ) : (
            <ul className="text-sm">
              {(product.metadata.trees ?? []).map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  onAppend={(id) => append(id)}
                  onRename={(item) => setRenameOf({ id: item.id, name: item.name })}
                  onDelete={(item) => remove(item.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!renameOf}
        onClose={() => setRenameOf(null)}
        title={t("common.renameNode")}
        size={400}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton type="default" onClick={() => setRenameOf(null)}>
              {t("common.cancel")}
            </VtButton>
            <VtButton type="primary" onClick={rename}>
              {t("common.save")}
            </VtButton>
          </div>
        }
      >
        {renameOf && (
          <Form.Item label={t("common.nodeNamePrompt")} required {...detailFormItemProps}>
            <Input autoFocus value={renameOf.name} onChange={(e) => setRenameOf({ ...renameOf, name: e.target.value })} />
          </Form.Item>
        )}
      </Drawer>
    </div>
  );
}
