import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { useConfirm } from "@/components/confirm-dialog";
import { NAV } from "@/lib/nav-config";

export const Route = createFileRoute("/_app/system/roles")({
  component: RolesPage,
});

type MenuNode = { id: string; label: string; path?: string; children?: MenuNode[] };
type Role = {
  id: string;
  name: string;
  org: string;
  updatedAt: string;
  /** checked menu ids */
  menus: Set<string>;
  /** menuId -> set of permission ids */
  perms: Record<string, Set<string>>;
};

/** Build menu tree from NAV. Group keys are parents, child routes are leaves. */
const MENU_TREE: MenuNode[] = NAV.map((g) => ({
  id: g.key,
  label: g.label,
  children: g.children.map((c) => ({ id: c.to, label: c.label, path: c.to })),
}));

/** Fake permissions list per leaf menu (mirrors menuPermissionApi) */
const PERMISSIONS = [
  { id: "p:list", name: "分页" },
  { id: "p:query", name: "查询" },
  { id: "p:delete", name: "删除" },
  { id: "p:save", name: "保存更新" },
];

function allMenuIds(): string[] {
  const out: string[] = [];
  const walk = (ns: MenuNode[]) =>
    ns.forEach((n) => {
      out.push(n.id);
      if (n.children) walk(n.children);
    });
  walk(MENU_TREE);
  return out;
}

function leafIds(): string[] {
  const out: string[] = [];
  const walk = (ns: MenuNode[]) =>
    ns.forEach((n) => (n.children ? walk(n.children) : out.push(n.id)));
  walk(MENU_TREE);
  return out;
}

function findMenu(id: string, ns: MenuNode[] = MENU_TREE): MenuNode | null {
  for (const n of ns) {
    if (n.id === id) return n;
    if (n.children) {
      const r = findMenu(id, n.children);
      if (r) return r;
    }
  }
  return null;
}

function defaultPerms(): Record<string, Set<string>> {
  const all = PERMISSIONS.map((p) => p.id);
  return Object.fromEntries(leafIds().map((id) => [id, new Set(all)]));
}

const initial: Role[] = [
  { id: "1", name: "root",     org: "Group Root", updatedAt: "2026-04-15 09:17:18", menus: new Set(allMenuIds()), perms: defaultPerms() },
  { id: "2", name: "Engineer", org: "Group Root", updatedAt: "2025-09-23 06:11:15", menus: new Set(allMenuIds()), perms: defaultPerms() },
  { id: "3", name: "Viewer",   org: "Group Root", updatedAt: "2024-12-24 07:39:15", menus: new Set(["sys"]),       perms: {} },
  { id: "4", name: "Admin",    org: "Group Root", updatedAt: "2023-08-11 04:42:05", menus: new Set(allMenuIds()), perms: defaultPerms() },
];

