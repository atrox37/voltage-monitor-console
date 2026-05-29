import { createFileRoute } from "@tanstack/react-router";
import { useState, type KeyboardEvent } from "react";
import { Plus, X, Trash2, Minus } from "lucide-react";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, vtInputCls, VtBtn } from "@/components/vt-drawer";

export const Route = createFileRoute("/_app/ingest/components")({
  component: NetworkComponentsPage,
});

type CompType = "MQTT_CLIENT";
const TYPE_OPTIONS: { value: CompType; label: string }[] = [
  { value: "MQTT_CLIENT", label: "MQTT CLIENT" },
];
const TYPE_LABEL: Record<CompType, string> = { MQTT_CLIENT: "MQTT CLIENT" };

type RecruitRow = {
  id: string;
  name: string;
  topic: string;
  payload: string;
  targets: { gateway: boolean; direct: boolean };
};

type NetworkComp = {
  id: string;
  name: string;
  type: CompType;
  org: string;
  updateTime: string;
  enabled: boolean;

  ip: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
  caCert: string;
  sslCert: string;
  sslKey: string;
  topics: string[];
  recruits: RecruitRow[];
};

const seed: NetworkComp[] = [
  {
    id: "1", name: "mqtt-aws", type: "MQTT_CLIENT", org: "Group Root",
    updateTime: "2025-09-17 05:05:16", enabled: false,
    ip: "d08715432na143627x533-ats.iot.us-east-1.amazonaws.com",
    port: 8883, username: "", password: "", ssl: true,
    caCert: "http://192.168.30.10:9000/protocol/ssl/ca.pem",
    sslCert: "http://192.168.30.10:9000/protocol/ssl/client.crt",
    sslKey: "http://192.168.30.10:9000/protocol/ssl/client.key",
    topics: [
      "$share/iotcloud/call-data-reply/#",
      "$share/iotcloud/call-alarm-reply/#",
      "$share/iotcloud/property/MonarchHub/#",
      "$share/iotcloud/alarm/MonarchHub/#",
      "$share/iotcloud/inst-sync-reply/MonarchHub/#",
    ],
    recruits: [
      { id: "r1", name: "设备数据总招", topic: "call-data/MonarchHub", payload: "{}", targets: { gateway: true, direct: false } },
      { id: "r2", name: "告警数据总招", topic: "call-alarm/MonarchHub", payload: "{}", targets: { gateway: true, direct: false } },
    ],
  },
  {
    id: "2", name: "mqtt-client", type: "MQTT_CLIENT", org: "Group Root",
    updateTime: "2025-09-17 05:04:14", enabled: false,
    ip: "192.168.30.10", port: 1883, username: "", password: "", ssl: false,
    caCert: "", sslCert: "", sslKey: "",
    topics: [],
    recruits: [],
  },
];

