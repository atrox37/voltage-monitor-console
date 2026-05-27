/**
 * 临时占位 — 等用户上传真实 sys.ts 后覆盖
 * 仅保留被其它文件引用的类型签名
 */

export interface SysUserPo {
  id?: number | string;
  username?: string;
  account?: string;
  email?: string;
  phone?: string;
  roleId?: number | string;
  dimensionId?: number | string;
  orgId?: number | string;
  state?: number;
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export interface SysRolePo {
  id?: number | string;
  name: string;
  code?: string;
  dimensionId?: number | string;
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export interface SysDimensionPo {
  id?: number | string;
  name: string;
  parentId?: number | string;
  weight?: number;
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export interface SysMenuPo {
  id?: number | string;
  name: string;
  path?: string;
  icon?: string;
  parentId?: number | string;
  weight?: number;
  type?: string;
  [key: string]: unknown;
}
