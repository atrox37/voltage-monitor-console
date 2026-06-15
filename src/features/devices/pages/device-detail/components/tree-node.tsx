import { useState } from "react";
import { DownOutlined, RightOutlined } from "@ant-design/icons";

import { useTranslation } from "@/i18n";

import type { SimpleTreeMetadata } from "@/types/api/metadata";

export function TreeNode({
  node,
  depth,
  onAdd,
  onRename,
  onDelete,
}: {
  node: SimpleTreeMetadata;
  depth: number;
  onAdd: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const hasKids = (node.children?.length ?? 0) > 0;
  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded px-1 py-1 text-xs hover:bg-panel/60"
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        <button onClick={() => setOpen((o) => !o)} className="text-text-muted">
          {hasKids ? (
            open ? (
              <DownOutlined />
            ) : (
              <RightOutlined />
            )
          ) : (
            <span className="inline-block h-3 w-3" />
          )}
        </button>
        <span className="flex-1 truncate text-foreground">{node.name}</span>
        <div className="hidden gap-1 group-hover:flex">
          <button
            type="button"
            onClick={() => onRename(node.id)}
            className="vt-detail-outline-btn px-1.5 py-0.5 text-[10px]"
          >
            {t("common.rename")}
          </button>
          <button
            type="button"
            onClick={() => onAdd(node.id)}
            className="vt-detail-outline-btn px-1.5 py-0.5 text-[10px]"
          >
            {t("common.add")}
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="vt-detail-outline-btn vt-detail-outline-btn--danger px-1.5 py-0.5 text-[10px]"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>
      {open && hasKids && (
        <div>
          {node.children!.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              onAdd={onAdd}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
