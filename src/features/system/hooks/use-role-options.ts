import { useQuery } from "@tanstack/react-query";
import { pageRoles } from "@/api/sys";
import { queryKeys } from "@/lib/query-keys";
import type { SysRolePo } from "@/types";

/** 角色下拉选项 — 用户管理等页共用 */
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
