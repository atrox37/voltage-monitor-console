import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RefreshCw, PlayCircle } from "lucide-react";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, vtInputCls, VtBtn, VtSegmented } from "@/components/vt-drawer";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_app/ingest/protocols")({
  component: ProtocolsPage,
});

type Protocol = {
  id: string;
  name: string;
  type: "MQTT客户端" | "kafka客户端";
  gatewayCount: number;
  org: string;
  storage: "S3" | "Minio";
  pkg: string;
  uploadUrl: string;
  description: string;
  updateTime: string;
};

const seed: Protocol[] = [
  { id: "1", name: "mqtt-client", type: "MQTT客户端", gatewayCount: 1, org: "Group Root", storage: "Minio", pkg: "com.protocol.mqtt.MqttProtocolSupport", uploadUrl: "http://192.168.30.10:39000/protocol/protocol/mqtt.jar", description: "默认 MQTT 客户端协议", updateTime: "2025-08-29 02:29:55" },
  { id: "2", name: "voltage-v1", type: "MQTT客户端", gatewayCount: 1, org: "Group Root", storage: "Minio", pkg: "com.protocol.voltage.VoltageProtocolSupport", uploadUrl: "http://192.168.30.10:39000/protocol/protocol/voltage.jar", description: "11", updateTime: "2025-08-29 02:29:55" },
  { id: "3", name: "kafka-v1",   type: "kafka客户端", gatewayCount: 0, org: "Group Root", storage: "S3",    pkg: "com.protocol.kafka.KafkaProtocolSupport", uploadUrl: "http://192.168.30.10:39000/protocol/protocol/kafka.jar", description: "", updateTime: "2025-01-14 08:39:24" },
];

