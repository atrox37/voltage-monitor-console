/**
 * 从 types/api/endpoints.ts 的 API 常量解析为 axios 请求路径（含 /api 前缀）
 */
export function apiPath(spec: string): string {
  const path = spec.includes(" ") ? spec.split(" ")[1]! : spec;
  return path.startsWith("/api") ? path : `/api${path}`;
}
