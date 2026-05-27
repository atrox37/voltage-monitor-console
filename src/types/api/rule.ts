/**
 * 告警规则 — iot-app/device 规则 API
 * 注意: 旧 /iot-app/rule/* 端点可能已迁移至 device metadata + _rule_update
 */

import type { JSqlColumn } from './device'
import type { RuleModel } from './metadata'
import type { DeviceRuleMetaPo } from './rule-meta'
import type { NotifyConfigPo, NotifyTemplatePo } from './notify'
import type { SysUserPo } from './sys'

/** POST /device/_rule_parse 请求 — RuleDetailReqVo */
export interface DeviceRuleParseRequest {
  ruleId: string
  deviceId: number | string
}

/** POST /device/_rule_parse 响应 — RuleDetailDto */
export interface DeviceRuleDetailDto {
  columns?: JSqlColumn[][]
  rulePo?: RuleModel
  notifyDtos?: RuleNotifyDto[]
}

/** RuleNotifyDto.java */
export interface RuleNotifyDto {
  ruleMetaPo?: DeviceRuleMetaPo
  notifyTemplatePo?: NotifyTemplatePo
  notifyConfigPo?: NotifyConfigPo
  sysUserPo?: SysUserPo
}

/** POST /device/_rule_update 请求 — RuleUpdateReqVo */
export interface DeviceRuleUpdateRequest {
  deviceId: number | string
  delMeta?: (number | string)[]
  columns?: JSqlColumn[][]
  ruleMeta?: DeviceRuleMetaPo[]
  ruleModel?: RuleModel
  rulePo?: RuleModel
}

/** 旧前端 rule/save 请求体（legacy） */
export interface LegacyRuleSaveRequest {
  rulePo?: RuleModel
  deviceId?: number | string
  [key: string]: unknown
}

export type { DeviceRuleMetaPo } from './rule-meta'
