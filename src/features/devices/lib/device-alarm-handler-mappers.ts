import type { DeviceRuleMetaPo, RuleNotifyDto } from "@/types";

export type DeviceAlarmHandlerRow = {
  id?: number | string;
  userId: string;
  templateId: string;
  configId?: string;
  handlerType: "notify";
  handlerData: NonNullable<DeviceRuleMetaPo["handlerData"]>;
};

export function mapNotifyDtosToRows(dtos: RuleNotifyDto[] | undefined): DeviceAlarmHandlerRow[] {
  return (dtos ?? []).map((item) => {
    const meta = item.ruleMetaPo ?? {};
    return {
      id: meta.id,
      userId: String(meta.userId ?? item.sysUserPo?.id ?? ""),
      templateId: String(meta.templateId ?? item.notifyTemplatePo?.id ?? ""),
      configId: String(item.notifyConfigPo?.id ?? ""),
      handlerType: "notify",
      handlerData: meta.handlerData ?? { type: "notify", variables: {} },
    };
  });
}

export function buildHandlerRuleMeta(
  rows: DeviceAlarmHandlerRow[],
  deviceId: string,
  ruleId: string,
  deletedIds: (number | string)[],
): { ruleMeta: DeviceRuleMetaPo[]; delMeta: (number | string)[] } {
  const ruleMeta: DeviceRuleMetaPo[] = rows
    .filter((r) => r.templateId && r.userId)
    .map((r) => ({
      id: r.id,
      deviceId,
      ruleId,
      userId: r.userId,
      templateId: r.templateId,
      handlerType: r.handlerType,
      handlerData: r.handlerData,
    }));
  return { ruleMeta, delMeta: deletedIds };
}
