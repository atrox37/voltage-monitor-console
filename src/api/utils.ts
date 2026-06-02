/** 兼容后端 _search_one 返回单对象或分页包装 */
export function unwrapSearchOne<T>(
  res: T | { records?: T[]; data?: T[] } | null | undefined,
): T | null {
  if (res == null) return null;
  if (typeof res === "object" && ("records" in res || "data" in res)) {
    const wrapped = res as { records?: T[]; data?: T[] };
    return wrapped.records?.[0] ?? wrapped.data?.[0] ?? null;
  }
  return res as T;
}
