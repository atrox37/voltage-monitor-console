// 轮询周期预设 — 对照 src/util/common/pollInterval.js
export type PollIntervalOption = {
  label: string;
  value: string; // cron expression
  seconds: number;
};

export const POLL_INTERVAL_OPTIONS: PollIntervalOption[] = [
  { label: "每 5 秒",  value: "0/5 * * * * ?",  seconds: 5 },
  { label: "每 10 秒", value: "0/10 * * * * ?", seconds: 10 },
  { label: "每 30 秒", value: "0/30 * * * * ?", seconds: 30 },
  { label: "每 1 分钟", value: "0 0/1 * * * ?", seconds: 60 },
  { label: "每 5 分钟", value: "0 0/5 * * * ?", seconds: 300 },
  { label: "每 10 分钟", value: "0 0/10 * * * ?", seconds: 600 },
  { label: "每 30 分钟", value: "0 0/30 * * * ?", seconds: 1800 },
  { label: "每 1 小时", value: "0 0 0/1 * * ?", seconds: 3600 },
];

export function cronLabel(cron: string | undefined): string {
  if (!cron) return "—";
  const hit = POLL_INTERVAL_OPTIONS.find((o) => o.value === cron);
  return hit?.label ?? cron;
}
