import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { vtActionColumn } from "@/lib/table-utils";

import type { SimpleFunctionParam } from "@/types/api/metadata";

export function ArgSection({
  title,
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  items: SimpleFunctionParam[];
  onAdd: () => void;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  type ArgRow = SimpleFunctionParam & { index: number };
  const rows: ArgRow[] = items.map((item, index) => ({ ...item, index }));
  const columns: ColumnsType<ArgRow> = [
    {
      key: "id",
      title: "标识",
      dataIndex: "id",
      render: (v) => <span className="font-mono text-[11px] text-text-secondary">{v}</span>,
    },
    { key: "name", title: "名称", dataIndex: "name" },
    {
      key: "type",
      title: "类型",
      render: (_, row) => <span className="text-text-muted">{row.valueType?.type ?? "—"}</span>,
    },
    vtActionColumn<ArgRow>(
      "操作",
      (row) => (
        <>
          <button
            type="button"
            onClick={() => onEdit(row.index)}
            className="mx-0.5 rounded p-1 text-text-muted hover:text-primary"
          >
            <EditOutlined className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.index)}
            className="mx-0.5 rounded p-1 text-text-muted hover:text-status-critical"
          >
            <DeleteOutlined className="h-3 w-3" />
          </button>
        </>
      ),
      100,
    ),
  ];
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary">{title}</span>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-0.5 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary"
        >
          <PlusOutlined className="h-3 w-3" /> 添加
        </button>
      </div>
      <div className="overflow-hidden rounded border border-panel-border">
        <Table<ArgRow>
          rowKey="index"
          size="small"
          pagination={false}
          className="vt-ant-data-table"
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: "暂无参数" }}
        />
      </div>
    </div>
  );
}
