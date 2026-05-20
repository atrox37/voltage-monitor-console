import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, VtBtn, vtInputCls } from "@/components/vt-drawer";
import { OrgTreeSelect } from "@/components/org-tree-select";
import { NAV } from "@/lib/nav-config";

export const Route = createFileRoute("/_app/system/roles")({
  component: RolesPage,
});

export const Route = createFileRoute("/_app/system/roles")({
  component: RolesPage,
});

type Role = { id: string; name: string; org: string; updatedAt: string; perms: string[] };

const initial: Role[] = [
  { id: "1", name: "root",     org: "Group Root", updatedAt: "2026-04-15 09:17:18", perms: allPermKeys() },
  { id: "2", name: "Engineer", org: "Group Root", updatedAt: "2025-09-23 06:11:15", perms: allPermKeys() },
  { id: "3", name: "Viewer",   org: "Group Root", updatedAt: "2024-12-24 07:39:15", perms: ["/"] },
  { id: "4", name: "Admin",    org: "Group Root", updatedAt: "2023-08-11 04:42:05", perms: allPermKeys() },
];

function allPermKeys() {
  return NAV.flatMap((g) => [g.key, ...g.children.map((c) => c.to)]);
}

function RolesPage() {
  const [rows, setRows] = useState<Role[]>(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<{ name: string; org: string }>({ name: "", org: "" });
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [permSel, setPermSel] = useState<Set<string>>(new Set());

  const openPerm = (r: Role) => {
    setPermRole(r);
    setPermSel(new Set(r.perms));
  };

  const toggle = (k: string) => {
    setPermSel((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const savePerm = () => {
    if (!permRole) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    setRows((rs) =>
      rs.map((r) =>
        r.id === permRole.id ? { ...r, perms: Array.from(permSel), updatedAt: now } : r,
      ),
    );
    setPermRole(null);
  };

  const saveAdd = () => {
    if (!draft.name || !draft.org) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    setRows((rs) => [
      ...rs,
      { id: String(Date.now()), name: draft.name, org: draft.org, updatedAt: now, perms: [] },
    ]);
    setAddOpen(false);
    setDraft({ name: "", org: "" });
  };

  return (
    <>
      <ListPageTemplate<Role>
        title="角色管理"
        columns={[
          {
            key: "name", title: "角色名称", align: "center",
            render: (r) => (
              <button
                onClick={() => openPerm(r)}
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
          <button
            onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
            className="rounded border border-panel-border bg-panel p-1.5 text-text-secondary transition hover:border-status-critical/40 hover:text-status-critical"
            title="删除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
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

      {/* Permission Tree Drawer */}
      <VtDrawer
        open={!!permRole}
        onClose={() => setPermRole(null)}
        title="页面菜单"
        footer={
          <>
            <VtBtn variant="ghost" onClick={() => setPermRole(null)}>关闭</VtBtn>
            <VtBtn onClick={savePerm}>保存提交</VtBtn>
          </>
        }
      >
        <div className="text-xs">
          {NAV.map((g) => (
            <PermGroup
              key={g.key}
              groupKey={g.key}
              label={g.label}
              children={g.children.map((c) => ({ key: c.to, label: c.label }))}
              selected={permSel}
              onToggle={toggle}
            />
          ))}
        </div>
      </VtDrawer>
    </>
  );
}

function PermGroup({
  groupKey, label, children, selected, onToggle,
}: {
  groupKey: string;
  label: string;
  children: { key: string; label: string }[];
  selected: Set<string>;
  onToggle: (k: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 py-1">
        <button onClick={() => setOpen((o) => !o)} className="text-text-muted">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 text-foreground">
          <input type="checkbox" className="accent-primary"
            checked={selected.has(groupKey)} onChange={() => onToggle(groupKey)} />
          {label}
        </label>
      </div>
      {open && (
        <div className="ml-6">
          {children.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-1.5 py-1 text-text-secondary">
              <input type="checkbox" className="accent-primary"
                checked={selected.has(c.key)} onChange={() => onToggle(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
