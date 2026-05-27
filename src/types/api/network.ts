/**
 * 网络 / 网关 / 协议 — iot-app
 */

import type { DeviceProtocolPo } from './protocol'
import type { SysDimensionPo } from './sys'

/** StateEnum: 0=stopped, 1=started */
export type EntityState = 0 | 1 | number

/** NetTypeEnum 示例: MQTT_CLIENT, TCP_SERVER, KAFKA 等 */
export type NetType = string

/** NetworkConfigPo.java */
export interface NetworkConfigPo {
  id?: number | string
  name: string
  state?: EntityState
  type?: NetType
  configuration?: NetConfiguration
  orgId?: number | string
  creatorId?: number | string
  updateTime?: string
}

/** 网络组件配置 — NetConfiguration 多态实现 */
export interface NetConfiguration {
  host?: string
  port?: number
  clientId?: string
  topic?: string
  username?: string
  password?: string
  ssl?: boolean
  [key: string]: unknown
}

/**
 * NetworkConfigDto.java — POST /network/_page 行数据
 * 旧前端使用 t1/t2 包装（MyBatis 联表别名）
 */
export interface NetworkConfigDto {
  networkConfigPo: NetworkConfigPo
  deviceGatewayPo?: DeviceGatewayPo
  sysDimensionPo?: SysDimensionPo
}

/** 旧前端 NetworkPage 实际使用的行结构 */
export interface NetworkPageRow {
  t1: {
    networkConfigPo: NetworkConfigPo
    sysDimensionPo?: SysDimensionPo
  }
  t2?: 'SUCCESS' | 'FAIL' | 'LOADING' | string
}

export type NetworkVO = NetworkPageRow

/** POST /network/_upload 响应 — NetworkFileRespVo */
export interface NetworkFileUploadResponse {
  url: string
}

// ---- Gateway ----

/** DeviceGatewayPo.java */
export interface DeviceGatewayPo {
  id?: number | string
  name: string
  state?: EntityState
  networkId?: number | string
  protocolId?: number | string
  orgId?: number | string
  creatorId?: number | string
  updateTime?: string
}

/** GatewayDto.java — POST /gateway/_page 行数据 */
export interface GatewayDto {
  gatewayPo: DeviceGatewayPo
  networkConfigPo?: NetworkConfigPo
  protocolPo?: DeviceProtocolPo
  sysDimensionPo?: SysDimensionPo
}

/** @deprecated 使用 NetworkConfigPo */
export type Network = NetworkConfigPo

/** @deprecated 使用 DeviceGatewayPo */
export type Gateway = DeviceGatewayPo

// re-export protocol for gateway dto
export type { DeviceProtocolPo } from './protocol'
