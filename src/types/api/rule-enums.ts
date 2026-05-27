/** RuleHandler.java */
export type RuleHandlerType = 'NOTITY' | 'FUNCTION' | string

/** NotifyRuleMeta 等 handlerData 多态 */
export interface RuleMetaDataType {
  type?: string
  variables?: Record<string, string>
  [key: string]: unknown
}
