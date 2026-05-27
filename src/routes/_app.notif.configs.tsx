import { createFileRoute } from "@tanstack/react-router";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";

export const Route = createFileRoute("/_app/notif/configs")({
  component: NotifyConfigsPage,
});

type NotifyConfig = {
  id: string;
  name: string;
  type: "email" | "awsEmail";
  creator: string;
  org: string;
  createTime: string;
  updateTime: string;
};

const TYPE_LABEL: Record<NotifyConfig["type"], string> = { email: "邮箱", awsEmail: "AWS邮箱" };

const rows: NotifyConfig[] = [
  { id: "1", name: "运维告警 - 邮箱",        type: "email",    creator: "admin",        org: "Group Root",      createTime: "2026-05-01 09:21:00", updateTime: "2026-05-12 09:20:00" },
  { id: "2", name: "高优告警 - AWS",          type: "awsEmail", creator: "root",         org: "Group Children1", createTime: "2026-04-21 10:12:55", updateTime: "2026-05-10 17:55:11" },
  { id: "3", name: "日报推送",                type: "email",    creator: "zhiyuan.wang", org: "Group Root",      createTime: "2026-03-15 14:08:30", updateTime: "2026-04-21 11:10:42" },
];

function NotifyConfigsPage() {
  return (
    <ListPageTemplate<NotifyConfig>
      title="通知配置"
      filters={[{ type: "text", key: "name", label: "名称" }]}
      columns={[
        { key: "name",       title: "名称" },
        { key: "type",       title: "类型", render: (r) => (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">{TYPE_LABEL[r.type]}</span>
        ) },
        { key: "creator",    title: "创建人" },
        { key: "org",        title: "所属机构" },
        { key: "createTime", title: "创建时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.createTime}</span> },
        { key: "updateTime", title: "更新时间", render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span> },
      ]}
      rows={rows}
      onAdd={() => alert("新增通知配置")}
      rowActions={() => (<><RowBtn>编辑</RowBtn><RowBtn danger>删除</RowBtn></>)}
    />
  );
}
