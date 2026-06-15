import { QueryClient } from "@tanstack/react-query";
import { isRequestCanceled } from "@/lib/request";

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        throwOnError: (error) => !isRequestCanceled(error),
      },
      mutations: {
        retry: false,
      },
    },
  });
}
