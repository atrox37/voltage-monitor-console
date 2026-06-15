import { useQuery } from "@tanstack/react-query";
import { getDimensionUsers } from "@/api/sys";
import { queryKeys } from "@/lib/query-keys";
import { toDbId } from "@/lib/query-terms";
import type { SysUserPo } from "@/types";

/** 鏈烘瀯鎴愬憳鍒楄〃 鈥?鏈烘瀯绠＄悊椤垫垚鍛樻娊灞?*/
export function useOrgMembersQuery(orgId: string | null) {
  return useQuery<SysUserPo[]>({
    queryKey: orgId ? queryKeys.orgs.members(orgId) : ["orgs", "members", "none"],
    queryFn: async () => {
      if (!orgId) return [];
      return getDimensionUsers({
        terms: [{ column: "t.org_id", value: toDbId(orgId), termType: "eq" }],
      });
    },
    enabled: !!orgId,
  });
}
