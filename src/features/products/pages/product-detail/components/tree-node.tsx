import { useState } from "react";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons";

import type { SimpleTreeMetadata } from "@/types/api/metadata";

import { IconAction } from "./icon-action";

export function TreeNode({
  node,
  onAppend,
  onRename,
  onDelete,
  selectedId,
  onSelect,
}: {
  node: SimpleTreeMetadata;
  onAppend: (id: string) => void;
  onRename: (n: SimpleTreeMetadata) => void;
  onDelete: (n: SimpleTreeMetadata) => void;
  selectedId?: string | null;
  onSelect?: (n: SimpleTreeMetadata) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!node.children?.length;
  const selected = selectedId === node.id;

  return (
    <li className="border-l border-panel-border/60 pl-3">
      <div
        className={`group flex cursor-pointer items-center justify-between rounded px-1 py-1.5 ${
          selected ? "bg-primary/10 text-primary" : "hover:bg-panel/40"
        }`}
        onClick={() => onSelect?.(node)}
      >
        <div className="flex items-center gap-1.5">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
              className="text-text-muted"
            >
              {open ? <DownOutlined className="h-3 w-3" /> : <RightOutlined className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-3" />
          )}
          <span className="text-foreground">{node.name}</span>
        </div>
        <div
          className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <IconAction icon={EditOutlined} label="重命名" onClick={() => onRename(node)} />
          <IconAction icon={PlusOutlined} label="新增子节点" onClick={() => onAppend(node.id)} />
          <IconAction icon={DeleteOutlined} label="删除" danger onClick={() => onDelete(node)} />
        </div>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children!.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              onAppend={onAppend}
              onRename={onRename}
              onDelete={onDelete}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