function ProtocolsPage() {
  const [rows, setRows] = useState<Protocol[]>(seed);
  const [editing, setEditing] = useState<Protocol | null>(null);
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState<Protocol | null>(null);
  const [syncTarget, setSyncTarget] = useState<Protocol | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleSync = (p: Protocol) => {
    setRows((rs) =>
      rs.map((r) =>
        r.id === p.id
          ? { ...r, updateTime: new Date().toISOString().slice(0, 19).replace("T", " ") }
          : r,
      ),
    );
    showToast(`已同步协议 ${p.name}`);
    setSyncTarget(null);
  };

  const handleDelete = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const handleSave = (p: Protocol) => {
    setRows((rs) => {
      const exists = rs.some((r) => r.id === p.id);
      return exists ? rs.map((r) => (r.id === p.id ? p : r)) : [...rs, p];
    });
    setEditing(null);
    setAdding(false);
    showToast("已保存");
  };

  return (
    <>
      <ListPageTemplate<Protocol>
        title="协议库"
        filters={[
          { type: "text", key: "name", label: "名称" },
          { type: "select", key: "org", label: "机构", options: [
            { label: "Group Root", value: "Group Root" },
            { label: "Group Children1", value: "Group Children1" },
          ] },
        ]}
        columns={[
          { key: "name", title: "协议名称" },
          { key: "type", title: "支持类型", render: (r) => (
            <span className={`rounded px-2 py-0.5 text-[11px] ${
              r.type === "kafka客户端"
                ? "bg-status-warning/15 text-status-warning"
                : "bg-status-online/15 text-status-online"
            }`}>{r.type}</span>
          ) },
          { key: "gatewayCount", title: "是否关联网关", render: (r) => (
            r.gatewayCount > 0
              ? <span className="inline-flex items-center gap-1.5">
                  <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">是</span>
                  <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">已绑定 {r.gatewayCount} 个网关</span>
                </span>
              : <span className="rounded bg-status-warning/15 px-1.5 py-0.5 text-[11px] text-status-warning">否</span>
          ) },
          { key: "org", title: "所属机构" },
          { key: "updateTime", title: "更新时间", render: (r) => <span className="text-text-secondary">{r.updateTime}</span> },
        ]}
        rows={rows}
        onAdd={() => setAdding(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing(r)}>编辑</RowBtn>
            <RowBtn icon={RefreshCw} onClick={() => setSyncTarget(r)}>同步</RowBtn>
            <RowBtn icon={PlayCircle} onClick={() => setTesting(r)}>测试</RowBtn>
            <RowBtn
              danger
              disabled={r.gatewayCount > 0}
              onClick={() => handleDelete(r.id)}
            >
              删除
            </RowBtn>
          </>
        )}
      />

      {(editing || adding) && (
        <ProtocolDrawer
          mode={adding ? "add" : "edit"}
          value={editing ?? {
            id: String(Date.now()),
            name: "", type: "MQTT客户端", gatewayCount: 0,
            org: "Group Root", storage: "Minio",
            pkg: "", uploadUrl: "", description: "",
            updateTime: new Date().toISOString().slice(0, 19).replace("T", " "),
          }}
          onClose={() => { setEditing(null); setAdding(false); }}
          onSave={handleSave}
        />
      )}

      {testing && <KafkaTestDrawer protocol={testing} onClose={() => setTesting(null)} />}

      <ConfirmDialog
        open={!!syncTarget}
        title="同步协议"
        description={<>确定要同步协议 <span className="font-semibold text-foreground">{syncTarget?.name}</span> 到所有已绑定的网关吗？</>}
        confirmText="同步"
        onConfirm={() => syncTarget && handleSync(syncTarget)}
        onClose={() => setSyncTarget(null)}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-status-online/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

function ProtocolDrawer({
  mode, value, onClose, onSave,
}: {
  mode: "add" | "edit";
  value: Protocol;
  onClose: () => void;
  onSave: (p: Protocol) => void;
}) {
  const [draft, setDraft] = useState<Protocol>(value);
  const set = <K extends keyof Protocol>(k: K, v: Protocol[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <VtDrawer
      open
      onClose={onClose}
      title={mode === "add" ? "添加" : "编辑"}
      width={520}
      footer={
        <>
          <VtBtn variant="ghost" onClick={onClose}>取消</VtBtn>
          <VtBtn onClick={() => onSave(draft)}>保存</VtBtn>
        </>
      }
    >
      <VtField label="名称" required>
        <input className={vtInputCls} placeholder="请输入名称"
          value={draft.name} onChange={(e) => set("name", e.target.value)} />
      </VtField>

      {mode === "edit" && (
        <VtField label="支持协议">
          <span className="rounded bg-status-online/15 px-2 py-1 text-xs text-status-online">{draft.type}</span>
        </VtField>
      )}

      <VtField label="存储目标" required>
        <VtSegmented
          value={draft.storage}
          onChange={(v) => set("storage", v)}
          options={[{ label: "S3", value: "S3" }, { label: "Minio", value: "Minio" }]}
        />
      </VtField>

      <VtField label="包名" required>
        <input className={vtInputCls} placeholder="请输入包名"
          value={draft.pkg} onChange={(e) => set("pkg", e.target.value)} />
      </VtField>

      <VtField label="上传" required>
        <div className="flex gap-2">
          <input className={vtInputCls} placeholder=""
            value={draft.uploadUrl} onChange={(e) => set("uploadUrl", e.target.value)} />
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-panel-border bg-panel text-text-secondary hover:text-foreground"
            title="选择文件"
          >
            ↑
          </button>
        </div>
      </VtField>

      <VtField label="描述">
        <input className={vtInputCls} placeholder="请输入描述消息"
          value={draft.description} onChange={(e) => set("description", e.target.value)} />
      </VtField>
    </VtDrawer>
  );
}

function KafkaTestDrawer({ protocol, onClose }: { protocol: Protocol; onClose: () => void }) {
  const [topic, setTopic] = useState("");
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <VtDrawer
      open
      onClose={onClose}
      title={`${protocol.type === "kafka客户端" ? "Kafka" : protocol.type}协议测试`}
      width={520}
      footer={
        <VtBtn
          onClick={() =>
            setResult(`✓ 已向 topic "${topic || "(empty)"}" 发送 ${payload.length} 字节`)
          }
        >
          测试
        </VtBtn>
      }
    >
      <VtField label="主题">
        <input className={vtInputCls} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </VtField>
      <VtField label="发送报文" full>
        <textarea
          className={`${vtInputCls} h-28 py-2`}
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
        />
      </VtField>
      {result && (
        <div className="rounded-md border border-status-online/40 bg-status-online/10 px-3 py-2 text-xs text-status-online">
          {result}
        </div>
      )}
    </VtDrawer>
  );
}
