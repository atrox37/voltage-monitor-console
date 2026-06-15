import { Pagination, Table } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import type { ReactNode } from "react";
import { useRef } from "react";
import { useClientPagination } from "@/lib/list-pagination";
import { useTableScrollSync } from "@/lib/table-utils";
import {
  DETAIL_FUNC_TAB_OVERHEAD,
  DETAIL_SERVER_TABLE_OVERHEAD,
  DETAIL_TAB_BASE,
  DETAIL_TABLE_BODY_OVERHEAD,
  DETAIL_TABLE_OVERHEAD,
  TABLE_HEAD_HEIGHT_MIDDLE,
  TABLE_HEAD_HEIGHT_SMALL,
} from "@/lib/table-layout";
import { useAdaptiveTableScrollY, useTableBodyMaxScrollY } from "@/lib/use-table-height";

export {
  DETAIL_TAB_BASE,
  DETAIL_TABLE_BODY_OVERHEAD,
  DETAIL_TABLE_OVERHEAD,
  DETAIL_SERVER_TABLE_OVERHEAD,
  DETAIL_FUNC_TAB_OVERHEAD,
};

type DetailTableProps<T extends object> = Omit<
  TableProps<T>,
  "pagination" | "dataSource" | "columns"
> & {
  dataSource?: T[];
  columns: ColumnsType<T>;
  /** 在 DETAIL_TAB_BASE + DETAIL_TABLE_BODY_OVERHEAD 之上额外扣除的高度（如工具栏） */
  extraOverhead?: number;
};

/** 客户端分页：表格与分页条分离，铺满 Tab 剩余高度 */
export function DetailTable<T extends object>({
  dataSource = [],
  columns,
  rowKey,
  extraOverhead: _extraOverhead = 0,
  size = "middle",
  ...rest
}: DetailTableProps<T>) {
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const headHeight = size === "small" ? TABLE_HEAD_HEIGHT_SMALL : TABLE_HEAD_HEIGHT_MIDDLE;
  const maxScrollY = useTableBodyMaxScrollY(tableWrapRef, headHeight);
  const { page, setPage, pageSize, onPageSizeChange, pageItems, total } = useClientPagination(
    dataSource as T[],
  );
  const syncRef = useTableScrollSync([pageItems, columns, maxScrollY, size]);
  const tableScroll = useAdaptiveTableScrollY(syncRef, maxScrollY, [
    pageItems,
    columns,
    maxScrollY,
    size,
  ]);

  const hasData = (dataSource?.length ?? 0) > 0;
  const tableScrollConfig =
    hasData && tableScroll.hasVerticalOverflow ? { y: tableScroll.scrollY } : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={tableWrapRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div ref={syncRef} className="h-full min-h-0 min-w-0">
          <Table<T>
            {...rest}
            rowKey={rowKey}
            size={size}
            tableLayout="fixed"
            sticky={hasData && tableScroll.hasVerticalOverflow}
            pagination={false}
            className={`vt-ant-data-table ${hasData && tableScroll.hasVerticalOverflow ? "" : "vt-ant-data-table-no-y-scroll"}`.trim()}
            columns={columns}
            dataSource={pageItems}
            scroll={tableScrollConfig}
          />
        </div>
      </div>
      <DetailPaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

type DetailServerTableProps<T extends object> = Omit<
  TableProps<T>,
  "pagination" | "dataSource" | "columns"
> & {
  dataSource?: T[];
  columns: ColumnsType<T>;
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** 完整 overhead（已含 DETAIL_TAB_BASE），默认含工具栏 + 表头 + 分页条 */
  scrollOverhead?: number;
  toolbar?: ReactNode;
};

/** 服务端分页：表格与分页条分离 */
export function DetailServerTable<T extends object>({
  dataSource = [],
  columns,
  rowKey,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  scrollOverhead: _scrollOverhead = DETAIL_SERVER_TABLE_OVERHEAD,
  toolbar,
  locale,
  size = "small",
  ...rest
}: DetailServerTableProps<T>) {
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const headHeight = size === "small" ? TABLE_HEAD_HEIGHT_SMALL : TABLE_HEAD_HEIGHT_MIDDLE;
  const maxScrollY = useTableBodyMaxScrollY(tableWrapRef, headHeight);
  const syncRef = useTableScrollSync([dataSource, columns, maxScrollY, size]);
  const tableScroll = useAdaptiveTableScrollY(syncRef, maxScrollY, [
    dataSource,
    columns,
    maxScrollY,
    size,
  ]);

  const hasData = (dataSource?.length ?? 0) > 0;
  const tableScrollConfig =
    hasData && tableScroll.hasVerticalOverflow ? { y: tableScroll.scrollY } : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {toolbar}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        <div ref={tableWrapRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div ref={syncRef} className="h-full min-h-0 min-w-0">
            <Table<T>
              {...rest}
              rowKey={rowKey}
              size={size}
              loading={loading}
              tableLayout="fixed"
              sticky={hasData && tableScroll.hasVerticalOverflow}
              pagination={false}
              className={`vt-ant-data-table ${hasData && tableScroll.hasVerticalOverflow ? "" : "vt-ant-data-table-no-y-scroll"}`.trim()}
              columns={columns}
              dataSource={dataSource}
              scroll={tableScrollConfig}
              locale={locale}
            />
          </div>
        </div>
        <DetailPaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={(s) => {
            onPageSizeChange(s);
            onPageChange(1);
          }}
        />
      </div>
    </div>
  );
}

function DetailPaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="vt-table-pagination-bar shrink-0 border-t border-panel-border px-4 py-2">
      <Pagination
        className="vt-ant-pagination"
        size="small"
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger
        pageSizeOptions={[10, 20, 50, 100]}
        hideOnSinglePage={false}
        onChange={(p, s) => {
          if (s !== pageSize) onPageSizeChange(s);
          else onPageChange(p);
        }}
        onShowSizeChange={(_c, s) => onPageSizeChange(s)}
      />
    </div>
  );
}
