import axios from "axios";
import { message } from "antd";
import type { ApiResponse } from "@/types";
import { getLocale, translate } from "@/i18n";

const requestFailed = () => translate(getLocale(), "common.requestFailed");

/** 从后端统一响应 { code, msg, data } 提取提示文案，优先 msg */
export function getApiMessage(payload: unknown, fallback?: string): string {
  const fb = fallback ?? requestFailed();
  if (payload == null) return fb;
  if (typeof payload === "string" && payload.trim()) return payload.trim();

  if (typeof payload === "object") {
    const o = payload as ApiResponse<unknown> & { message?: string };
    if (typeof o.msg === "string" && o.msg.trim()) return o.msg.trim();
    if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
  }

  return fb;
}

/** 从 axios / Error 中提取 msg（拦截器已写入 Error.message） */
export function getErrorMessage(err: unknown, fallback?: string): string {
  const fb = fallback ?? requestFailed();
  if (axios.isCancel(err)) return fb;

  if (axios.isAxiosError(err)) {
    const body = err.response?.data;
    const fromBody = getApiMessage(body, "");
    if (fromBody) return fromBody;
    if (err.message?.trim()) return err.message.trim();
    return fb;
  }

  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return fb;
}

export function showError(msg: string): void {
  message.error(msg);
}

export function showSuccess(msg: string): void {
  message.success(msg);
}

export function showApiError(err: unknown, fallback?: string): void {
  showError(getErrorMessage(err, fallback));
}

export function showApiSuccess(payload: unknown, fallback?: string): void {
  const msg = getApiMessage(payload, fallback ?? "");
  if (msg) showSuccess(msg);
}