function NetworkComponentsPage() {
  const [rows, setRows] = useState<NetworkComp[]>(seed);
  const [pickingType, setPickingType] = useState(false);
  const [editing, setEditing] = useState<NetworkComp | null>(null);
  const [adding, setAdding] = useState<CompType | null>(null);

  const handleSave = (c: NetworkComp) => {
    setRows((rs) => {
      const exists = rs.some((r) => r.id === c.id);
      return exists ? rs.map((r) => (r.id === c.id ? c : r)) : [...rs, c];
    });
    setEditing(null);
    setAdding(null);
  };

  return (
    <>
      <ListPageTemplate<NetworkComp>
        title="网络组件"
        filters={[
          { type: "text", key: "name", label: "名称" },
          { type: "select", key: "org", label: "机构", options: [
            { label: "Group Root", value: "Group Root" },
          ] },
          { type: "select", key: "type", label: "组件类型", options: TYPE_OPTIONS.map((t) => ({ label: t.label, value: t.value })) },
        ]}
        columns={[
          { key: "name", title: "名称" },
          { key: "type", title: "类型", render: (r) => TYPE_LABEL[r.type] },
          { key: "org", title: "所属机构" },
          { key: "updateTime", title: "更新日期", render: (r) => <span className="text-text-secondary">{r.updateTime}</span> },
        ]}
        rows={rows}
        onAdd={() => setPickingType(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing(r)}>编辑</RowBtn>
            <RowBtn danger onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>删除</RowBtn>
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
        <ComponentDrawer
          mode={adding ? "add" : "edit"}
          value={editing ?? blankComponent(adding!)}
          onClose={() => { setEditing(null); setAdding(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function blankComponent(type: CompType): NetworkComp {
  return {
    id: String(Date.now()), name: "", type,
    org: "Group Root", enabled: false,
    updateTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    ip: "", port: 1883, username: "", password: "", ssl: false,
    caCert: "", sslCert: "", sslKey: "",
    topics: [], recruits: [],
  };
}

/* ------------------------------------------------------------------ */
/* Type picker — only MQTT_CLIENT for now                              */
/* ------------------------------------------------------------------ */
function TypePickerDialog({
  onPick, onClose,
}: { onPick: (t: CompType) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<CompType>("MQTT_CLIENT");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[420px] overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">选择组件类型</h3>
          <button onClick={onClose} className="rounded p-1 text-text-muted hover:bg-panel hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-4 px-5 py-5">
          <label className="block text-xs text-text-secondary">组件类型</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as CompType)}
            className="h-9 w-full rounded-md border border-panel-border bg-background/40 px-3 text-sm text-foreground outline-none focus:border-primary/60"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-text-muted">目前仅支持 MQTT CLIENT，后续将扩展更多类型。</p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
          <VtBtn onClick={() => onPick(selected)}>下一步</VtBtn>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add / Edit drawer                                                    */
/* ------------------------------------------------------------------ */
function ComponentDrawer({
  mode, value, onClose, onSave,
}: {
  mode: "add" | "edit";
  value: NetworkComp;
  onClose: () => void;
  onSave: (c: NetworkComp) => void;
}) {
  const [d, setD] = useState<NetworkComp>(value);
  const [topicDraft, setTopicDraft] = useState("");
  const [recruitOpen, setRecruitOpen] = useState(false);

  const set = <K extends keyof NetworkComp>(k: K, v: NetworkComp[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  const addTopic = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const v = topicDraft.trim();
    if (!v) return;
    set("topics", [...d.topics, v]);
    setTopicDraft("");
    e.preventDefault();
  };

  return (
    <>
      <VtDrawer
        open
        onClose={onClose}
        title={mode === "add" ? "添加" : "编辑"}
        width={560}
        footer={
          <>
            <VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
            <VtBtn
              onClick={() =>
                onSave({
                  ...d,
                  updateTime: new Date().toISOString().slice(0, 19).replace("T", " "),
                })
              }
            >保存</VtBtn>
          </>
        }
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-text-secondary">类型</span>
          <span className="rounded bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">{TYPE_LABEL[d.type]}</span>
        </div>

        <VtField label="名称" required>
          <input className={vtInputCls} value={d.name} onChange={(e) => set("name", e.target.value)} />
        </VtField>

        <VtField label="状态">
          <button
            type="button"
            onClick={() => set("enabled", !d.enabled)}
            className={`inline-flex h-6 w-12 items-center rounded-full px-0.5 transition ${
              d.enabled ? "bg-primary justify-end" : "bg-panel-heavy justify-start"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-white shadow" />
          </button>
        </VtField>

        <VtField label="ip地址" required>
          <input className={vtInputCls} value={d.ip} onChange={(e) => set("ip", e.target.value)} />
        </VtField>

        <VtField label="服务端口" required>
          <div className="inline-flex items-center overflow-hidden rounded-md border border-panel-border">
            <button
              type="button"
              onClick={() => set("port", Math.max(1, d.port - 1))}
              className="flex h-9 w-9 items-center justify-center bg-panel text-text-secondary hover:text-foreground"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              value={d.port}
              onChange={(e) => set("port", Number(e.target.value) || 0)}
              className="h-9 w-24 border-x border-panel-border bg-background/40 text-center text-sm text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => set("port", d.port + 1)}
              className="flex h-9 w-9 items-center justify-center bg-panel text-text-secondary hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </VtField>

        <VtField label="用户名">
          <input className={vtInputCls} value={d.username} onChange={(e) => set("username", e.target.value)} />
        </VtField>

        <VtField label="密码">
          <input type="password" className={vtInputCls} value={d.password} onChange={(e) => set("password", e.target.value)} />
        </VtField>

        <VtField label="是否SSL">
          <button
            type="button"
            onClick={() => set("ssl", !d.ssl)}
            className={`inline-flex h-6 w-12 items-center rounded-full px-0.5 transition ${
              d.ssl ? "bg-primary justify-end" : "bg-panel-heavy justify-start"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-white shadow" />
          </button>
        </VtField>

        {d.ssl && (
          <>
            <VtField label="CA证书">
              <UploadInput value={d.caCert} onChange={(v) => set("caCert", v)} />
            </VtField>
            <VtField label="SSLCert证书">
              <UploadInput value={d.sslCert} onChange={(v) => set("sslCert", v)} />
            </VtField>
            <VtField label="SSLKey证书">
              <UploadInput value={d.sslKey} onChange={(v) => set("sslKey", v)} />
            </VtField>
          </>
        )}

        <VtField label="主题" full>
          <div className="rounded-md border border-panel-border bg-background/40 p-2">
            <div className="flex flex-wrap gap-1.5">
              {d.topics.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded bg-panel px-2 py-1 text-[11px] text-foreground">
                  {t}
                  <button
                    type="button"
                    onClick={() => set("topics", d.topics.filter((_, idx) => idx !== i))}
                    className="text-text-muted hover:text-status-critical"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                onKeyDown={addTopic}
                placeholder="请输入订阅的主题，回车确认"
                className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-xs text-foreground placeholder:text-text-muted outline-none"
              />
            </div>
          </div>
        </VtField>

        <VtField label="总招" full>
          <div className="rounded-md border border-panel-border">
            <div className="flex items-center border-b border-panel-border bg-panel/40 px-3 py-2 text-[11px] text-text-secondary">
              <div className="w-1/4">名称</div>
              <div className="w-1/3">主题</div>
              <div className="w-1/4">报文</div>
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={() => setRecruitOpen(true)}
                  className="flex h-6 w-6 items-center justify-center rounded border border-panel-border text-text-secondary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            {d.recruits.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-text-muted">暂无数据</div>
            ) : (
              d.recruits.map((r) => (
                <div key={r.id} className="flex items-start border-t border-panel-border/60 px-3 py-2 text-xs text-foreground">
                  <div className="w-1/4 pr-2 break-words">{r.name}</div>
                  <div className="w-1/3 pr-2 break-all text-text-secondary">{r.topic}</div>
                  <div className="w-1/4 pr-2 break-all text-text-secondary">{r.payload}</div>
                  <button
                    type="button"
                    onClick={() => set("recruits", d.recruits.filter((x) => x.id !== r.id))}
                    className="ml-auto text-text-muted hover:text-status-critical"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </VtField>
      </VtDrawer>

      {recruitOpen && (
        <RecruitDialog
          onClose={() => setRecruitOpen(false)}
          onAdd={(r) => { set("recruits", [...d.recruits, r]); setRecruitOpen(false); }}
        />
      )}
    </>
  );
}

function UploadInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileName = value ? value.split("/").pop() ?? "" : "";
  return (
    <div className="flex gap-2">
      <input
        className={`${vtInputCls} cursor-default`}
        readOnly
        placeholder="请选择文件"
        value={fileName}
      />
      <button
        type="button"
        onClick={() => onChange(`http://192.168.30.10:9000/protocol/ssl/uploaded-${Date.now()}.pem`)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-panel-border bg-panel text-text-secondary hover:text-foreground"
      >
        ↑
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recruit row dialog                                                   */
/* ------------------------------------------------------------------ */
function RecruitDialog({
  onClose, onAdd,
}: { onClose: () => void; onAdd: (r: RecruitRow) => void }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [payload, setPayload] = useState("");
  const [gateway, setGateway] = useState(false);
  const [direct, setDirect] = useState(false);

  return (
    <VtDrawer
      open
      onClose={onClose}
      title="新增总招"
      width={480}
      footer={
        <>
          <VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
          <VtBtn
            onClick={() =>
              onAdd({
                id: String(Date.now()),
                name, topic, payload,
                targets: { gateway, direct },
              })
            }
          >
            确定
          </VtBtn>
        </>
      }
    >
      <VtField label="名称" required>
        <input className={vtInputCls} placeholder="请输入名称" value={name} onChange={(e) => setName(e.target.value)} />
      </VtField>
      <VtField label="主题" required>
        <input className={vtInputCls} placeholder="请输入主题" value={topic} onChange={(e) => setTopic(e.target.value)} />
      </VtField>
      <VtField label="报文" full>
        <textarea className={`${vtInputCls} h-24 py-2`} placeholder="请输入报文" value={payload} onChange={(e) => setPayload(e.target.value)} />
      </VtField>
      <VtField label="目标">
        <div className="flex items-center gap-5 text-xs text-foreground">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={gateway} onChange={(e) => setGateway(e.target.checked)} />
            网关
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={direct} onChange={(e) => setDirect(e.target.checked)} />
            直连设备
          </label>
        </div>
      </VtField>
    </VtDrawer>
  );
}

