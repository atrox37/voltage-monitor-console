/**
 * 表格 scrollY / overhead 实测常量
 *
 * 测量环境：localhost:3000，视口 1920×969（innerHeight=1076），顶栏 56px
 * 公式：scrollY = innerHeight - APP_HEADER_HEIGHT - overhead
 */

export const APP_HEADER_HEIGHT = 56;

/** ant-table-thead，size="middle"（列表页、DetailTable） */
export const TABLE_HEAD_HEIGHT_MIDDLE = 47;

/** ant-table-thead，size="small"（DetailServerTable） */
export const TABLE_HEAD_HEIGHT_SMALL = 39;

/** .vt-table-pagination-bar（含 py-2 + Pagination small） */
export const TABLE_PAGINATION_HEIGHT = 49;

/**
 * 列表页 ListPageTemplate（含筛选）
 * 实测分解（至 .ant-table-body 顶沿 265px）：
 *   main padding-top 16 + 标题 24 + gap 12 + 筛选 57 + gap 12 + 工具栏 41 + 表头 47 = 209（= 265 - 56）
 *   分页 49 + 底部余量 23 ≈ 72
 *   overhead = 209 + 72 = 281
 */
export const LIST_PAGE_OVERHEAD_BASE = 213;
export const LIST_PAGE_FILTER_OVERHEAD = 68;
export const LIST_PAGE_OVERHEAD_WITH_FILTER =
  LIST_PAGE_OVERHEAD_BASE + LIST_PAGE_FILTER_OVERHEAD;

/**
 * 详情 DetailTable（模型属性 Tab）
 * 实测：bodyTop 250，scrollY 761，overhead 259
 *   顶栏下至表头：250 - 56 - 47(thead) = 147
 *   表头 47 + 分页 49 + 底部余量 16 = 112
 */
export const DETAIL_TAB_BASE = 147;
export const DETAIL_TABLE_BODY_OVERHEAD = 112;
export const DETAIL_TABLE_OVERHEAD = DETAIL_TAB_BASE + DETAIL_TABLE_BODY_OVERHEAD;

/**
 * 详情 DetailServerTable 默认（日志信息 Tab）
 * 实测：bodyTop 239，scrollY 741，overhead 279（比 DetailTable 多 20，含日期 toolbar ~25）
 */
export const DETAIL_SERVER_TABLE_OVERHEAD = DETAIL_TAB_BASE + 132;

/** 设备功能 Tab：实测 overhead 267（左右分栏，scrollY 753） */
export const DETAIL_FUNC_TAB_OVERHEAD = DETAIL_TAB_BASE + 120;
