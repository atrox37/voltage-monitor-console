import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input } from "antd";
import { useConfirm } from "@/components/confirm-dialog";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";

import type { SimpleTreeMetadata } from "@/types/api/metadata";

import { TreeNode } from "../components/tree-node";

export function TabTree() {
  const { product, updateMetadata } = useProductEdit();
  const { confirm, confirmNode } = useConfirm();
  const [renameOf, setRenameOf] = useState<{ id: string; name: string } | null>(null);

  if (!product) return null;

  const newId = () => `n${Math.floor(Math.random() * 1e6)}`;

  const append = (parentId: string | null) => {
    updateMetadata((m) => {
      const trees = JSON.parse(JSON.stringify(m.trees ?? [])) as SimpleTreeMetadata[];
      const node = { id: newId(), name: "节点", children: [] };
      if (parentId === null) {
        trees.push(node);
        return { ...m, trees };
      }
      const walk = (ns: SimpleTreeMetadata[]) => {
        for (const n of ns) {
          if (n.id === parentId) {
            (n.children ??= []).push(node);
            return true;
          }
          if (n.children && walk(n.children)) return true;
        }
        return false;
      };
      walk(trees);
      return { ...m, trees };
    });
  };
  const remove = (id: string) => {
    updateMetadata((m) => {
      const filter = (ns: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        ns
          .filter((n) => n.id !== id)
          .map((n) => ({ ...n, children: n.children ? filter(n.children) : [] }));
      return { ...m, trees: filter(m.trees ?? []) };
    });
  };
  const rename = () => {
    if (!renameOf) return;
    updateMetadata((m) => {
      const walk = (ns: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        ns.map((n) =>
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
        <span className="text-xs font-medium text-foreground">结构路径</span>
        <button
          type="button"
          onClick={() => append(null)}
          className="vt-detail-action-btn px-2.5 py-1 text-xs"
        >
          <PlusOutlined /> 新增根节点
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {(product.metadata.trees ?? []).length === 0 ? (
            <div className="py-10 text-center text-xs text-text-muted">暂无数据</div>
          ) : (
            <ul className="text-sm">
              {(product.metadata.trees ?? []).map((n) => (
                <TreeNode
                  key={n.id}
                  node={n}
                  onAppend={(id) => append(id)}
                  onRename={(node) => setRenameOf({ id: node.id, name: node.name })}
                  onDelete={(node) =>
                    confirm({
                      description: (
                        <>
                          确定要删除节点{" "}
                          <span className="font-semibold text-foreground">「{node.name}」</span>
                          {node.children?.length ? "（及其子节点）" : ""} 吗？
                        </>
                      ),
                      onConfirm: () => remove(node.id),
                    })
                  }
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
        title="重命名节点"
        size={400}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={() => setRenameOf(null)}>
              取消
            </Button>
            <Button type="primary" size="small" onClick={rename}>
              保存
            </Button>
          </div>
        }
      >
        {renameOf && (
          <Form.Item
            label="节点名称"
            required
            layout="horizontal"
            labelCol={{ flex: "72px" }}
            wrapperCol={{ flex: 1 }}
            className="mb-3"
          >
            <Input
              autoFocus
              value={renameOf.name}
              onChange={(e) => setRenameOf({ ...renameOf, name: e.target.value })}
            />
          </Form.Item>
        )}
      </Drawer>
      {confirmNode}
    </div>
  );
}
