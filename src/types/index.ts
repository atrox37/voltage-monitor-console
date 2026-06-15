/**
 * API 类型统一导出
 *
 * 组织原则:
 * 1. 按后端模块划分 (sys / iot / notify / register)
 * 2. 字段名与 iotcloud Java PO/DTO 保持一致
 * 3. 旧前端 request.ts 中每个 API 的 request/response 均可在此找到对应类型
 *
 * @see ./api/endpoints.ts — 端点清单
 */

// ---- 通用 ----
export type {
  ApiResponse,
  QueryTerm,
  SortItem,
  PageQuery,
  QueryParam,
  PageResult,
  SaveResult,
  TreeNode,
} from './api/common'

export { API } from './api/endpoints'

// ---- 认证 ----
export type {
  LoginParams,
  CaptchaResponse,
  LoginResponse,
  SecurityUser,
  UserInfo,
} from './api/auth'

// ---- 系统管理 ----
export type {
  SysUserPo,
  UserMetadata,
  UserNotifyPreference,
  SysUserPageDto,
  SysRolePo,
  SysRolePageDto,
  RoleMenuNode,
  SysPermissionPo,
  SysRolePermissionDto,
  SysRolePermissionPo,
  SysRoleMenuPo,
  RoleMenuRequest,
  MenuPermissionRequest,
  RolePermissionBatchVo,
  SysDimensionPo,
  SysMenuPo,
  AuditLogPo,
  AuditLogDto,
  SysUserVO,
  SysRoleVO,
  SysDimension,
  SysUser,
} from './api/sys'

// ---- 物模型元数据 ----
export type {
  SimpleMetadata,
  PropertyRw,
  SimplePropertyMetadata,
  MetaDataType,
  MetaDataExtra,
  EnumDataItem,
  SimpleFunctionMetadata,
  SimpleFunctionParam,
  PropertyTagMetadata,
  SimpleTreeMetadata,
  TagModel,
  RuleModel,
  RuleMeta,
  RuleData,
  DataTypeUnit,
} from './api/metadata'

// ---- 设备 / 产品 ----
export type {
  DeviceInstancePo,
  DeviceInstancePageDto,
  DeviceInstanceDetailDto,
  DeviceVO,
  DeviceDetailVO,
  ProductType,
  DeviceProductPo,
  DeviceProductPageDto,
  DeviceProductDetailDto,
  ProductRuleParseRequest,
  ProductRuleSerializeRequest,
  JSqlColumn,
  DeviceInstance,
  Product,
  ProductVO,
  DeviceSyncResult,
} from './api/device'

// ---- 网络 / 网关 ----
export type {
  EntityState,
  NetType,
  NetworkConfigPo,
  NetConfiguration,
  NetworkConfigDto,
  NetworkPageRow,
  NetworkVO,
  NetworkFileUploadResponse,
  DeviceGatewayPo,
  GatewayDto,
  Network,
  Gateway,
} from './api/network'

// ---- 协议 ----
export type {
  ProtocolConfigurationPo,
  DeviceProtocolPo,
  DeviceProtocolPageDto,
  ProtocolUploadResponse,
  ProtocolTestRequest,
  Protocol,
} from './api/protocol'

// ---- 通知 ----
export type {
  NotifyChannelCode,
  NotifyConfigPo,
  NotifyDataConfig,
  NotifyConfigPageDto,
  NotifySupportItem,
  NotifyType,
  NotifyContentField,
  NotifyTemplatePo,
  NotifyContentModel,
  NotifyTemplatePageDto,
  NotifyTemplateContentRequest,
  NotifyTemplateSendTestRequest,
  NotifyTemplateUserPo,
  NotifyConfig,
  NotifyTemplate,
} from './api/notify'

// ---- 时序 / STOMP ----
export type {
  DevicePropertyRecord,
  DevicePropertyHistoryMap,
  DeviceLogRecord,
  DeviceFunctionLogRecord,
  AlarmReplyRecord,
  DeviceAlarmLogRecord,
  BoardLogRecord,
  DeviceMessageType,
  DevicePropertyPushItem,
  DeviceLineMessage,
  DeviceStompReply,
} from './api/timeseries'

// ---- 告警规则 ----
export type {
  DeviceRuleParseRequest,
  DeviceRuleDetailDto,
  RuleNotifyDto,
  DeviceRuleUpdateRequest,
  LegacyRuleSaveRequest,
} from './api/rule'

export type { DeviceRuleMetaPo } from './api/rule-meta'
export type { RuleHandlerType, RuleMetaDataType } from './api/rule-enums'

// ---- 路由 ----
export type { RouteMeta, RouteItem } from './router'
