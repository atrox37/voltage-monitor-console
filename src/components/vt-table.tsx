import { useEffect, useRef, useState, type ReactNode } from "react";
import { Table } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";

const TABLE_BODY_BG = "#141b2e";
const TABLE_HEAD_BG = "#192237";
const TABLE_HOVER_BG = "#1e283d";

/** 列表/详情通用 Ant Design Table — 固定表头、横向滚动、固定列不透明 */
export function VtDataTable<T extends object>({
  columns,
  scrollX = "max-content",
  fillHeight = false,
  className,
  ...rest
}: Omit<TableProps<T>, "columns"> & {
  columns: ColumnsType<T>;
  scrollX?: number | string;
  /** 在 flex 容器内铺满时自动计算 scroll.y */
  fillHeight?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!fillHeight) return;
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScrollY(Math.max(160, el.clientHeight - 2));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillHeight]);

  const table = (
    <Table<T>
      size="middle"
      sticky
      pagination={false}
      className={className ?? "vt-ant-data-table"}
      columns={columns}
      scroll={{
        x: scrollX,
        ...(fillHeight && scrollY ? { y: scrollY } : {}),
      }}
      {...rest}
    />
  );

  if (!fillHeight) return table;

  return (
    <div ref={wrapRef} className="min-h-0 flex-1 overflow-hidden">
      {table}
    </div>
  );
}

/** 操作列 — 固定右侧、足够宽度、按钮横向排列 */
export function vtActionColumn<T>(
  title: string,
  render: (row: T) => ReactNode,
  width = 220,
): ColumnsType<T>[number] {
  return {
    key: "__actions",
    title,
    fixed: "right",
    width,
    align: "right",
    onCell: () => ({ style: { background: TABLE_BODY_BG } }),
    onHeaderCell: () => ({ style: { background: TABLE_HEAD_BG } }),
    render: (_: unknown, row: T) => (
      <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
        {render(row)}
      </div>
    ),
  };
}

export { TABLE_BODY_BG, TABLE_HEAD_BG, TABLE_HOVER_BG };
