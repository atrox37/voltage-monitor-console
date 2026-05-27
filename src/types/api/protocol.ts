/**
 * 协议 — iot-app
 */

import type { NetType } from './network'

/** ProtocolConfigurationPo.java */
export interface ProtocolConfigurationPo {
  provider?: string
  location?: string
  type?: string
  sha256?: string
  [key: string]: unknown
}

/** DeviceProtocolPo.java */
export interface DeviceProtocolPo {
  id?: number | string
  name: string
  type?: string
  state?: number
  configuration?: ProtocolConfigurationPo
  support?: NetType[]
  description?: string
  creatorId?: number | string
  orgId?: number | string
  updateTime?: string
}

/** DeviceProtocolPageDto.java — POST /protocol/_page 行数据（扁平结构） */
export interface DeviceProtocolPageDto {
  id?: number | string
  name?: string
  type?: string
  state?: number
  configuration?: ProtocolConfigurationPo
  support?: NetType[]
  description?: string
  creatorId?: number | string
  orgId?: number | string
  updateTime?: string
  gatewayTotal?: number
  sysDimensionName?: string
}

/** POST /protocol/_upload 响应 — ProtocolUploadDto */
export interface ProtocolUploadResponse {
  checked: boolean
  url?: string
  support?: NetType[]
}

/** POST /protocol/_test 请求 */
export interface ProtocolTestRequest {
  id: number | string
  type: string
  data?: Record<string, unknown>
  topic?: string
  clientId?: string
}

/** @deprecated 使用 DeviceProtocolPo */
export type Protocol = DeviceProtocolPo
