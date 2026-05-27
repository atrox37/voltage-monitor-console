import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/notif/templates")({
  component: NotifyTemplatesPage,
});

type NotifyTemplate = {
  id: string;
  name: string;
  config: string;
  type: "email" | "awsEmail";
  creator: string;
  org: string;
  updateTime: string;
};

const TYPE_LABEL: Record<NotifyTemplate["type"], string> = { email: "邮箱", awsEmail: "AWS邮箱" };

const rows: NotifyTemplate[] = [
  { id: "1", name: "设备离线告警",  config: "运维告警 - 邮箱",  type: "email",    creator: "admin",        org: "Group Root",      updateTime: "2026-05-12 09:20:00" },
  { id: "2", name: "电池过温告警",  config: "高优告警 - AWS",   type: "awsEmail", creator: "root",         org: "Group Children1", updateTime: "2026-05-10 17:55:11" },
  { id: "3", name: "日报模板",      config: "日报推送",          type: "email",    creator: "zhiyuan.wang", org: "Group Root",      updateTime: "2026-04-21 11:10:42" },
];

function NotifyTemplatesPage() {
  return (
    <ListPageTemplate<NotifyTemplate>
      title="通知模板"
      filters={[{ type: "text", key: "name", label: "名称" }]}
      columns={[
        { key: "name",       title: "模板名称" },
        { key: "config",     title: "通知配置" },
        { key: "type",       title: "模板类型", render: (r) => (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">{TYPE_LABEL[r.type]}</span>
        ) },
        { key: "creator",    title: "创建人" },
        { key: "org",        title: "所属机构" },
        { key: "updateTime", title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("添加模板")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn>预览</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
