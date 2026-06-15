import { useQuery } from "@tanstack/react-query";
import { getDimensionTree } from "@/api/sys";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import { queryKeys } from "@/lib/query-keys";
import type { OrgNode } from "@/components/org-tree-select";

/** 鏈烘瀯鏍?鈥?澶氬垪琛ㄩ〉鍏辩敤锛岀紦瀛?5 鍒嗛挓 */
export function useDimensionTreeQuery() {
  return useQuery<OrgNode[]>({
    queryKey: queryKeys.dimensionTree,
    queryFn: async () => dimensionToOrgNodes(await getDimensionTree()),
    // staleTime: 5 * 60_000,
  });
}
