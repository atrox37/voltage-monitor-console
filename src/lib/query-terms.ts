import type { PageQuery, QueryTerm } from "@/types";

/** 全量列表 — 对齐旧项目 size: -1 */
export const ALL_PAGE_QUERY: PageQuery = { current: 1, size: -1 };

export function termEq(column: string, value: unknown): QueryTerm {
  return { column, value };
}

/** eq 且 value 为数字 ID（对齐旧项目 parseInt / Number） */
export function termEqId(column: string, value: unknown): QueryTerm {
  return { column, value: toDbId(value) };
}

export function termLike(column: string, value: unknown): QueryTerm {
  return { column, value, termType: "like" };
}

export function termIn(column: string, value: unknown[]): QueryTerm {
  return { column, value, termType: "in" };
}

export function toDbId(value: unknown): number | string {
  if (typeof value === "number") return value;
  const str = String(value ?? "").trim();
  if (/^\d+$/.test(str)) return Number(str);
  return str;
}
