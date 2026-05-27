/**
 * 认证相关 — sys-app
 * Java: SecurityUser, LoginPassVo
 */

import type { SysUserPo, SysRolePo } from './sys'

/** POST /sys-app/login 请求体（字段名 account，非 username） */
export interface LoginParams {
  account: string
  /** 旧前端 MD5 加密后发送 */
  password: string
  captcha: string
}

/** GET /sys-app/common/captcha64 */
export interface CaptchaResponse {
  base64?: string
  key?: string
  image?: string
}

/** POST /sys-app/login → data */
export interface LoginResponse {
  token: string
  user: SecurityUser
}

/** SecurityUser.java — 登录后用户信息 */
export interface SecurityUser {
  userId?: number
  username?: string
  roleId?: number
  dimensionId?: number
  childDimension?: number[]
}

/** Pinia store 使用的用户信息（可含扩展字段） */
export type UserInfo = SysUserPo & Partial<SecurityUser> & {
  role?: SysRolePo
  account?: string
}
