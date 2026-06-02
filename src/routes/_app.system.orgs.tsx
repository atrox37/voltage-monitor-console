import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pencil, UsersRound, Plus, Trash2, Search,
  ChevronsDownUp, ChevronsUpDown, X, Crosshair, ArrowLeft, Loader2,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteDimension,
  getDimensionOne,
  getDimensionTree,
  getDimensionUsers,
  saveDimension,
} from "@/api/sys";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect, type OrgNode, flattenOrgs } from "@/components/org-tree-select";
import { StatusBadge } from "@/components/list-page-template";
import { VtDataTable } from "@/components/vt-table";
import { useConfirm } from "@/components/confirm-dialog";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import { termEq, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import type { SysDimensionPo, SysUserPo } from "@/types";

export const Route = createFileRoute("/_app/system/orgs")({
  component: OrgsPage,
});

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
  const { t } = useTranslation();
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    mode: "edit" | "add";
    id?: string;
    parentId?: string;
    name: string;
  } | null>(null);
  const [membersOf, setMembersOf] = useState<OrgNode | null>(null);
  const [members, setMembers] = useState<SysUserPo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [focusId, setFocusId] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm, confirmNode } = useConfirm();

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const root = await getDimensionTree();
      setTree(dimensionToOrgNodes(root));
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("orgs.loadFailed"));
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (!membersOf) return;
    setMembersLoading(true);
    void getDimensionUsers({
      terms: [{ column: "t.org_id", value: toDbId(membersOf.id), termType: "eq" }],
    })
      .then(setMembers)
      .catch((err) => {
        if (isRequestCanceled(err)) return;
        setMembers([]);
      })
      .finally(() => setMembersLoading(false));
  }, [membersOf]);

  const allOrgs = useMemo(() => flattenOrgs(tree), [tree]);
  const focusedNode = useMemo(
    () => (focusId ? allOrgs.find((n) => n.id === focusId) : undefined),
    [focusId, allOrgs],
  );
  const baseTree = focusedNode ? [focusedNode] : tree;
  const { tree: viewTree, matched } = useMemo(
    () => filterTree(baseTree, keyword),
    [baseTree, keyword],
  );

  const handleAction = async (
    cmd: "edit" | "members" | "add" | "delete" | "toggle" | "focus",
    node: OrgNode,
  ) => {
    if (cmd === "edit") {
      try {
        const detail = await getDimensionOne({
          terms: [{ column: "id", value: toDbId(node.id), termType: "eq" }],
        });
        setEditing({ mode: "edit", id: String(detail.id ?? node.id), name: detail.name });
      } catch {
        setEditing({ mode: "edit", id: node.id, name: node.label });
      }
    }
    if (cmd === "members") setMembersOf(node);
    if (cmd === "add") setEditing({ mode: "add", parentId: node.id, name: "" });
    if (cmd === "focus") setFocusId(node.id);
    if (cmd === "toggle") {
      setCollapsed((s) => {
        const next = new Set(s);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
    if (cmd === "delete") {
      confirm({
        description: t("orgs.deleteConfirm", { name: node.label }),
        onConfirm: async () => {
          await deleteDimension(node.id);
          toast.success(t("common.deleteSuccess"));
          if (focusId === node.id) setFocusId("");
          await loadTree();
        },
      });
    }
  };

  const saveEditing = async () => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    try {
      if (editing.mode === "edit" && editing.id) {
        await saveDimension({ id: toDbId(editing.id), name: editing.name.trim() });
      } else if (editing.mode === "add" && editing.parentId) {
        await saveDimension({
          name: editing.name.trim(),
          parentId: toDbId(editing.parentId),
        });
      }
      toast.success(t("common.saveSuccess"));
      setEditing(null);
      await loadTree();
    } finally {
      setSaving(false);
    }
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const ids = new Set<string>();
    const walk = (ns: OrgNode[]) =>
      ns.forEach((n) => {
        if (n.children?.length) {
          ids.add(n.id);
          walk(n.children);
        }
      });
    walk(tree);
    setCollapsed(ids);
  };

  const focusLabel = focusedNode?.label ?? "";

  return (
    <main className="vt-page-content vt-page-fill">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h2 className="vt-section-title text-base">{t("orgs.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              className={`${vtInputCls} w-56 pl-7 pr-7`}
              placeholder={t("orgs.searchPlaceholder")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="w-56">
            <OrgTreeSelect
              nodes={tree}
              value={focusId}
              onChange={setFocusId}
              placeholder={t("orgs.focusPlaceholder")}
              allowAll
            />
          </div>
          <VtBtn variant="ghost" onClick={expandAll}>
            <ChevronsUpDown className="h-3.5 w-3.5" /> {t("orgs.expand")}
          </VtBtn>
          <VtBtn variant="ghost" onClick={collapseAll}>
            <ChevronsDownUp className="h-3.5 w-3.5" /> {t("orgs.collapse")}
          </VtBtn>
        </div>
      </div>

      {focusId && (
        <div className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
          <ArrowLeft className="h-3 w-3" />
          <button type="button" onClick={() => setFocusId("")} className="hover:text-primary">
            {t("orgs.backFull")}
          </button>
          <span className="text-text-muted">{t("orgs.focusCurrent")}</span>
          <span className="font-medium text-primary">{focusLabel}</span>
        </div>
      )}

      <div className="vt-glass vt-scrollbar min-h-0 flex-1 overflow-auto p-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
          </div>
        ) : viewTree.length === 0 ? (
          <div className="py-20 text-center text-sm text-text-muted">{t("orgs.notFound")}</div>
        ) : (
          <div className="flex min-w-max justify-center">
            {viewTree.map((root) => (
              <OrgChartNode
                key={root.id}
                node={root}
                collapsed={collapsed}
                matched={matched}
                onAction={(cmd, n) => void handleAction(cmd, n)}
              />
            ))}
          </div>
        )}
      </div>

      <VtDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.mode === "add" ? t("orgs.add") : t("orgs.edit")}
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setEditing(null)}>{t("common.close")}</VtBtn>
            <VtBtn onClick={() => void saveEditing()} disabled={saving}>{t("common.save")}</VtBtn>
          </>
        }
      >
        {editing && (
          <>
            {editing.mode === "edit" && editing.id && (
              <VtField label={t("orgs.orgId")}>
                <input className={vtInputCls} value={editing.id} disabled />
              </VtField>
            )}
            {editing.mode === "add" && editing.parentId && (
              <VtField label={t("orgs.parentOrg")}>
                <input
                  className={vtInputCls}
                  value={allOrgs.find((n) => n.id === editing.parentId)?.label ?? editing.parentId}
                  disabled
                />
              </VtField>
            )}
            <VtField label={t("orgs.orgName")} required>
              <input
                className={vtInputCls}
                value={editing.name}
                placeholder={t("orgs.orgNamePlaceholder")}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                autoFocus
              />
            </VtField>
          </>
        )}
      </VtDrawer>

      <VtDrawer
        open={!!membersOf}
        onClose={() => setMembersOf(null)}
        title={t("orgs.membersTitle", { name: membersOf?.label ?? "" })}
        width={420}
      >
        {membersLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-sm text-text-muted">{t("orgs.noMembers")}</div>
        ) : (
          <VtDataTable
            rowKey={(m) => String(m.id ?? m.username)}
            size="small"
            pagination={false}
            dataSource={members}
            columns={[
              { key: "username", title: t("orgs.userCol"), dataIndex: "username" },
              {
                key: "status",
                title: t("common.status"),
                align: "center",
                render: (_, m) => <StatusBadge status={m.state === 0 ? "disabled" : "online"} />,
              },
            ]}
          />
        )}
      </VtDrawer>

      {confirmNode}
    </main>
  );
}

