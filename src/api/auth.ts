import { Request } from "@/lib/request";
import { API } from "@/types";
import type { CaptchaResponse, LoginParams, LoginResponse } from "@/types";
import { apiPath } from "./paths";

/** GET /sys-app/common/captcha64 */
export function getCaptcha(): Promise<CaptchaResponse> {
  return Request.get<CaptchaResponse>(apiPath(API.sys.captcha));
}

/** POST /sys-app/login */
export function login(data: LoginParams): Promise<LoginResponse> {
  return Request.post<LoginResponse>(apiPath(API.sys.login), data);
}

/** POST /sys-app/logout */
export function logout(): Promise<void> {
  return Request.post<void>(apiPath(API.sys.logout));
}
