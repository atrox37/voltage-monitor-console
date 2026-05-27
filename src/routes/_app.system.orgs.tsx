import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, UsersRound, Plus, Trash2 } from "lucide-react";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { ORG_TREE, type OrgNode } from "@/components/org-tree-select";
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

function OrgsPage() {
  const [tree, setTree] = useState<OrgNode[]>(ORG_TREE);
  const [editing, setEditing] = useState<{ mode: "edit" | "add"; id?: string; parentId?: string; name: string } | null>(null);
  const [membersOf, setMembersOf] = useState<OrgNode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrgNode | null>(null);

  const handleAction = (cmd: "edit" | "members" | "add" | "delete", node: OrgNode) => {
    if (cmd === "edit") setEditing({ mode: "edit", id: node.id, name: node.label });
    if (cmd === "members") setMembersOf(node);
    if (cmd === "add") setEditing({ mode: "add", parentId: node.id, name: "" });
    if (cmd === "delete") setConfirmDelete(node);
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

  const doDelete = () => {
    if (!confirmDelete) return;
    setTree((t) => removeOrg(t, confirmDelete.id));
    setConfirmDelete(null);
  };

  const members = useMemo(() => (membersOf ? MEMBERS[membersOf.id] ?? [] : []), [membersOf]);

  return (
    <main className="vt-page-content">
      <h2 className="vt-section-title text-base">机构管理</h2>

      <div className="vt-glass flex-1 overflow-auto p-8">
        <div className="flex min-w-max justify-center">
          {tree.map((root) => (
            <OrgChartNode key={root.id} node={root} onAction={handleAction} />
          ))}
        </div>
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

      {/* Delete confirm */}
      <VtDrawer
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="警告"
        width={360}
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setConfirmDelete(null)}>取消</VtBtn>
            <VtBtn onClick={doDelete} className="bg-status-critical hover:brightness-110">删除</VtBtn>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          确定要删除组织 <span className="font-semibold text-foreground">「{confirmDelete?.label}」</span> 吗？该操作不可恢复。
        </p>
      </VtDrawer>
    </main>
  );
}

/* ===== Org chart node =====
 * Classic CSS approach: each child cell gets a top half-border to fake
 * the horizontal trunk between siblings, plus a vertical drop line.
 */
function OrgChartNode({
  node, onAction,
}: {
  node: OrgNode;
  onAction: (cmd: "edit" | "members" | "add" | "delete", n: OrgNode) => void;
}) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} onAction={onAction} />

      {hasChildren && (
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
                  <OrgChartNode node={c} onAction={onAction} />
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
  node, onAction,
}: {
  node: OrgNode;
  onAction: (cmd: "edit" | "members" | "add" | "delete", n: OrgNode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const count = node.children?.length ?? 0;
  return (
    <div className="vt-glass relative w-52 overflow-hidden">
      <div className="bg-primary/15 px-3 py-2 text-center text-sm font-semibold text-primary border-b border-primary/30">
        {node.label}
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1">
          <UsersRound className="h-3 w-3" />
          子节点 <span className="font-mono text-foreground">{count}</span>
        </span>
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded p-1 text-text-muted hover:bg-panel hover:text-foreground"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-md border border-panel-border bg-page shadow-xl">
              <MenuItem icon={Pencil}     label="编辑"       onClick={() => { setOpen(false); onAction("edit", node); }} />
              <MenuItem icon={UsersRound} label="关联用户"   onClick={() => { setOpen(false); onAction("members", node); }} />
              <MenuItem icon={Plus}       label="新增子机构" onClick={() => { setOpen(false); onAction("add", node); }} />
              <div className="border-t border-panel-border" />
              <MenuItem icon={Trash2}     label="删除" danger onClick={() => { setOpen(false); onAction("delete", node); }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
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
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition ${
        danger ? "text-status-critical hover:bg-status-critical/10" : "text-text-secondary hover:bg-panel hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
