import type { CaptchaResponse } from "@/types";

/** 从接口 data 解包结果中提取 base64（兼容字符串或对象） */
export function extractCaptchaBase64(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data.trim();
  if (typeof data === "object") {
    const o = data as CaptchaResponse & Record<string, unknown>;
    const raw = o.base64 ?? o.image ?? o.img;
    return typeof raw === "string" ? raw.trim() : "";
  }
  return "";
}

/** 规范化验证码 base64 为 img src 可用格式 */
export function normalizeCaptchaSrc(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}
