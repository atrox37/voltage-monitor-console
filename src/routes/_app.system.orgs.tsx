import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Pencil, UsersRound, Plus, Trash2, Search, Minus,
  ChevronsDownUp, ChevronsUpDown, X, Crosshair, ArrowLeft,
} from "lucide-react";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { ORG_TREE, type OrgNode, OrgTreeSelect, flattenOrgs, findOrg } from "@/components/org-tree-select";
import { StatusBadge } from "@/components/list-page-template";
import { useConfirm } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_app/system/orgs")({
  component: OrgsPage,
});

type Member = { id: string; username: string; state: 0 | 1 };

const MEMBERS: Record<string, Member[]> = {
  root: [
    { id: "u1", username: "root", state: 1 },
    { id: "u2", username: "admin", state: 1 },
    { id: "u3", username: "test222", state: 1 },
  ],
  c1: [
    { id: "u4", username: "zhiyuan.wang", state: 0 },
    { id: "u5", username: "shengkai.pan", state: 1 },
  ],
  c2: [{ id: "u6", username: "operator.a", state: 1 }],
  c3: [],
  "c1-1": [{ id: "u7", username: "engineer.b", state: 1 }],
};

/* ---- helpers (immutable tree ops) ---- */
function mapTree(tree: OrgNode[], fn: (n: OrgNode) => OrgNode): OrgNode[] {
  return tree.map((n) => {
    const next = fn(n);
    return next.children ? { ...next, children: mapTree(next.children, fn) } : next;
  });
}
function updateOrg(tree: OrgNode[], id: string, patch: Partial<OrgNode>): OrgNode[] {
  return mapTree(tree, (n) => (n.id === id ? { ...n, ...patch } : n));
}
function removeOrg(tree: OrgNode[], id: string): OrgNode[] {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeOrg(n.children, id) } : n));
}
function addChild(tree: OrgNode[], parentId: string, node: OrgNode): OrgNode[] {
  return mapTree(tree, (n) =>
    n.id === parentId ? { ...n, children: [...(n.children ?? []), node] } : n,
  );
}
function collectIds(tree: OrgNode[]): string[] {
  const out: string[] = [];
  const walk = (ns: OrgNode[]) => ns.forEach((n) => { out.push(n.id); if (n.children) walk(n.children); });
  walk(tree);
  return out;
}
/** keep nodes whose label matches OR any descendant matches; return matched ids for highlight */
function filterTree(tree: OrgNode[], kw: string): { tree: OrgNode[]; matched: Set<string> } {
  const matched = new Set<string>();
  if (!kw.trim()) return { tree, matched };
  const k = kw.trim().toLowerCase();
  const walk = (ns: OrgNode[]): OrgNode[] =>
    ns
      .map((n) => {
        const kids = n.children ? walk(n.children) : [];
        const hit = n.label.toLowerCase().includes(k);
        if (hit) matched.add(n.id);
        if (hit || kids.length) return { ...n, children: kids };
        return null;
      })
      .filter(Boolean) as OrgNode[];
  return { tree: walk(tree), matched };
}

