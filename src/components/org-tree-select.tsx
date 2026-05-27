import { useRef, useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { vtInputCls } from "./vt-drawer";

export type OrgNode = {
  id: string;
  label: string;
  parentId?: string;
  userCount?: number;
  children?: OrgNode[];
};

export const ORG_TREE: OrgNode[] = [
  {
    id: "root",
    label: "Group Root",
    userCount: 5,
    children: [
      {
        id: "c1",
        label: "Group Children1",
        parentId: "root",
        userCount: 8,
        children: [
          { id: "c1-1", label: "Group Children1-1", parentId: "c1", userCount: 2 },
        ],
      },
      { id: "c2", label: "Group Children2", parentId: "root", userCount: 3 },
      { id: "c3", label: "Group Children3", parentId: "root", userCount: 0 },
    ],
  },
];

/* ---- helpers ---- */
export function findOrg(id: string, tree: OrgNode[] = ORG_TREE): OrgNode | undefined {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const r = findOrg(id, n.children);
      if (r) return r;
    }
  }
}

export function flattenOrgs(tree: OrgNode[] = ORG_TREE): OrgNode[] {
  const out: OrgNode[] = [];
  const walk = (ns: OrgNode[]) => ns.forEach((n) => { out.push(n); if (n.children) walk(n.children); });
  walk(tree);
  return out;
}

export function OrgTreeSelect({
  value,
  onChange,
  placeholder = "请选择",
  allowAll,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowAll?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${vtInputCls} flex items-center justify-between text-left`}
      >
        <span className={value ? "text-foreground" : "text-text-muted"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-panel-border bg-page p-2 shadow-xl">
          {allowAll && (
            <TreeRow
              label="全部"
              depth={0}
              onPick={() => {
                onChange("");
                setOpen(false);
              }}
              selected={!value}
            />
          )}
          {ORG_TREE.map((n) => (
            <TreeBranch
              key={n.id}
              node={n}
              depth={0}
              selected={value}
              onPick={(label) => {
                onChange(label);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeBranch({
  node, depth, selected, onPick,
}: {
  node: OrgNode;
  depth: number;
  selected: string;
  onPick: (label: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = !!node.children?.length;
  return (
    <div>
      <div className="flex items-center">
        {hasChildren ? (
          <button onClick={() => setExpanded((e) => !e)} className="text-text-muted hover:text-foreground" style={{ marginLeft: depth * 12 }}>
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span style={{ marginLeft: depth * 12 + 12 }} />
        )}
        <TreeRow label={node.label} depth={0} onPick={() => onPick(node.label)} selected={selected === node.label} />
      </div>
      {expanded && node.children?.map((c) => (
        <TreeBranch key={c.id} node={c} depth={depth + 1} selected={selected} onPick={onPick} />
      ))}
    </div>
  );
}

function TreeRow({
  label, depth, selected, onPick,
}: {
  label: string;
  depth: number;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{ paddingLeft: depth * 12 + 4 }}
      className={`flex-1 rounded px-2 py-1 text-left text-xs transition ${
        selected ? "bg-primary/20 text-primary" : "text-text-secondary hover:bg-panel hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
