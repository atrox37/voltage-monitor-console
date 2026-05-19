import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/notif/configs")({
  component: NotifConfigsPage,
});

type Cfg = {
  id: string; name: string; trigger: string; level: 1 | 2 | 3;
  channels: string; enabled: boolean; updatedAt: string;
};

const rows: Cfg[] = [
  { id: "1", name: "通信中断告警",   trigger: "device.offline > 5min",   level: 1, channels: "Email, 短信, Webhook", enabled: true,  updatedAt: "2026-05-10 09:00:00" },
  { id: "2", name: "电压偏低",       trigger: "voltage < 360V",          level: 2, channels: "Email",               enabled: true,  updatedAt: "2026-04-21 11:15:42" },
  { id: "3", name: "组件温度偏高",   trigger: "temp > 65°C",             level: 3, channels: "站内信",              enabled: true,  updatedAt: "2026-04-12 16:30:10" },
  { id: "4", name: "柴发启动延迟",   trigger: "dg.start_delay > 30s",    level: 2, channels: "Email, Webhook",      enabled: false, updatedAt: "2026-03-15 08:42:18" },
];

function NotifConfigsPage() {
  return (
    <ListPageTemplate<Cfg>
      title="通知配置列表"
      filters={[
        { type: "text",   key: "name",  label: "配置名" },
        { type: "select", key: "level", label: "级别",
          options: [{label:"严重",value:"1"},{label:"警告",value:"2"},{label:"提示",value:"3"}] },
      ]}
      columns={[
        { key: "name",     title: "配置名" },
        { key: "trigger",  title: "触发条件", render: (r) => <code className="rounded bg-panel-heavy px-1.5 py-0.5 font-mono text-xs">{r.trigger}</code> },
        { key: "level",    title: "级别", render: (r) => (
          <span className={`alarm-level--${r.level} inline-flex items-center gap-1`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {r.level===1?"严重":r.level===2?"警告":"提示"}
          </span>
        )},
        { key: "channels", title: "通道", render: (r) => <span className="text-text-secondary">{r.channels}</span> },
        { key: "enabled",  title: "启用", render: (r) => (
          <span className={`rounded px-2 py-0.5 text-[11px] ${r.enabled?"bg-status-online/15 text-status-online":"bg-panel-heavy text-text-muted"}`}>
            {r.enabled ? "开" : "关"}
          </span>
        )},
        { key: "updatedAt", title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增配置")}
      rowActions={(r) => (<><RowBtn>编辑</RowBtn><RowBtn>{r.enabled?"停用":"启用"}</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
