import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, vtInputCls, VtBtn } from "@/components/vt-drawer";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_app/notif/templates")({
  component: NotifyTemplatesPage,
});

type NotifyType = "email" | "awsEmail";
const TYPE_LABEL: Record<NotifyType, string> = { email: "邮箱", awsEmail: "AWS邮箱" };

type ConfigOption = { id: string; name: string; type: NotifyType };
const CONFIG_OPTIONS: ConfigOption[] = [
  { id: "1", name: "aws-config", type: "awsEmail" },
];

type NotifyTemplate = {
  id: string;
  name: string;
  configId: string;
  contentTitle: string;
  contentBody: string;
  variables: Record<string, string>; // e.g. { content: "none" }
  points: Record<string, string>;    // e.g. { N1M: "none", N2M: "none", N3M: "none" }
  creator: string;
  org: string;
  createTime: string;
  updateTime: string;
};

const seed: NotifyTemplate[] = [
  {
    id: "1",
    name: "station alarm",
    configId: "1",
    contentTitle: "station alarm",
    contentBody: "{#N1M},{#N2M},{#N3M},{$content}",
    variables: { content: "none" },
    points: { N1M: "none", N2M: "none", N3M: "none" },
    creator: "admin",
    org: "Group Root",
    createTime: "2026-04-15 13:42:20",
    updateTime: "2026-04-15 13:42:20",
  },
  {
    id: "2",
    name: "template22",
    configId: "1",
    contentTitle: "template22",
    contentBody: "{$content}",
    variables: { content: "none" },
    points: {},
    creator: "admin",
    org: "Group Root",
    createTime: "2024-01-28 05:12:06",
    updateTime: "2025-02-04 05:49:20",
  },
];

const RECIPIENTS = ["admin@example.com", "ops@example.com", "alert@example.com"];

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function NotifyTemplatesPage() {
  const [rows, setRows] = useState<NotifyTemplate[]>(seed);
  const [pickingConfig, setPickingConfig] = useState(false);
  const [editing, setEditing] = useState<NotifyTemplate | null>(null);
  const [adding, setAdding] = useState<NotifyTemplate | null>(null);
  const [delTarget, setDelTarget] = useState<NotifyTemplate | null>(null);

  const configById = useMemo(
    () => Object.fromEntries(CONFIG_OPTIONS.map((c) => [c.id, c])) as Record<string, ConfigOption>,
    [],
  );

  const handleSave = (t: NotifyTemplate) => {
    setRows((rs) => {
      const exists = rs.some((r) => r.id === t.id);
      const next = { ...t, updateTime: nowStr() };
      return exists ? rs.map((r) => (r.id === t.id ? next : r)) : [...rs, next];
    });
    setEditing(null);
    setAdding(null);
  };

  return (
    <>
      <ListPageTemplate<NotifyTemplate>
        title="通知模板"
        filters={[{ type: "text", key: "name", label: "名称" }]}
        columns={[
          { key: "name", title: "模板名称" },
          {
            key: "config",
            title: "通知配置",
            render: (r) => configById[r.configId]?.name ?? "-",
          },
          {
            key: "type",
            title: "模板类型",
            render: (r) => {
              const t = configById[r.configId]?.type ?? "email";
              return (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">
                  {TYPE_LABEL[t]}
                </span>
              );
            },
          },
          { key: "creator", title: "创建人" },
          { key: "org", title: "所属机构" },
          {
            key: "createTime",
            title: "创建时间",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.createTime}</span>,
          },
          {
            key: "updateTime",
            title: "更新时间",
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span>,
          },
        ]}
        rows={rows}
        onAdd={() => setPickingConfig(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing(r)}>编辑</RowBtn>
            <RowBtn onClick={() => setEditing(r)}>预览</RowBtn>
            <RowBtn danger onClick={() => setDelTarget(r)}>删除</RowBtn>
          </>
        )}
      />

      {pickingConfig && (
        <AddTemplateDialog
          onCancel={() => setPickingConfig(false)}
          onNext={(name, configId) => {
            setPickingConfig(false);
            setAdding(blankTemplate(name, configId));
          }}
        />
      )}

      {(editing || adding) && (
        <TemplateDrawer
          mode={adding ? "add" : "edit"}
          value={editing ?? adding!}
          configs={CONFIG_OPTIONS}
          onClose={() => { setEditing(null); setAdding(null); }}
          onSave={handleSave}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          open
          title="删除模板"
          description={`确定删除「${delTarget.name}」吗？`}
          danger
          onClose={() => setDelTarget(null)}
          onConfirm={() => {
            setRows((rs) => rs.filter((x) => x.id !== delTarget.id));
            setDelTarget(null);
          }}
        />
      )}
    </>
  );
}

function blankTemplate(name: string, configId: string): NotifyTemplate {
  const now = nowStr();
  return {
    id: String(Date.now()),
    name,
    configId,
    contentTitle: name,
    contentBody: "{$content}",
    variables: { content: "none" },
    points: { N1M: "none", N2M: "none", N3M: "none" },
    creator: "admin",
    org: "Group Root",
    createTime: now,
    updateTime: now,
  };
}

/* ---- Add dialog: name + config picker ---- */
function AddTemplateDialog({
  onCancel,
  onNext,
}: {
  onCancel: () => void;
  onNext: (name: string, configId: string) => void;
}) {
  const [name, setName] = useState("");
  const [configId, setConfigId] = useState("");
  const valid = name.trim() && configId;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[460px] overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">添加模板</h3>
        </header>
        <div className="space-y-4 px-5 py-5">
          <VtField label="通知名称" required>
            <input
              className={vtInputCls}
              placeholder="请输入通知名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </VtField>
          <VtField label="通知配置" required>
            <select
              className={vtInputCls}
              value={configId}
              onChange={(e) => setConfigId(e.target.value)}
            >
              <option value="">Select</option>
              {CONFIG_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </VtField>
        </div>
        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn variant="ghost" onClick={onCancel}>取消</VtBtn>
          <VtBtn disabled={!valid} onClick={() => valid && onNext(name.trim(), configId)}>下一步</VtBtn>
        </footer>
      </div>
    </div>
  );
}

