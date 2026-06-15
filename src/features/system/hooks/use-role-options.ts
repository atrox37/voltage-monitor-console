import { useQuery } from "@tanstack/react-query";
import { pageRoles } from "@/api/sys";
import { queryKeys } from "@/lib/query-keys";
import type { SysRolePo } from "@/types";

/** 瑙掕壊涓嬫媺閫夐」 鈥?鐢ㄦ埛绠＄悊绛夐〉鍏辩敤 */
export function useRoleOptions() {
  return useQuery<SysRolePo[]>({
    queryKey: queryKeys.users.roleOptions,
    queryFn: async () => {
      const res = await pageRoles({ current: 1, size: -1 });
      return res.records ?? res.data ?? [];
    },
    // staleTime: 60_000,
  });
}