function OrgsPage() {
  const [tree, setTree] = useState<OrgNode[]>(ORG_TREE);
  const [editing, setEditing] = useState<{ mode: "edit" | "add"; id?: string; parentId?: string; name: string } | null>(null);
  const [membersOf, setMembersOf] = useState<OrgNode | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [focusLabel, setFocusLabel] = useState(""); // label of focused subtree root
  const { confirm, confirmNode } = useConfirm();

  const allOrgs = useMemo(() => flattenOrgs(tree), [tree]);
  const focusedNode = useMemo(
    () => (focusLabel ? allOrgs.find((n) => n.label === focusLabel) : undefined),
    [focusLabel, allOrgs],
  );
  const baseTree = focusedNode ? [focusedNode] : tree;
  const { tree: viewTree, matched } = useMemo(() => filterTree(baseTree, keyword), [baseTree, keyword]);

  const handleAction = (cmd: "edit" | "members" | "add" | "delete" | "toggle" | "focus", node: OrgNode) => {
    if (cmd === "edit") setEditing({ mode: "edit", id: node.id, name: node.label });
    if (cmd === "members") setMembersOf(node);
    if (cmd === "add") setEditing({ mode: "add", parentId: node.id, name: "" });
    if (cmd === "focus") setFocusLabel(node.label);
    if (cmd === "toggle") {
      setCollapsed((s) => {
        const next = new Set(s);
        if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
        return next;
      });
    }
    if (cmd === "delete") {
      confirm({
        description: <>确定要删除组织 <span className="font-semibold text-foreground">「{node.label}」</span> 吗？该操作不可恢复。</>,
        onConfirm: () => setTree((t) => removeOrg(t, node.id)),
      });
    }
  };

  const saveEditing = () => {
    if (!editing || !editing.name.trim()) return;
    if (editing.mode === "edit" && editing.id) {
      setTree((t) => updateOrg(t, editing.id!, { label: editing.name.trim() }));
    } else if (editing.mode === "add" && editing.parentId) {
      const id = `n${Date.now()}`;
      setTree((t) => addChild(t, editing.parentId!, { id, label: editing.name.trim(), parentId: editing.parentId, userCount: 0 }));
    }
    setEditing(null);
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    // collapse everything that has children
    const ids = new Set<string>();
    const walk = (ns: OrgNode[]) => ns.forEach((n) => {
      if (n.children?.length) { ids.add(n.id); walk(n.children); }
    });
    walk(tree);
    setCollapsed(ids);
  };

  const members = useMemo(() => (membersOf ? MEMBERS[membersOf.id] ?? [] : []), [membersOf]);

  return (
    <main className="vt-page-content">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="vt-section-title text-base">机构管理</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              className={`${vtInputCls} pl-7 pr-7 w-56`}
              placeholder="搜索机构名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                onClick={() => setKeyword("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="w-56">
            <OrgTreeSelect
              value={focusLabel}
              onChange={setFocusLabel}
              placeholder="聚焦某个机构"
              allowAll
            />
          </div>
          <VtBtn variant="ghost" onClick={expandAll}>
            <ChevronsUpDown className="h-3.5 w-3.5" /> 展开
          </VtBtn>
          <VtBtn variant="ghost" onClick={collapseAll}>
            <ChevronsDownUp className="h-3.5 w-3.5" /> 收起
          </VtBtn>
        </div>
      </div>

      {focusLabel && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <ArrowLeft className="h-3 w-3" />
          <button onClick={() => setFocusLabel("")} className="hover:text-primary">
            返回完整结构
          </button>
          <span className="text-text-muted">当前聚焦：</span>
          <span className="text-primary font-medium">{focusLabel}</span>
        </div>
      )}

      <div className="vt-glass flex-1 overflow-auto p-8">
        {viewTree.length === 0 ? (
          <div className="py-20 text-center text-sm text-text-muted">未找到匹配的机构</div>
        ) : (
          <div className="flex min-w-max justify-center">
            {viewTree.map((root) => (
              <OrgChartNode
                key={root.id}
                node={root}
                collapsed={collapsed}
                matched={matched}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit / Add Drawer */}
      <VtDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.mode === "add" ? "新增机构" : "编辑机构"}
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setEditing(null)}>关闭</VtBtn>
            <VtBtn onClick={saveEditing}>保存</VtBtn>
          </>
        }
      >
        {editing && (
          <>
            {editing.mode === "edit" && editing.id && (
              <VtField label="组织ID">
                <input className={vtInputCls} value={editing.id} disabled />
              </VtField>
            )}
            {editing.mode === "add" && editing.parentId && (
              <VtField label="上级机构">
                <input className={vtInputCls} value={editing.parentId} disabled />
              </VtField>
            )}
            <VtField label="组织名称" required>
              <input
                className={vtInputCls}
                value={editing.name}
                placeholder="请输入组织名称"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                autoFocus
              />
            </VtField>
          </>
        )}
      </VtDrawer>

      {/* Members Drawer */}
      <VtDrawer
        open={!!membersOf}
        onClose={() => setMembersOf(null)}
        title={`关联用户 — ${membersOf?.label ?? ""}`}
        width={420}
      >
        {members.length === 0 ? (
          <div className="py-16 text-center text-sm text-text-muted">暂无关联用户</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted">
                <th className="px-3 py-2 text-left font-medium">用户</th>
                <th className="px-3 py-2 text-center font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-panel-border/60">
                  <td className="px-3 py-2">{m.username}</td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={m.state === 1 ? "online" : "disabled"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </VtDrawer>

      {confirmNode}
    </main>
  );
}

/* ===== Org chart node ===== */
function OrgChartNode({
  node, collapsed, matched, onAction,
}: {
  node: OrgNode;
  collapsed: Set<string>;
  matched: Set<string>;
  onAction: (cmd: "edit" | "members" | "add" | "delete" | "toggle" | "focus", n: OrgNode) => void;
}) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const showChildren = hasChildren && !isCollapsed;
  return (
    <div className="flex flex-col items-center">
      <NodeCard
        node={node}
        collapsed={isCollapsed}
        highlighted={matched.has(node.id)}
        onAction={onAction}
      />

      {showChildren && (
        <>
          <div className="h-6 w-px bg-panel-border" />
          <div className="flex items-start">
            {children.map((c, i) => {
              const single = children.length === 1;
              const first = i === 0;
              const last = i === children.length - 1;
              const sideBorder = "border-panel-border";
              const topClass = single
                ? ""
                : first
                  ? `border-t ${sideBorder} ml-[50%] w-1/2`
                  : last
                    ? `border-t ${sideBorder} mr-[50%] w-1/2`
                    : `border-t ${sideBorder} w-full`;
              return (
                <div key={c.id} className="flex flex-col items-center px-3">
                  <div className={`h-0 ${topClass}`} />
                  <div className="h-6 w-px bg-panel-border" />
                  <OrgChartNode node={c} collapsed={collapsed} matched={matched} onAction={onAction} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function NodeCard({
  node, collapsed, highlighted, onAction,
}: {
  node: OrgNode;
  collapsed: boolean;
  highlighted: boolean;
  onAction: (cmd: "edit" | "members" | "add" | "delete" | "toggle" | "focus", n: OrgNode) => void;
}) {
  const count = node.children?.length ?? 0;
  const hasChildren = count > 0;
  return (
    <div
      className={`vt-glass relative w-56 overflow-hidden transition ${
        highlighted ? "ring-2 ring-primary/60 shadow-lg shadow-primary/20" : ""
      }`}
    >
      <div className="bg-primary/15 px-3 py-2 text-center text-sm font-semibold text-primary border-b border-primary/30">
        {node.label}
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-text-secondary border-b border-panel-border/60">
        <span className="inline-flex items-center gap-1">
          <UsersRound className="h-3 w-3" />
          子节点 <span className="font-mono text-foreground">{count}</span>
          {collapsed && hasChildren && (
            <span className="ml-1 rounded bg-panel px-1 py-px text-[10px] text-text-muted">已收起</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button
              onClick={() => onAction("toggle", node)}
              title={collapsed ? "展开" : "收起"}
              className="text-text-muted hover:text-primary"
            >
              {collapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            </button>
          )}
          <button
            onClick={() => onAction("focus", node)}
            title="聚焦此机构"
            className="text-text-muted hover:text-primary"
          >
            <Crosshair className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="flex items-stretch divide-x divide-panel-border/60">
        <IconBtn icon={Pencil}     label="编辑"     onClick={() => onAction("edit", node)} />
        <IconBtn icon={UsersRound} label="用户"     onClick={() => onAction("members", node)} />
        <IconBtn icon={Plus}       label="子机构"   onClick={() => onAction("add", node)} />
        <IconBtn icon={Trash2}     label="删除" danger onClick={() => onAction("delete", node)} />
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon, label, onClick, danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] transition ${
        danger
          ? "text-text-muted hover:bg-status-critical/10 hover:text-status-critical"
          : "text-text-muted hover:bg-panel hover:text-primary"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