/* ---- Template detail drawer ---- */
function TemplateDrawer({
  mode,
  value,
  configs,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  value: NotifyTemplate;
  configs: ConfigOption[];
  onClose: () => void;
  onSave: (t: NotifyTemplate) => void;
}) {
  const [d, setD] = useState<NotifyTemplate>(value);
  const [testOpen, setTestOpen] = useState(false);
  const cfg = configs.find((c) => c.id === d.configId);
  const set = <K extends keyof NotifyTemplate>(k: K, v: NotifyTemplate[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  // Extract placeholders from body
  const tokens = useMemo(() => {
    const vars = new Set<string>();
    const pts = new Set<string>();
    const re = /\{([#$])([A-Za-z0-9_]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d.contentBody)) !== null) {
      (m[1] === "$" ? vars : pts).add(m[2]);
    }
    return { vars: [...vars], pts: [...pts] };
  }, [d.contentBody]);

  const upsertVar = (k: string, v: string) =>
    setD((x) => ({ ...x, variables: { ...x.variables, [k]: v } }));
  const upsertPt = (k: string, v: string) =>
    setD((x) => ({ ...x, points: { ...x.points, [k]: v } }));

  return (
    <>
      <VtDrawer
        open
        onClose={onClose}
        title="模板详情"
        width={640}
        footer={
          <>
            <VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
            <VtBtn variant="ghost" onClick={() => setTestOpen(true)}>测试</VtBtn>
            <VtBtn onClick={() => onSave(d)}>保存模板</VtBtn>
          </>
        }
      >
        <section className="mb-6">
          <h4 className="mb-4 border-b border-panel-border pb-2 text-sm font-semibold text-foreground">基本信息</h4>
          <VtField label="模板名称" required>
            <input className={vtInputCls} value={d.name} onChange={(e) => set("name", e.target.value)} />
          </VtField>
          <VtField label="通知配置" required>
            <div className="flex items-center gap-2">
              {cfg && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">
                  {TYPE_LABEL[cfg.type]}
                </span>
              )}
              <select
                className={vtInputCls}
                disabled={mode === "edit"}
                value={d.configId}
                onChange={(e) => set("configId", e.target.value)}
              >
                {configs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </VtField>
          <VtField label="内容标题" required>
            <input className={vtInputCls} value={d.contentTitle} onChange={(e) => set("contentTitle", e.target.value)} />
          </VtField>
          <VtField label="内容正文" required full>
            <textarea
              className={`${vtInputCls} h-28 py-2`}
              value={d.contentBody}
              onChange={(e) => set("contentBody", e.target.value)}
              placeholder="支持占位符：{$变量名} 表示模板变量；{#点位名} 表示模板点位"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              语法：<code>{"{$content}"}</code> 表示变量；<code>{"{#N1M}"}</code> 表示点位。修改正文后下方默认值会自动同步。
            </p>
          </VtField>
        </section>

        <section className="mb-6">
          <h4 className="mb-4 border-b border-panel-border pb-2 text-sm font-semibold text-foreground">模板变量默认值</h4>
          {tokens.vars.length === 0 ? (
            <p className="text-xs text-text-muted">正文中未检测到 {"{$变量}"} 占位符。</p>
          ) : (
            tokens.vars.map((v) => (
              <VtField key={v} label={v}>
                <input
                  className={vtInputCls}
                  value={d.variables[v] ?? ""}
                  onChange={(e) => upsertVar(v, e.target.value)}
                  placeholder="none"
                />
              </VtField>
            ))
          )}
        </section>

        <section>
          <h4 className="mb-4 border-b border-panel-border pb-2 text-sm font-semibold text-foreground">模板点位默认值</h4>
          {tokens.pts.length === 0 ? (
            <p className="text-xs text-text-muted">正文中未检测到 {"{#点位}"} 占位符。</p>
          ) : (
            tokens.pts.map((p) => (
              <VtField key={p} label={p}>
                <input
                  className={vtInputCls}
                  value={d.points[p] ?? ""}
                  onChange={(e) => upsertPt(p, e.target.value)}
                  placeholder="none"
                />
              </VtField>
            ))
          )}
        </section>
      </VtDrawer>

      {testOpen && (
        <TestSendDialog
          onCancel={() => setTestOpen(false)}
          onSend={(receiver) => {
            setTestOpen(false);
            alert(`已向 ${receiver} 发送测试通知`);
          }}
        />
      )}
    </>
  );
}

/* ---- Test send dialog ---- */
function TestSendDialog({
  onCancel,
  onSend,
}: {
  onCancel: () => void;
  onSend: (receiver: string) => void;
}) {
  const [receiver, setReceiver] = useState("");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[460px] overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">选择收件人</h3>
        </header>
        <div className="px-5 py-5">
          <VtField label="收件人" required>
            <select
              className={vtInputCls}
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
            >
              <option value="">请选择收件人</option>
              {RECIPIENTS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </VtField>
        </div>
        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn variant="ghost" onClick={onCancel}>取消</VtBtn>
          <VtBtn disabled={!receiver} onClick={() => receiver && onSend(receiver)}>发送测试</VtBtn>
        </footer>
      </div>
    </div>
  );
}
