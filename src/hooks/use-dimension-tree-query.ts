import { useQuery } from "@tanstack/react-query";
import { getDimensionTree } from "@/api/sys";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import { queryKeys } from "@/lib/query-keys";
import type { OrgNode } from "@/components/org-tree-select";

/** 机构树 — 多列表页共用，缓存 5 分钟 */
export function useDimensionTreeQuery() {
  return useQuery<OrgNode[]>({
    queryKey: queryKeys.dimensionTree,
    queryFn: async () => dimensionToOrgNodes(await getDimensionTree()),
    // staleTime: 5 * 60_000,
  });
}
