import { useQuery } from "@tanstack/react-query";
import { pageNotifyConfigs } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import type { NotifyChannelCode } from "@/features/notif/lib/notify-mappers";
import type { PageQuery } from "@/types";

const ALL_CONFIGS_SORT: PageQuery["sorts"] = [{ column: "t.create_time", order: "desc" }];

export type NotifyConfigOption = { id: string; name: string; code: NotifyChannelCode };

/** 通知配置下拉 — 模板页等共用 */
export function useNotifyConfigOptions() {
  return useQuery<NotifyConfigOption[]>({
    queryKey: [...queryKeys.notifyConfigs.root, "options"] as const,
    queryFn: async () => {
      const result = await pageNotifyConfigs({
        current: 1,
        size: -1,
        terms: [],
        sorts: ALL_CONFIGS_SORT,
      });
      const list = result.records ?? result.data ?? [];
      return list.map((dto) => ({
        id: String(dto.configPo.id ?? ""),
        name: dto.configPo.name ?? "",
        code: String(dto.configPo.code ?? "") as NotifyChannelCode,
      }));
    },
    // staleTime: 60_000,
  });
}
