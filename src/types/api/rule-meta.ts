/**
 * DeviceRuleMetaPo.java — 告警规则通知绑定
 */

import type { RuleHandlerType, RuleMetaDataType } from './rule-enums'

export interface DeviceRuleMetaPo {
  id?: number | string
  ruleId?: string
  deviceId?: number | string
  userId?: number | string
  templateId?: number | string
  handlerData?: RuleMetaDataType
  handlerType?: RuleHandlerType
}
