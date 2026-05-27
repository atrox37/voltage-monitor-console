/**
 * 物模型元数据 — device-communication/metadata/*
 * 嵌入 DeviceInstancePo.metadata / DeviceProductPo.metadata
 */

/** SimpleMetadata.java */
export interface SimpleMetadata {
  properties?: SimplePropertyMetadata[]
  functions?: SimpleFunctionMetadata[]
  propertyTags?: PropertyTagMetadata[]
  trees?: SimpleTreeMetadata[]
  rules?: RuleModel[]
  tags?: TagModel[]
}

/** SimplePropertyMetadata.java */
export type PropertyRw = 'read' | 'write' | 'readwrite' | 'none' | string

export interface SimplePropertyMetadata {
  id: string
  name: string
  tagId?: string
  rw?: PropertyRw
  valueType?: MetaDataType
  /** 旧前端编辑态临时字段 */
  create?: boolean
  loadRead?: boolean
  loadWrite?: boolean
}

/** MetaDataType.java 及子类型 */
export interface MetaDataType {
  type: string
  unit?: string | null
  extra?: MetaDataExtra
}

export interface MetaDataExtra {
  point?: number
  enumData?: EnumDataItem[]
  [key: string]: unknown
}

export interface EnumDataItem {
  key: string
  value: string
}

/** SimpleFunctionMetadata.java */
export interface SimpleFunctionMetadata {
  id: string
  name: string
  async?: boolean
  inputs?: SimpleFunctionParam[]
  outputs?: SimpleFunctionParam[]
  create?: boolean
}

export interface SimpleFunctionParam {
  id: string
  name: string
  valueType?: MetaDataType
}

/** PropertyTagMetadata.java */
export interface PropertyTagMetadata {
  id: string
  name: string
  selected?: boolean
}

/** SimpleTreeMetadata.java — 子设备结构分路树 */
export interface SimpleTreeMetadata {
  id: string
  name: string
  children?: SimpleTreeMetadata[]
}

/** TagModel.java — 设备标签 */
export interface TagModel {
  tagKey?: string
  tagName: string
  tagValue?: string
  optional?: boolean
}

/** RuleModel.java — 告警规则（存于 metadata.rules） */
export interface RuleModel {
  id: string
  name: string
  state?: number
  ruleMeta?: RuleMeta
  ruleData?: RuleData
}

/** RuleMeta.java */
export interface RuleMeta {
  sql?: string
  param?: Record<string, unknown[]>
}

/** RuleData.java — 多态: time | cron */
export interface RuleData {
  type: 'time' | 'cron' | string
  cron?: string
  /** 旧前端轮询周期字段，保存前会同步到 cron */
  cronNum?: string
  count?: number
}

/** GET /iot-app/configuration/unit — DataType */
export interface DataTypeUnit {
  id?: string
  name?: string
  type?: string
  [key: string]: unknown
}
