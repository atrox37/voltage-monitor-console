/**
 * 设备与产品 — iot-app
 * PO/DTO: device-handler/po/Device*.java, dto/Device*.java
 */

import type { SimpleMetadata, RuleModel } from './metadata'
import type { DeviceGatewayPo, NetworkConfigPo } from './network'
import type { SysDimensionPo, SysUserPo } from './sys'

// ---- Device Instance ----

/** DeviceInstancePo.java */
export interface DeviceInstancePo {
  id?: number | string
  name: string
  sn?: string
  metadata?: SimpleMetadata
  status?: 'online' | 'offline' | string
  statusTime?: string
  creatorId?: number | string
  productId?: number | string
  gatewayId?: number | string
  orgId?: number | string
  parentId?: number | string
  treeNode?: string
  createTime?: string
  updateTime?: string
}

/** DeviceInstancePagePo.java — POST /device/_page 行数据 */
export interface DeviceInstancePageDto {
  deviceInstancePo: DeviceInstancePo
  gatewayPo?: DeviceGatewayPo
  productPo?: DeviceProductPo
  sysDimensionPo?: SysDimensionPo
  sysUserPo?: SysUserPo
}

/** DeviceInstanceDetailDto.java — POST /device/_search_one */
export interface DeviceInstanceDetailDto {
  deviceInstancePo: DeviceInstancePo
  productPo?: DeviceProductPo
  gatewayPo?: DeviceGatewayPo
  networkConfigPo?: NetworkConfigPo
  sysDimensionPo?: SysDimensionPo
  sysUserPo?: SysUserPo
}

/** 旧前端/新项目通用别名 */
export type DeviceVO = DeviceInstancePageDto
export type DeviceDetailVO = DeviceInstanceDetailDto

// ---- Product ----

/** ProductTypeEnum */
export type ProductType = 'gateway' | 'device' | 'children' | string

/** DeviceProductPo.java */
export interface DeviceProductPo {
  id?: number | string
  name: string
  metadata?: SimpleMetadata
  updateTime?: string
  orgId?: number | string
  creatorId?: number | string
  type?: ProductType
  sn?: string
}

/** DeviceProductPageDto.java — POST /product/_page */
export interface DeviceProductPageDto {
  productPo: DeviceProductPo
  sysDimensionPo?: SysDimensionPo
  sysUserPo?: SysUserPo
}

/** DeviceProductDetailDto.java — POST /product/_search_one */
export interface DeviceProductDetailDto {
  productPo: DeviceProductPo
  sysDimensionPo?: SysDimensionPo
  sysUserPo?: SysUserPo
}

/** POST /product/_parse 请求 — RuleMetaReqVo */
export interface ProductRuleParseRequest {
  sql?: string
  param?: Record<string, unknown[]>
}

/** POST /product/_serialize 请求 — RuleParseReqVo */
export interface ProductRuleSerializeRequest {
  metadata: SimpleMetadata
  columns: JSqlColumn[][]
  rulePo: RuleModel
}

/** JSqlColumn — 规则 SQL 列定义 */
export interface JSqlColumn {
  column?: string
  operation?: string
  value?: unknown
  valueType?: string
  condition?: string
  [key: string]: unknown
}

// ---- 兼容别名 ----

/** @deprecated 使用 DeviceInstancePo */
export type DeviceInstance = DeviceInstancePo

/** @deprecated 使用 DeviceProductPo */
export type Product = DeviceProductPo

/** @deprecated 使用 DeviceProductPageDto */
export type ProductVO = DeviceProductPageDto

/** GET /iot-app/device/_sync 响应 data */
export interface DeviceSyncResult {
  change: number
}
