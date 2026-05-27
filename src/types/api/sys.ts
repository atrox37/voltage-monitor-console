/**
 * 系统管理 — sys-app
 * PO: device-handler/po/Sys*.java
 * DTO: device-handler/dto/Sys*.java
 */

// ---- User ----

/** SysUserPo.java */
export interface SysUserPo {
  id?: number | string
  username: string
  password?: string
  salt?: string
  state?: number
  roleId?: number | string
  orgId?: number | string
  email?: string
  phone?: string
  metadata?: UserMetadata
  createTime?: string
  updateTime?: string
}

export interface UserMetadata {
  systemNotify?: UserNotifyPreference
  reminders?: UserNotifyPreference
  dayReport?: UserNotifyPreference
  weekReport?: UserNotifyPreference
}

export interface UserNotifyPreference {
  sms?: boolean
  email?: boolean
}

/** SysUserPageDto.java — POST /sys_user/_page 行数据 */
export interface SysUserPageDto {
  sysUserPo: SysUserPo
  dimensionPo?: SysDimensionPo
  sysRolePo?: SysRolePo
}

// ---- Role ----

/** SysRolePo.java */
export interface SysRolePo {
  id?: number | string
  roleName?: string
  orgId?: number | string
  updateTime?: string
}

/** SysRolePageDto.java — POST /role/_page 行数据 */
export interface SysRolePageDto {
  sysRolePo: SysRolePo
  sysDimensionPo?: SysDimensionPo
}

/** POST /role/roleMenu 树节点 */
export interface RoleMenuNode {
  id: number | string
  parentId: number | string
  weight?: number
  name: string
  icon?: string
  state: number
  roleMenuId?: number | string
  path?: string
  children?: RoleMenuNode[]
}

/** POST /role/menuPermission 响应项 — SysPermisstionPo.java */
export interface SysPermissionPo {
  id?: number | string
  name?: string
  permission?: string
  menuId?: number | string
}

/** POST /role/userPermission 响应项 — SysRolePermissionDto.java */
export interface SysRolePermissionDto extends SysPermissionPo {
  rolePermissionId?: number | string
  permissionStatus?: number
}

/** POST /role_permission/_save_or_update_batch — SysRolePermissionPo.java */
export interface SysRolePermissionPo {
  id?: number | string
  roleId?: number | string
  permissionId?: number | string
  state?: number
}

/** POST /role_menu/_save_or_update_batch — SysRoleMenuPo.java */
export interface SysRoleMenuPo {
  id?: number | string
  roleId?: number | string
  menuId?: number | string
  state?: number
}

/** POST /role/roleMenu 请求 — RoleVo.java */
export interface RoleMenuRequest {
  roleId: number | string
}

/** POST /role/menuPermission 请求 — MenuVo.java */
export interface MenuPermissionRequest {
  menuId: number | string
  roleId: number | string
}

/** POST /role_permission/batchChangePermission — RolePermissionVo.java */
export interface RolePermissionBatchVo {
  roleId: number | string
  deleteItem?: (number | string)[]
  addItem?: (number | string)[]
}

// ---- Dimension (Organization) ----

/** SysDimensionPo.java */
export interface SysDimensionPo {
  id?: number | string
  name: string
  parentId?: number | string
  weight?: number
  children?: SysDimensionPo[]
}

/** SysMenuPo.java — 菜单定义（服务端构建树） */
export interface SysMenuPo {
  id?: number | string
  title?: string
  path?: string
  icon?: string
  parentId?: number | string
  sort?: number
  children?: SysMenuPo[]
}

// ---- 旧前端别名 ----

/** @deprecated 使用 SysUserPageDto */
export type SysUserVO = SysUserPageDto

/** @deprecated 使用 SysRolePageDto */
export type SysRoleVO = SysRolePageDto

/** @deprecated 使用 SysDimensionPo */
export type SysDimension = SysDimensionPo

/** @deprecated 使用 SysUserPo */
export type SysUser = SysUserPo
