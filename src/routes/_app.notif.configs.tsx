import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, vtInputCls, VtBtn } from "@/components/vt-drawer";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_app/notif/configs")({
  component: NotifyConfigsPage,
});

type NotifyType = "email" | "awsEmail";
const TYPE_OPTIONS: { value: NotifyType; label: string }[] = [
  { value: "email", label: "邮箱" },
  { value: "awsEmail", label: "AWS邮箱" },
];
const TYPE_LABEL: Record<NotifyType, string> = { email: "邮箱", awsEmail: "AWS邮箱" };

type NotifyConfig = {
  id: string;
  name: string;
  type: NotifyType;
  creator: string;
  org: string;
  createTime: string;
  updateTime: string;
  // email/aws shared fields
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecret: string;
  sendEmail: string;
};

const seed: NotifyConfig[] = [
  {
    id: "1", name: "aws-config", type: "awsEmail", creator: "admin", org: "Group Root",
    createTime: "2024-01-28 05:09:24", updateTime: "2025-02-06 05:12:29",
    smtpHost: "email-smtp.us-east-1.amazonaws.com", smtpPort: 465,
    smtpUser: "AKIA****", smtpSecret: "********", sendEmail: "noreply@example.com",
  },
];

function NotifyConfigsPage() {
  const [rows, setRows] = useState<NotifyConfig[]>(seed);
  const [pickingType, setPickingType] = useState(false);
  const [editing, setEditing] = useState<NotifyConfig | null>(null);
  const [adding, setAdding] = useState<NotifyType | null>(null);
  const [delTarget, setDelTarget] = useState<NotifyConfig | null>(null);

  const handleSave = (c: NotifyConfig) => {
    setRows((rs) => {
      const exists = rs.some((r) => r.id === c.id);
      const next = { ...c, updateTime: new Date().toISOString().slice(0, 19).replace("T", " ") };
      return exists ? rs.map((r) => (r.id === c.id ? next : r)) : [...rs, next];
    });
    setEditing(null);
    setAdding(null);
  };

  return (
    <>
      <ListPageTemplate<NotifyConfig>
        title="通知配置"
        filters={[{ type: "text", key: "name", label: "名称" }]}
        columns={[
          { key: "name", title: "名称" },
          { key: "type", title: "类型", render: (r) => (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">{TYPE_LABEL[r.type]}</span>
          ) },
          { key: "creator", title: "创建人" },
          { key: "org", title: "所属机构" },
          { key: "createTime", title: "创建时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.createTime}</span> },
          { key: "updateTime", title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span> },
        ]}
        rows={rows}
        onAdd={() => setPickingType(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing(r)}>编辑</RowBtn>
            <RowBtn danger onClick={() => setDelTarget(r)}>删除</RowBtn>
          </>
        )}
      />

      {pickingType && (
        <TypePickerDialog
          onPick={(t) => { setPickingType(false); setAdding(t); }}
          onClose={() => setPickingType(false)}
        />
      )}

      {(editing || adding) && (
        <ConfigDrawer
          mode={adding ? "add" : "edit"}
          value={editing ?? blankConfig(adding!)}
          onClose={() => { setEditing(null); setAdding(null); }}
          onSave={handleSave}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          open
          title="删除通知配置"
          message={`确定删除「${delTarget.name}」吗？`}
          onCancel={() => setDelTarget(null)}
          onConfirm={() => {
            setRows((rs) => rs.filter((x) => x.id !== delTarget.id));
            setDelTarget(null);
          }}
        />
      )}
    </>
  );
}

function blankConfig(type: NotifyType): NotifyConfig {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  return {
    id: String(Date.now()), name: "", type, creator: "admin", org: "Group Root",
    createTime: now, updateTime: now,
    smtpHost: "", smtpPort: 465, smtpUser: "", smtpSecret: "", sendEmail: "",
  };
}

/* ---- Type picker dialog (dropdown) ---- */
function TypePickerDialog({
  onPick, onClose,
}: { onPick: (t: NotifyType) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<NotifyType>("email");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[420px] overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">选择通知类型</h3>
        </header>
        <div className="space-y-3 px-5 py-5">
          <label className="block text-xs text-text-secondary">通知类型</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as NotifyType)}
            className="h-9 w-full rounded-md border border-panel-border bg-background/40 px-3 text-sm text-foreground outline-none focus:border-primary/60"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-text-muted">目前仅支持邮箱 / AWS邮箱，后续将扩展更多通道。</p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
          <VtBtn onClick={() => onPick(selected)}>下一步</VtBtn>
        </footer>
      </div>
    </div>
  );
}

/* ---- Add/Edit drawer ---- */
function ConfigDrawer({
  mode, value, onClose, onSave,
}: {
  mode: "add" | "edit";
  value: NotifyConfig;
  onClose: () => void;
  onSave: (c: NotifyConfig) => void;
}) {
  const [d, setD] = useState<NotifyConfig>(value);
  const set = <K extends keyof NotifyConfig>(k: K, v: NotifyConfig[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  return (
    <VtDrawer
      open
      onClose={onClose}
      title={`${TYPE_LABEL[d.type]}配置`}
      width={520}
      footer={
        <>
          <VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
          <VtBtn onClick={() => onSave(d)}>保存</VtBtn>
        </>
      }
    >
      {/* Top type switcher — only enabled in add mode */}
      <div className="mb-5">
        <div className="inline-flex overflow-hidden rounded-md border border-panel-border">
          {TYPE_OPTIONS.map((t) => {
            const active = d.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                disabled={mode === "edit"}
                onClick={() => set("type", t.value)}
                className={`px-4 py-1.5 text-xs transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-panel text-text-secondary hover:text-foreground"
                } ${mode === "edit" ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <VtField label="名称" required>
        <input className={vtInputCls} placeholder="请输入名称" value={d.name} onChange={(e) => set("name", e.target.value)} />
      </VtField>

      <VtField label="smtp地址" required>
        <input className={vtInputCls} placeholder="请输入smtp地址" value={d.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} />
      </VtField>

      <VtField label="smtp端口" required>
        <input type="number" className={vtInputCls} value={d.smtpPort} onChange={(e) => set("smtpPort", Number(e.target.value) || 0)} />
      </VtField>

      <VtField label="smtp用户" required>
        <input className={vtInputCls} placeholder="请输入smtp用户" value={d.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} />
      </VtField>

      <VtField label="smtp秘钥" required>
        <input type="password" className={vtInputCls} placeholder="请输入smtp秘钥" value={d.smtpSecret} onChange={(e) => set("smtpSecret", e.target.value)} />
      </VtField>

      <VtField label="发送邮箱" required>
        <input className={vtInputCls} placeholder="请输入发送邮箱" value={d.sendEmail} onChange={(e) => set("sendEmail", e.target.value)} />
      </VtField>
    </VtDrawer>
  );
}
