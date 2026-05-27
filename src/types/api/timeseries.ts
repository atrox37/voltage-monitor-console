/**
 * 时序数据 — register-app/timeseries/*
 * Model: device-data-core/model/*.java
 */

/** DeviceProperties.java — POST /timeseries/property/_page */
export interface DevicePropertyRecord {
  deviceId?: number | string
  productId?: number | string
  property?: string
  rawValue?: string
  numberValue?: number | string | null
  ts?: string
}

/** GET /timeseries/property/history?id= — Map<propertyId, DeviceProperties> */
export type DevicePropertyHistoryMap = Record<string, DevicePropertyRecord>

/** DeviceLog.java — POST /timeseries/log/_page */
export interface DeviceLogRecord {
  deviceId?: number | string
  messageId?: string
  log?: string
  messageType?: string
  ts?: string
}

/** DeviceFuntion.java — POST /timeseries/function/_page */
export interface DeviceFunctionLogRecord {
  ts?: string
  messageId?: string
  funcStatus?: string
  sendData?: string
  resultData?: string
  deviceId?: number | string
  func?: string
}

/** AlarmReply — ruleReply 数组元素 */
export interface AlarmReplyRecord {
  type?: string
  state?: string
  username?: string
  userId?: number | string
  [key: string]: unknown
}

/** DeviceRuleAlarm.java — POST /timeseries/alarm/_page */
export interface DeviceAlarmLogRecord {
  deviceId?: number | string
  ruleId?: string
  ruleData?: Record<string, unknown>[]
  ruleReply?: AlarmReplyRecord[] | string
  ts?: string
}

/** BoardLog.java / BoardLogResp.java — POST /timeseries/board/_page */
export interface BoardLogRecord {
  netId?: number | string
  boardId?: number | string
  deviceId?: number | string
  state?: string
  ts?: string
  deviceName?: string
  deviceSn?: string
}

/** 设备消息类型 — 旧前端 DeviceMessage.ts */
export type DeviceMessageType =
  | 'online'
  | 'offline'
  | 'report-property'
  | 'read-reply'
  | 'write-reply'
  | 'function-reply'
  | 'board-reply'
  | string

/** STOMP 属性上报 payload 项 */
export interface DevicePropertyPushItem {
  property: string
  numberValue?: number | string
  rawValue?: string
  value?: unknown
  ts?: string
}

/** STOMP 在线状态变更 */
export interface DeviceLineMessage {
  type?: 'online' | 'offline' | string
  status?: string
}

/** STOMP 读写/功能回复 */
export interface DeviceStompReply {
  type?: string
  replyType?: 'SUCCESS' | 'FAIL' | 'TIMEOUT' | 'LOADING' | string
  properties?: Record<string, unknown>
  resultData?: unknown
  requestWsData?: Record<string, unknown>
  targetMsg?: Record<string, unknown>
}