function RolesPage() {
  const [rows, setRows] = useState<Role[]>(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<{ name: string; org: string }>({ name: "", org: "" });
  const [editing, setEditing] = useState<Role | null>(null);

  // Two-stage drawers
  const [menuRole, setMenuRole] = useState<Role | null>(null);
  const [menuSel, setMenuSel] = useState<Set<string>>(new Set());
  const [permMenuId, setPermMenuId] = useState<string | null>(null);
  const [permSel, setPermSel] = useState<Set<string>>(new Set());
  const [permsDraft, setPermsDraft] = useState<Record<string, Set<string>>>({});

  const { confirm, confirmNode } = useConfirm();

  const openMenu = (r: Role) => {
    setMenuRole(r);
    setMenuSel(new Set(r.menus));
    setPermsDraft(Object.fromEntries(Object.entries(r.perms).map(([k, v]) => [k, new Set(v)])));
    setPermMenuId(null);
  };

  const toggleMenu = (k: string) => {
    setMenuSel((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const openPermFor = (id: string) => {
    setPermMenuId(id);
    setPermSel(new Set(permsDraft[id] ?? PERMISSIONS.map((p) => p.id)));
  };

  const togglePerm = (k: string) => {
    setPermSel((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const savePerm = () => {
    if (!permMenuId) return;
    setPermsDraft((d) => ({ ...d, [permMenuId]: new Set(permSel) }));
    setPermMenuId(null);
  };

  const saveMenu = () => {
    if (!menuRole) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    setRows((rs) =>
      rs.map((r) =>
        r.id === menuRole.id ? { ...r, menus: new Set(menuSel), perms: permsDraft, updatedAt: now } : r,
      ),
    );
    setMenuRole(null);
    setPermMenuId(null);
  };

  const saveAdd = () => {
    if (!draft.name || !draft.org) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    setRows((rs) => [
      ...rs,
      { id: String(Date.now()), name: draft.name, org: draft.org, updatedAt: now, menus: new Set(), perms: {} },
    ]);
    setAddOpen(false);
    setDraft({ name: "", org: "" });
  };

  const saveEdit = () => {
    if (!editing) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    setRows((rs) => rs.map((r) => (r.id === editing.id ? { ...editing, updatedAt: now } : r)));
    setEditing(null);
  };

  const permMenu = useMemo(() => (permMenuId ? findMenu(permMenuId) : null), [permMenuId]);

  return (
    <>
      <ListPageTemplate<Role>
        title="角色管理"
        columns={[
          {
            key: "name", title: "角色名称", align: "center",
            render: (r) => (
              <button
                onClick={() => openMenu(r)}
                className="text-foreground transition hover:text-primary"
              >
                {r.name}
              </button>
            ),
          },
          { key: "org", title: "组织机构", align: "center" },
          {
            key: "updatedAt", title: "更新时间", align: "center",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span>,
          },
        ]}
        rows={rows}
        onAdd={() => setAddOpen(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing({ ...r, menus: new Set(r.menus), perms: { ...r.perms } })}>
              编辑
            </RowBtn>
            <RowBtn
              danger
              confirm={{ description: <>确定要删除角色 <span className="font-semibold text-foreground">「{r.name}」</span> 吗？该操作不可恢复。</> }}
              onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
            >
              删除
            </RowBtn>
          </>
        )}
      />

      {/* Add Role Drawer */}
      <VtDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新增角色"
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setAddOpen(false)}>关闭</VtBtn>
            <VtBtn onClick={saveAdd}>保存</VtBtn>
          </>
        }
      >
        <VtField label="名称" required>
          <input className={vtInputCls} placeholder="名称" value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </VtField>
        <VtField label="机构" required>
          <OrgTreeSelect value={draft.org} onChange={(v) => setDraft({ ...draft, org: v })} />
        </VtField>
      </VtDrawer>

      {/* Edit Role Drawer */}
      <VtDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title="编辑角色"
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setEditing(null)}>关闭</VtBtn>
            <VtBtn onClick={saveEdit}>保存</VtBtn>
          </>
        }
      >
        {editing && (
          <>
            <VtField label="名称" required>
              <input className={vtInputCls} value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </VtField>
            <VtField label="机构" required>
              <OrgTreeSelect value={editing.org}
                onChange={(v) => setEditing({ ...editing, org: v })} />
            </VtField>
          </>
        )}
      </VtDrawer>

      {/* Stage 1: Page Menu Drawer */}
      <VtDrawer
        open={!!menuRole}
        onClose={() => { setMenuRole(null); setPermMenuId(null); }}
        title="页面菜单"
        width={420}
        offsetRight={permMenuId ? 560 : 0}
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => { setMenuRole(null); setPermMenuId(null); }}>关闭</VtBtn>
            <VtBtn onClick={saveMenu}>保存提交</VtBtn>
          </>
        }
      >
        <div className="text-xs">
          {MENU_TREE.map((g) => (
            <PermGroup
              key={g.id}
              node={g}
              selected={menuSel}
              activeId={permMenuId}
              onToggle={toggleMenu}
              onClickLeaf={openPermFor}
            />
          ))}
        </div>
      </VtDrawer>

      {/* Stage 2: Permission Drawer (overlay hidden to keep stage 1 visible) */}
      <VtDrawer
        open={!!permMenuId}
        onClose={() => setPermMenuId(null)}
        title="权限菜单"
        width={560}
        hideOverlay
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setPermMenuId(null)}>取消</VtBtn>
            <VtBtn onClick={savePerm}>保存</VtBtn>
          </>
        }
      >
        {permMenu && (
          <>
            <VtField label="菜单名称">
              <input className={vtInputCls} value={permMenu.label} disabled />
            </VtField>
            <VtField label="目录地址">
              <input className={vtInputCls} value={permMenu.path ?? "—"} disabled />
            </VtField>
            <VtField label="权限">
              <div className="flex flex-wrap gap-2">
                {PERMISSIONS.map((p) => {
                  const active = permSel.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition ${
                        active
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-panel-border bg-panel/40 text-text-secondary hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={active}
                        onChange={() => togglePerm(p.id)}
                      />
                      {permMenu.label}-{p.name}
                    </label>
                  );
                })}
              </div>
            </VtField>
          </>
        )}
      </VtDrawer>

      {confirmNode}
    </>
  );
}

function PermGroup({
  node, selected, activeId, onToggle, onClickLeaf,
}: {
  node: MenuNode;
  selected: Set<string>;
  activeId: string | null;
  onToggle: (k: string) => void;
  onClickLeaf: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!node.children?.length;
  const isActive = activeId === node.id;
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 py-1">
        {hasChildren ? (
          <button onClick={() => setOpen((o) => !o)} className="text-text-muted">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <input
          type="checkbox"
          className="accent-primary"
          checked={selected.has(node.id)}
          onChange={() => onToggle(node.id)}
        />
        <button
          onClick={() => !hasChildren && onClickLeaf(node.id)}
          className={`text-left transition ${
            hasChildren ? "cursor-default text-foreground" : "cursor-pointer hover:text-primary"
          } ${isActive ? "text-primary" : ""}`}
        >
          {node.label}
        </button>
      </div>
      {hasChildren && open && (
        <div className="ml-6">
          {node.children!.map((c) => (
            <PermGroup
              key={c.id}
              node={c}
              selected={selected}
              activeId={activeId}
              onToggle={onToggle}
              onClickLeaf={onClickLeaf}
            />
          ))}
        </div>
      )}
    </div>
  );
}
