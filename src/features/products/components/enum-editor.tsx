import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Input, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { EnumDataItem } from "@/types/api/metadata";

export function EnumEditor({
  data,
  onChange,
}: {
  data: EnumDataItem[];
  onChange: (d: EnumDataItem[]) => void;
}) {
  const update = (i: number, patch: Partial<EnumDataItem>) =>
    onChange(data.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  type EnumRow = { index: number; item: EnumDataItem };
  const rows: EnumRow[] = data.map((item, index) => ({ index, item }));
  const columns: ColumnsType<EnumRow> = [
    {
      key: "enumKey",
      title: "Key (数值)",
      render: (_, row) => (
        <Input
          size="small"
          value={row.item.key}
          onChange={(e) => update(row.index, { key: e.target.value })}
        />
      ),
    },
    {
      key: "enumValue",
      title: "显示文本",
      render: (_, row) => (
        <Input
          size="small"
          value={row.item.value}
          onChange={(e) => update(row.index, { value: e.target.value })}
        />
      ),
    },
    {
      key: "actions",
      title: (
        <button
          type="button"
          onClick={() => onChange([...data, { key: "", value: "" }])}
          className="rounded p-0.5 text-text-muted hover:text-primary"
        >
          <PlusOutlined className="h-3.5 w-3.5" />
        </button>
      ),
      width: 64,
      align: "right",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => onChange(data.filter((_, idx) => idx !== row.index))}
          className="rounded p-1 text-text-muted hover:bg-status-critical/10 hover:text-status-critical"
        >
          <DeleteOutlined className="h-3 w-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded border border-panel-border">
      <Table<EnumRow>
        rowKey="index"
        size="small"
        pagination={false}
        className="vt-ant-data-table"
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: "暂无枚举值" }}
      />
    </div>
  );
}
