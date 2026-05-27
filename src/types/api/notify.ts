/**
 * 通知 — notify-app
 */

import type { SysDimensionPo, SysUserPo } from './sys'

/** NotityEnum: email, sms, dingTalk 等 */
export type NotifyChannelCode = string

/** NotifyConfigPo.java */
export interface NotifyConfigPo {
  id?: number | string
  name: string
  creatorId?: number | string
  orgId?: number | string
  config?: NotifyDataConfig
  code?: NotifyChannelCode
  createTime?: string
  updateTime?: string
}

/** NotityDataConfig 多态 — 各通道配置 */
export interface NotifyDataConfig {
  [key: string]: unknown
}

/** NotifyConfigPageDto.java — POST /notify-config/_page */
export interface NotifyConfigPageDto {
  configPo: NotifyConfigPo
  userPo?: SysUserPo
  dimensionPo?: SysDimensionPo
}

/** GET /notify-config/support 列表项 */
export interface NotifySupportItem {
  type?: string
  name?: string
  code?: string
  [key: string]: unknown
}

export type NotifyType = NotifySupportItem

/** GET /notify-config/contentModel — ContentFieldsVo */
export interface NotifyContentField {
  name: string
  type: string
}

/** NotifyTemplatePo.java */
export interface NotifyTemplatePo {
  id?: number | string
  name: string
  msgContent?: NotifyContentModel | string
  variables?: Record<string, string> | string[]
  msgType?: string
  configId?: number | string
  creatorId?: number | string
  orgId?: number | string
  createTime?: string
  updateTime?: string
}

/** ContentModel 多态 */
export interface NotifyContentModel {
  [key: string]: unknown
}

/** NotifyTemlateDataUserDto.java — POST /notify-template/_page */
export interface NotifyTemplatePageDto {
  configPo?: NotifyConfigPo
  templatePo: NotifyTemplatePo
  sysUserPo?: SysUserPo
  sysDimensionPo?: SysDimensionPo
}

/** POST /notify-template/templateContent 请求 */
export interface NotifyTemplateContentRequest {
  content: string
}

/** POST /notify-template/send_test 请求 — RequestTemplateSend */
export interface NotifyTemplateSendTestRequest {
  configPo: NotifyConfigPo
  templatePo: NotifyTemplatePo
  userId: number | string
}

/**
 * 旧前端 notify-template-user 使用的结构
 * 注意: iotcloud 当前可能无对应 Controller/PO
 */
export interface NotifyTemplateUserPo {
  id?: number | string
  templateId?: number | string
  name?: string
  receiver?: string
  variables?: Record<string, unknown>
  updateTime?: string
  templateUserPo?: NotifyTemplateUserPo
}

/** @deprecated 使用 NotifyConfigPo */
export type NotifyConfig = NotifyConfigPo

/** @deprecated 使用 NotifyTemplatePo */
export type NotifyTemplate = NotifyTemplatePo