function OrgChartNode({
  node,
  collapsed,
  matched,
  onAction,
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
                  <OrgChartNode
                    node={c}
                    collapsed={collapsed}
                    matched={matched}
                    onAction={onAction}
                  />
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
  node,
  collapsed,
  highlighted,
  onAction,
}: {
  node: OrgNode;
  collapsed: boolean;
  highlighted: boolean;
  onAction: (cmd: "edit" | "members" | "add" | "delete" | "toggle" | "focus", n: OrgNode) => void;
}) {
  const { t } = useTranslation();
  const count = node.children?.length ?? 0;
  const hasChildren = count > 0;
  return (
    <div
      className={`vt-glass relative w-56 overflow-hidden transition ${
        highlighted ? "shadow-lg shadow-primary/20 ring-2 ring-primary/60" : ""
      } ${collapsed && hasChildren ? "opacity-90 ring-1 ring-dashed ring-text-muted/40" : ""}`}
    >
      {hasChildren && (
        <span
          className={`absolute left-0 top-0 h-full w-1 ${
            collapsed ? "bg-text-muted/50" : "bg-status-online"
          }`}
          title={collapsed ? t("orgs.childrenCollapsed") : t("orgs.childrenExpanded")}
        />
      )}
      <div
        className={`border-b px-3 py-2 text-center text-sm font-semibold ${
          collapsed && hasChildren
            ? "border-text-muted/30 bg-panel/60 text-text-secondary"
            : "border-primary/30 bg-primary/15 text-primary"
        }`}
      >
        {node.label}
      </div>
      <div className="flex items-center justify-between border-b border-panel-border/60 px-3 py-1.5 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1">
          <UsersRound className="h-3 w-3" />
          {t("orgs.childCount")} <span className="font-mono text-foreground">{count}</span>
        </span>
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button
              type="button"
              onClick={() => onAction("toggle", node)}
              title={collapsed ? t("orgs.expandNode") : t("orgs.collapseNode")}
              className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition ${
                collapsed
                  ? "border-text-muted/40 bg-panel text-text-muted hover:border-primary/40 hover:text-primary"
                  : "border-status-online/40 bg-status-online/10 text-status-online hover:bg-status-online/20"
              }`}
            >
              {collapsed ? (
                <>
                  <ChevronRight className="h-3 w-3" />
                  {t("orgs.expandNode")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {t("orgs.collapseNode")}
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction("focus", node)}
            title={t("orgs.focus")}
            className="text-text-muted hover:text-primary"
          >
            <Crosshair className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="flex items-stretch divide-x divide-panel-border/60">
        <IconBtn icon={Pencil} label={t("common.edit")} onClick={() => onAction("edit", node)} />
        <IconBtn icon={UsersRound} label={t("orgs.members")} onClick={() => onAction("members", node)} />
        <IconBtn icon={Plus} label={t("orgs.subOrg")} onClick={() => onAction("add", node)} />
        <IconBtn icon={Trash2} label={t("common.delete")} danger onClick={() => onAction("delete", node)} />
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
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
