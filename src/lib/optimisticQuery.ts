import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function applyOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (previous: T) => T,
  snapshot?: T,
): T | undefined {
  void queryClient.cancelQueries({ queryKey });
  const previous = snapshot ?? queryClient.getQueryData<T>(queryKey);
  if (previous === undefined) return undefined;
  queryClient.setQueryData<T>(queryKey, updater(previous));
  return previous;
}

export function rollbackOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  previous: T | undefined,
): void {
  if (previous === undefined) return;
  queryClient.setQueryData<T>(queryKey, previous);
}
