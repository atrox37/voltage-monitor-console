/** 路由元信息 — 前端路由层，非后端 API */

export interface RouteMeta {
  roles: string[]
  title: string
  icon?: string
  activeNav: string
  isSubMenu?: boolean
  hidden?: boolean
}

export interface RouteItem {
  path: string
  name: string
  component?: () => Promise<unknown>
  redirect?: string
  meta: RouteMeta
  children?: RouteItem[]
}
