import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { showApiError } from "@/lib/api-message";
import { isRequestCanceled } from "@/lib/request";
import type { PageQuery, PageResult } from "@/types";

type ServerPageQueryOptions<TDto, TRow> = {
  queryKey: readonly unknown[];
  page: number;
  pageSize: number;
  /** terms + sorts，不含 current/size */
  query: Omit<PageQuery, "current" | "size">;
  fetchPage: (query: PageQuery) => Promise<PageResult<TDto>>;
  mapRow: (dto: TDto) => TRow;
  errorMessage: string;
  enabled?: boolean;
};

/** 服务端分页列表 — 替代手写 useEffect + useState */
export function useServerPageQuery<TDto, TRow>({
  queryKey,
  page,
  pageSize,
  query,
  fetchPage,
  mapRow,
  errorMessage,
  enabled = true,
}: ServerPageQueryOptions<TDto, TRow>) {
  const result = useQuery({
    queryKey: [...queryKey, page, pageSize, query],
    queryFn: async () => {
      const res = await fetchPage({ ...query, current: page, size: pageSize });
      const list = res.records ?? res.data ?? [];
      return {
        rows: list.map(mapRow),
        total: res.total ?? list.length,
      };
    },
    enabled,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!result.error || isRequestCanceled(result.error)) return;
    showApiError(result.error, errorMessage);
  }, [result.error, errorMessage]);

  return {
    rows: result.data?.rows ?? [],
    total: result.data?.total ?? 0,
    loading: result.isFetching,
    refetch: result.refetch,
  };
}
