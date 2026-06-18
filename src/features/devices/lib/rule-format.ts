import { getLocale, translate } from "@/i18n";
import { cronLabel } from "@/lib/poll-interval";
import type { JSqlColumn } from "@/types";
import type { RuleMeta, RuleModel, SimplePropertyMetadata } from "@/types/api/metadata";

export type AlarmCond = {
  column: string;
  operation: string;
  value: string | number | boolean;
  valueType?: string;
};

function opLabelMap() {
  return {
    ">": translate(getLocale(), "devices.products.detail.rule.opGt"),
    "<": translate(getLocale(), "devices.products.detail.rule.opLt"),
    "=": translate(getLocale(), "devices.products.detail.rule.opEq"),
    ">=": translate(getLocale(), "devices.products.detail.rule.opGte"),
    "<=": translate(getLocale(), "devices.products.detail.rule.opLte"),
    "!=": translate(getLocale(), "devices.products.detail.rule.opNe"),
    "IS NOT NULL": translate(getLocale(), "devices.products.detail.rule.opNotNull"),
  } as const;
}

export function operationsFor(type: string | undefined) {
  const labels = opLabelMap();
  if (type === "enum") return [{ value: "=", label: labels["="] }] as const;
  if (["int", "long", "float", "double", "number"].includes(type ?? "")) {
    return [
      { value: ">", label: labels[">"] },
      { value: "<", label: labels["<"] },
      { value: "=", label: labels["="] },
      { value: ">=", label: labels[">="] },
      { value: "<=", label: labels["<="] },
      { value: "!=", label: labels["!="] },
    ] as const;
  }
  return [
    { value: "=", label: labels["="] },
    { value: "IS NOT NULL", label: labels["IS NOT NULL"] },
  ] as const;
}

export function rulePollLabel(rule: RuleModel): string {
  const cron = rule.ruleData?.cron ?? (rule.ruleData as { cronNum?: string } | undefined)?.cronNum;
  return cronLabel(cron);
}

export function formatRuleCondition(rule: RuleModel, properties: SimplePropertyMetadata[]): string {
  const empty = "—";
  try {
    if (!rule.ruleMeta) return empty;
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

    const andWord = getLocale() === "zh-CN" ? " 且 " : " AND ";
    const orWord = getLocale() === "zh-CN" ? " 或 " : " OR ";

    return sql.replace(/\band\b/gi, andWord).replace(/\bor\b/gi, orWord).trim() || empty;
  } catch {
    return empty;
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
