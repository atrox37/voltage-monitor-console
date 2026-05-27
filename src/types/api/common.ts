/**
 * 通用 API 类型 — 对应 iotcloud:
 * - device-common/device-core/.../AjaxResult.java
 * - device-common/device-core/.../SaveResult.java
 * - device-common/device-mybatis/.../PageParam.java
 */

/** 后端统一响应包装 { code, msg, data } */
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
  /** 部分拦截器兼容字段 */
  message?: string
  success?: boolean
}

/** 分页查询条件 — POST *_page 请求体 */
export interface QueryTerm {
  column: string
  value?: unknown
  termType?: 'eq' | 'like' | 'in' | 'gt' | 'lt' | 'gte' | 'lte' | 'not' | 'isnull'
}

export interface SortItem {
  column: string
  order: 'asc' | 'desc'
}

export interface PageQuery {
  current: number
  size: number
  terms?: QueryTerm[]
  sorts?: SortItem[]
}

/** 单条查询 — POST *_search_one / *_search_all */
export interface QueryParam {
  terms?: QueryTerm[]
  sorts?: SortItem[]
}

/** 分页结果 — MyBatis-Plus IPage，可能在 AjaxResult.data 内 */
export interface PageResult<T> {
  records?: T[]
  data?: T[]
  total: number
  current?: number
  size?: number
  pages?: number
}

/** 保存/删除操作结果 — SaveResult.java */
export interface SaveResult<T = unknown> {
  change: number
  delete: number
  data?: T
}

/** 树节点 — Hutool Tree<Long>，用于机构树/菜单树 */
export interface TreeNode<T = number | string> {
  id: T
  parentId?: T
  name?: string
  weight?: number
  children?: TreeNode<T>[]
  [key: string]: unknown
}
