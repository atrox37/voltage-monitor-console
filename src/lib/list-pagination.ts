import { useCallback, useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 20;

/** 服务端分页列表通用状态 */
export function useListPagination(initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);
  return { page, setPage, pageSize, onPageSizeChange };
}

/** 客户端分页：详情页表格等本地数据切片 */
export function useClientPagination<T>(items: T[], initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const total = items.length;

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) setPage(maxPage);
  }, [total, pageSize, page]);

  return { page, setPage, pageSize, onPageSizeChange, pageItems, total };
}
