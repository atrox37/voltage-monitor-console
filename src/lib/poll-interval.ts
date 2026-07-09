import { useMemo } from "react";
import { getLocale, translate, useTranslation } from "@/i18n";
import type { RuleModel } from "@/types/api/metadata";

export type PollIntervalOption = {
  label: string;
  value: string;
  seconds: number;
};

const POLL_INTERVAL_VALUES: Omit<PollIntervalOption, "label">[] = [
  { value: "0/5 * * * * ?", seconds: 5 },
  { value: "0/10 * * * * ?", seconds: 10 },
  { value: "0/15 * * * * ?", seconds: 15 },
  { value: "0/20 * * * * ?", seconds: 20 },
  { value: "0/30 * * * * ?", seconds: 30 },
  { value: "0 */1 * * * ?", seconds: 60 },
];

function pollIntervalLabel(seconds: number, loc = getLocale()): string {
  return translate(loc, "devices.pollInterval.seconds", { seconds });
}

export function getPollIntervalOptions(loc = getLocale()): PollIntervalOption[] {
  return POLL_INTERVAL_VALUES.map((item) => ({
    ...item,
    label: pollIntervalLabel(item.seconds, loc),
  }));
}

/** @deprecated 使用 getPollIntervalOptions() 或 usePollIntervalOptions() */
export const POLL_INTERVAL_OPTIONS: PollIntervalOption[] = getPollIntervalOptions();

export function usePollIntervalOptions() {
  const { t } = useTranslation();
  return useMemo(
    () =>
      POLL_INTERVAL_VALUES.map((item) => ({
        ...item,
        label: t("devices.pollInterval.seconds", { seconds: item.seconds }),
      })),
    [t],
  );
}

export function cronToSeconds(cronExpr: string | undefined): number {
  if (!cronExpr) return 0;
  const hit = POLL_INTERVAL_VALUES.find((o) => o.value === cronExpr);
  return hit?.seconds ?? 0;
}

export function cronLabel(cron: string | undefined, loc = getLocale()): string {
  if (!cron) return "—";
  const hit = POLL_INTERVAL_VALUES.find((o) => o.value === cron);
  return hit ? pollIntervalLabel(hit.seconds, loc) : cron;
}

export function normalizeRuleCron(ruleData: RuleModel["ruleData"]): string {
  if (!ruleData) return POLL_INTERVAL_VALUES[0].value;
  const d = ruleData as { cron?: string; cronNum?: string };
  return d.cron || d.cronNum || POLL_INTERVAL_VALUES[0].value;
}
