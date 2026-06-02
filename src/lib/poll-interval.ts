import type { RuleModel } from "@/types/api/metadata";

// 轮询周期 — 对齐 cloudManagement-old/src/util/common/pollInterval.js
export type PollIntervalOption = {
  label: string;
  value: string;
  seconds: number;
};

export const POLL_INTERVAL_OPTIONS: PollIntervalOption[] = [
  { label: "5 秒", value: "0/5 * * * * ?", seconds: 5 },
  { label: "10 秒", value: "0/10 * * * * ?", seconds: 10 },
  { label: "15 秒", value: "0/15 * * * * ?", seconds: 15 },
  { label: "20 秒", value: "0/20 * * * * ?", seconds: 20 },
  { label: "30 秒", value: "0/30 * * * * ?", seconds: 30 },
  { label: "60 秒", value: "0 */1 * * * ?", seconds: 60 },
  { label: "120 秒", value: "0 */2 * * * ?", seconds: 120 },
];

export function cronToSeconds(cronExpr: string | undefined): number {
  if (!cronExpr) return 0;
  const hit = POLL_INTERVAL_OPTIONS.find((o) => o.value === cronExpr);
  return hit?.seconds ?? 0;
}

export function cronLabel(cron: string | undefined): string {
  if (!cron) return "—";
  const hit = POLL_INTERVAL_OPTIONS.find((o) => o.value === cron);
  return hit?.label ?? cron;
}

/** 编辑规则时归一化 cron / cronNum */
export function normalizeRuleCron(ruleData: RuleModel["ruleData"]): string {
  if (!ruleData) return POLL_INTERVAL_OPTIONS[0].value;
  const d = ruleData as { cron?: string; cronNum?: string };
  return d.cron || d.cronNum || POLL_INTERVAL_OPTIONS[0].value;
}
