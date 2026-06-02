import { Request } from "@/lib/request";
import { API } from "@/types";
import type {
  PageQuery,
  PageResult,
  QueryParam,
  SaveResult,
  SysUserPo,
  SysUserPageDto,
  SysRolePo,
  SysRolePageDto,
  SysDimensionPo,
  RoleMenuNode,
  SysPermissionPo,
  SysRolePermissionDto,
  SysRolePermissionPo,
  SysRoleMenuPo,
  RoleMenuRequest,
  MenuPermissionRequest,
  RolePermissionBatchVo,
  SysMenuPo,
} from "@/types";
import { apiPath } from "./paths";

/** POST /sys-app/sys_menu/menu */
export function getMenuTree(): Promise<SysMenuPo[]> {
  return Request.post<SysMenuPo[]>(apiPath(API.sys.menu), {});
}

/** POST /sys-app/role/_page */
export function pageRoles(params: PageQuery): Promise<PageResult<SysRolePageDto>> {
  return Request.post<PageResult<SysRolePageDto>>(apiPath(API.sys.rolePage), params);
}

/** POST /sys-app/role/list */
export function listRoles(params: PageQuery): Promise<PageResult<SysRolePo>> {
  return Request.post<PageResult<SysRolePo>>(apiPath(API.sys.roleList), params);
}

/** POST /sys-app/role/_save_or_update */
export function saveRole(data: Partial<SysRolePo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.sys.roleSave), data);
}

/** GET /sys-app/role/_delete */
export function deleteRole(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.sys.roleDelete), { id });
}

/** POST /sys-app/role/roleMenu */
export function getRoleMenuTree(params: RoleMenuRequest): Promise<RoleMenuNode[]> {
  return Request.post<RoleMenuNode[]>(apiPath(API.sys.roleMenu), params);
}

/** POST /sys-app/role/menuPermission */
export function getMenuPermissions(params: MenuPermissionRequest): Promise<SysPermissionPo[]> {
  return Request.post<SysPermissionPo[]>(apiPath(API.sys.menuPermission), params);
}

/** POST /sys-app/role/userPermission */
export function getUserPermissions(params: MenuPermissionRequest): Promise<SysRolePermissionDto[]> {
  return Request.post<SysRolePermissionDto[]>(apiPath(API.sys.userPermission), params);
}

/** POST /sys-app/role_permission/batchChangePermission */
export function batchChangeRolePermission(data: RolePermissionBatchVo): Promise<void> {
  return Request.post<void>(apiPath(API.sys.rolePermissionBatch), data);
}

/** POST /sys-app/role_permission/_save_or_update_batch */
export function saveRolePermissions(data: SysRolePermissionPo[]): Promise<void> {
  return Request.post<void>(apiPath(API.sys.rolePermissionSaveBatch), data);
}

/** POST /sys-app/role_menu/_save_or_update_batch */
export function saveRoleMenus(data: SysRoleMenuPo[]): Promise<void> {
  return Request.post<void>(apiPath(API.sys.roleMenuSaveBatch), data);
}

/** POST /sys-app/sys_user/_page */
export function pageUsers(params: PageQuery): Promise<PageResult<SysUserPageDto>> {
  return Request.post<PageResult<SysUserPageDto>>(apiPath(API.sys.userPage), params);
}

/** POST /sys-app/sys_user/_search_all */
export function searchAllUsers(params: QueryParam): Promise<SysUserPo[]> {
  return Request.post<SysUserPo[]>(apiPath(API.sys.userSearchAll), params);
}

/** POST /sys-app/sys_user/_save_or_update */
export function saveUser(data: Partial<SysUserPo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.sys.userSave), data);
}

/** GET /sys-app/sys_user/_delete */
export function deleteUser(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.sys.userDelete), { id });
}

/** POST /sys-app/sys-dimension/tree */
export function getDimensionTree(): Promise<SysDimensionPo> {
  return Request.post<SysDimensionPo>(apiPath(API.sys.dimensionTree), {});
}

/** POST /sys-app/sys-dimension/_search_one */
export function getDimensionOne(params: QueryParam): Promise<SysDimensionPo> {
  return Request.post<SysDimensionPo>(apiPath(API.sys.dimensionSearchOne), params);
}

/** POST /sys-app/sys-dimension/_save_or_update */
export function saveDimension(data: Partial<SysDimensionPo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.sys.dimensionSave), data);
}

/** GET /sys-app/sys-dimension/_delete */
export function deleteDimension(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.sys.dimensionDelete), { id });
}

/** 按机构筛选用户 */
export function getDimensionUsers(params: QueryParam): Promise<SysUserPo[]> {
  return searchAllUsers(params);
}
