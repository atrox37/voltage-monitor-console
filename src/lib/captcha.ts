/** 规范化验证码 base64 为 img src 可用格式 */
export function normalizeCaptchaSrc(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}
