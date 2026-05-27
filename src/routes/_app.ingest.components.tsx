import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/ingest/components")({
  component: NetworkComponentsPage,
});

type NetworkComp = {
  id: string;
  name: string;
  type: string;
  org: string;
  updateTime: string;
  switchStatus: "started" | "stopped";
  connectStatus: "connected" | "notConnected" | "connecting";
};

const rows: NetworkComp[] = [
  { id: "1", name: "MQTT-EAST",   type: "MQTT客户端", org: "Group Root",      updateTime: "2026-05-12 09:20:00", switchStatus: "started", connectStatus: "connected" },
  { id: "2", name: "TCP-SOUTH",   type: "TCP服务",    org: "Group Children1", updateTime: "2026-05-10 17:55:11", switchStatus: "started", connectStatus: "connecting" },
  { id: "3", name: "MQTT-NORTH",  type: "MQTT客户端", org: "Group Root",      updateTime: "2026-04-21 11:10:42", switchStatus: "stopped", connectStatus: "notConnected" },
];

const SWITCH_MAP = {
  started: { cls: "text-status-online bg-status-online/15",   label: "启动" },
  stopped: { cls: "text-text-muted bg-panel-heavy",           label: "关闭" },
} as const;
const CONN_MAP = {
  connected:    { cls: "text-status-online bg-status-online/15",     label: "已连接" },
  notConnected: { cls: "text-status-critical bg-status-critical/15", label: "未连接" },
  connecting:   { cls: "text-status-warning bg-status-warning/15",   label: "正在连接" },
} as const;

function Pill({ cls, label }: { cls: string; label: string }) {
  return <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

function NetworkComponentsPage() {
  return (
    <ListPageTemplate<NetworkComp>
      title="网络组件"
      filters={[
        { type: "text",   key: "name", label: "名称" },
        { type: "text",   key: "org",  label: "机构" },
        { type: "select", key: "type", label: "组件类型",
          options: [
            { label: "MQTT客户端", value: "MQTT客户端" },
            { label: "TCP服务",    value: "TCP服务" },
          ] },
      ]}
      columns={[
        { key: "name",          title: "名称" },
        { key: "type",          title: "类型" },
        { key: "org",           title: "所属机构" },
        { key: "updateTime",    title: "更新日期", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span> },
        { key: "switchStatus",  title: "开关状态", render: (r) => <Pill map={SWITCH_MAP} k={r.switchStatus} /> },
        { key: "connectStatus", title: "连接状态", render: (r) => <Pill map={CONN_MAP} k={r.connectStatus} /> },
      ]}
      rows={rows}
      onAdd={() => alert("新增网络组件")}
      rowActions={(r) => (
        <>
          <RowBtn>编辑</RowBtn>
          <RowBtn>{r.switchStatus === "started" ? "停用" : "启用"}</RowBtn>
          <RowBtn>测试连通</RowBtn>
          <RowBtn danger>删除</RowBtn>
        </>
      )}
    />
  );
}
