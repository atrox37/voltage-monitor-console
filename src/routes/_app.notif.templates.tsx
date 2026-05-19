import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/notif/templates")({
  component: TemplatesPage,
});

type Tpl = { id: string; name: string; channel: string; subject: string; usedBy: number; updatedAt: string };

const rows: Tpl[] = [
  { id: "1", name: "通信中断_邮件",      channel: "Email",   subject: "【严重】设备 {{device}} 通信中断",     usedBy: 3, updatedAt: "2026-05-10 09:00:00" },
  { id: "2", name: "通信中断_短信",      channel: "SMS",     subject: "设备 {{device}} 离线请处理",          usedBy: 1, updatedAt: "2026-05-10 09:00:00" },
  { id: "3", name: "电压告警_邮件",      channel: "Email",   subject: "【警告】{{site}} 电压偏低 {{value}}V", usedBy: 2, updatedAt: "2026-04-21 11:15:42" },
  { id: "4", name: "通用_Webhook",       channel: "Webhook", subject: "POST /alarm — payload JSON",         usedBy: 5, updatedAt: "2026-04-01 14:08:22" },
];

function TemplatesPage() {
  return (
    <ListPageTemplate<Tpl>
      title="通知模板"
      filters={[
        { type: "text",   key: "name",    label: "模板名" },
        { type: "select", key: "channel", label: "通道",
          options: [{label:"Email",value:"Email"},{label:"SMS",value:"SMS"},{label:"Webhook",value:"Webhook"},{label:"站内信",value:"站内信"}] },
      ]}
      columns={[
        { key: "name",     title: "模板名" },
        { key: "channel",  title: "通道", render: (r) => <span className="rounded bg-energy-ess/15 px-1.5 py-0.5 text-xs text-energy-ess">{r.channel}</span> },
        { key: "subject",  title: "主题 / 内容", render: (r) => <span className="text-text-secondary">{r.subject}</span> },
        { key: "usedBy",   title: "被引用", align: "right" },
        { key: "updatedAt",title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updatedAt}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增模板")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn>预览</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
