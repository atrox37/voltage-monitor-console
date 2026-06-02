import type { RuleMeta, RuleModel, SimplePropertyMetadata } from "@/types/api/metadata";
import type { JSqlColumn } from "@/types";
import { cronLabel } from "@/lib/poll-interval";

export type AlarmCond = {
  column: string;
  operation: string;
  value: string | number | boolean;
  valueType?: string;
};

/** 列表展示轮询周期 — 对齐 TabProductRule.handlerCroe */
export function rulePollLabel(rule: RuleModel): string {
  const cron = rule.ruleData?.cron ?? (rule.ruleData as { cronNum?: string } | undefined)?.cronNum;
  return cronLabel(cron);
}

/** 列表展示触发条件 — 对齐 TabProductRule.formatSql */
export function formatRuleCondition(
  rule: RuleModel,
  properties: SimplePropertyMetadata[],
): string {
  try {
    if (!rule.ruleMeta) return "—";
    let sql = String(rule.ruleMeta.sql || "");
    const param = rule.ruleMeta.param || {};

    const idNameMap = Object.fromEntries(properties.map((p) => [p.id, p.name || p.id]));

    const buckets: Record<string, unknown[]> = {};
    Object.keys(param).forEach((k) => {
      const v = param[k];
      buckets[k] = Array.isArray(v) ? [...v] : [v];
    });

    sql = sql.replace(/^\s*select\s*\*\s*where\s*/i, "");

    sql = sql.replace(
      /\b([a-zA-Z_][\w]*)\b(\s*(?:>=|<=|!=|=|>|<)\s*)\?/g,
      (_m, key: string, op: string) => {
        const name = idNameMap[key] || key;
        const list = buckets[key] || [];
        const value = list.length ? list.shift() : "?";
        buckets[key] = list;
        return `${name}${op}${value}`;
      },
    );

    Object.keys(idNameMap).forEach((id) => {
      const escaped = id.replace(/[-/\\^$*+?.()|[\]{}]/g, (r) => `\\${r}`);
      const re = new RegExp(`\\b${escaped}\\b`, "g");
      sql = sql.replace(re, idNameMap[id]);
    });

    return sql.replace(/\band\b/gi, " 且 ").replace(/\bor\b/gi, " 或 ").trim() || "—";
  } catch {
    return "—";
  }
}

export function jsqlToAlarmColumns(groups: JSqlColumn[][]): AlarmCond[][] {
  return groups.map((grp) =>
    grp.map((c) => ({
      column: String(c.column ?? ""),
      operation: String(c.operation ?? "="),
      value: (c.value ?? "") as string | number | boolean,
      valueType: c.valueType ? String(c.valueType) : undefined,
    })),
  );
}

export function ruleMetaFrom(rule: RuleModel): RuleMeta | undefined {
  return rule.ruleMeta;
}
