import { PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, InputNumber, Select } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { parseDeviceRule, updateDeviceRule } from "@/api";
import { AlarmConditionBuilder } from "@/features/devices/components/alarm-condition-builder";
import { DetailTable } from "@/components/detail-table";
import { OptionToggle } from "@/components/option-toggle";
import { DeviceAlarmHandlerEditor } from "@/features/devices/components/device-alarm-handler-editor";
import {
  buildHandlerRuleMeta,
  mapNotifyDtosToRows,
  type DeviceAlarmHandlerRow,
} from "@/features/devices/lib/device-alarm-handler-mappers";
import {
  RowActionBtn,
  RowActionGroup,
  RowActionToggle,
} from "@/components/row-action-buttons";
import { showApiError, showSuccess } from "@/lib/api-message";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";
import {
  formatRuleCondition,
  jsqlToAlarmColumns,
  rulePollLabel,
  type AlarmCond,
} from "@/features/devices/lib/rule-format";
import { POLL_INTERVAL_OPTIONS, normalizeRuleCron } from "@/lib/poll-interval";
import { isRequestCanceled } from "@/lib/request";
import { vtActionColumn } from "@/lib/table-utils";
import { useTranslation } from "@/i18n";
import type { JSqlColumn, RuleModel } from "@/types";

type RuleDraft = RuleModel & { columns?: AlarmCond[][] };

export function DeviceAlarmRulesTab() {
  const { t } = useTranslation();
  const { device, updateMetadata, save, reload } = useDeviceEdit();
  const [draft, setDraft] = useState<{
    rule: RuleDraft;
    handlers: DeviceAlarmHandlerRow[];
    deletedHandlerIds: (number | string)[];
    isNew: boolean;
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!device) return null;

  const properties = device.metadata.properties ?? [];
  const rules = device.metadata.rules ?? [];

  const toJsqlColumns = (groups: AlarmCond[][]): JSqlColumn[][] =>
    groups.map((grp) =>
      grp.map((c) => ({
        column: c.column,
        operation: c.operation,
        value: c.value,
        valueType: c.valueType,
      })),
    );

  const openNew = () => {
    const rule: RuleDraft = {
      id: `r${Date.now()}`,
      name: "",
      state: 1,
      ruleData: { type: "time", cron: POLL_INTERVAL_OPTIONS[0].value, count: 1 },
      ruleMeta: { sql: "", param: {} },
      columns: [[]],
    };
    setDraft({ rule, handlers: [], deletedHandlerIds: [], isNew: true });
    setDrawerOpen(true);
  };

  const openEdit = async (row: RuleModel) => {
    setLoading(true);
    setDrawerOpen(true);
    try {
      const detail = await parseDeviceRule({ ruleId: row.id, deviceId: device.id });
      const base: RuleDraft = JSON.parse(JSON.stringify(detail.rulePo ?? row));
      base.ruleData = {
        type: "time",
        count: base.ruleData?.count ?? 1,
        cron: normalizeRuleCron(base.ruleData),
      };
      base.columns = detail.columns?.length ? jsqlToAlarmColumns(detail.columns) : [[]];
      setDraft({
        rule: base,
        handlers: mapNotifyDtosToRows(detail.notifyDtos),
        deletedHandlerIds: [],
        isNew: false,
      });
    } catch (err) {
      if (isRequestCanceled(err)) return;
      const base: RuleDraft = {
        ...JSON.parse(JSON.stringify(row)),
        columns: [[]],
        ruleData: {
          type: "time",
          count: row.ruleData?.count ?? 1,
          cron: normalizeRuleCron(row.ruleData),
        },
      };
      setDraft({ rule: base, handlers: [], deletedHandlerIds: [], isNew: false });
      showApiError(err, t("devices.detail.rules.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDraft(null);
  };

  const persistRuleList = async (nextRules: RuleModel[]) => {
    updateMetadata((m) => ({ ...m, rules: nextRules }));
    await save();
  };

  const deleteRule = async (r: RuleModel) => {
    try {
      await persistRuleList(rules.filter((x) => x.id !== r.id));
      showSuccess(t("common.deleteSuccess"));
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.detail.saveFailed"));
    }
  };

  const handleToggle = async (r: RuleModel) => {
    const nextState = (r.state ?? 1) === 1 ? 0 : 1;
    setLoading(true);
    try {
      const detail = await parseDeviceRule({ ruleId: r.id, deviceId: device.id });
      const baseRule = detail.rulePo ?? r;
      const alarmColumns = detail.columns?.length
        ? jsqlToAlarmColumns(detail.columns)
        : [[]];
      const handlers = mapNotifyDtosToRows(detail.notifyDtos);
      const { ruleMeta, delMeta } = buildHandlerRuleMeta(handlers, device.id, r.id, []);
      await updateDeviceRule({
        deviceId: device.id,
        ruleModel: { ...baseRule, state: nextState },
        columns: toJsqlColumns(alarmColumns),
        ruleMeta,
        delMeta,
      });
      await reload();
      showSuccess(t("common.saveSuccess"));
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.detail.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft || !draft.rule.name.trim()) return;
    setSaving(true);
    try {
      const cron = normalizeRuleCron(draft.rule.ruleData);
      const ruleModel: RuleModel = {
        ...draft.rule,
        ruleData: {
          ...draft.rule.ruleData,
          type: "time",
          cron,
          count: draft.rule.ruleData?.count ?? 1,
        },
      };
      const { ruleMeta, delMeta } = buildHandlerRuleMeta(
        draft.handlers,
        device.id,
        ruleModel.id,
        draft.deletedHandlerIds,
      );
      await updateDeviceRule({
        deviceId: device.id,
        ruleModel,
        columns: toJsqlColumns(draft.rule.columns ?? [[]]),
        ruleMeta,
        delMeta,
      });
      if (draft.isNew) {
        updateMetadata((m) => ({ ...m, rules: [...(m.rules ?? []), ruleModel] }));
      } else {
        updateMetadata((m) => ({
          ...m,
          rules: (m.rules ?? []).map((x) => (x.id === ruleModel.id ? ruleModel : x)),
        }));
      }
      await reload();
      showSuccess(t("common.saveSuccess"));
      closeDrawer();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.detail.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const ruleColumns: ColumnsType<RuleModel> = [
    { key: "name", title: t("common.ruleName"), dataIndex: "name" },
    {
      key: "poll",
      title: t("common.pollInterval"),
      render: (_, r) => <span className="text-xs text-text-secondary">{rulePollLabel(r)}</span>,
    },
    {
      key: "count",
      title: t("common.thresholdCount"),
      width: 112,
      render: (_, r) => (
        <span className="text-xs text-text-secondary">{r.ruleData?.count ?? 1}</span>
      ),
    },
    {
      key: "condition",
      title: "触发条件",
      render: (_, r) => (
        <span className="max-w-md text-xs text-text-secondary">
          {formatRuleCondition(r, properties)}
        </span>
      ),
    },
    {
      key: "state",
      title: t("common.status"),
      width: 96,
      render: (_, r) => {
        const on = (r.state ?? 1) === 1;
        return on ? (
          <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">
            {t("status.enabled")}
          </span>
        ) : (
          <span className="rounded bg-panel-heavy px-1.5 py-0.5 text-[11px] text-text-muted">
            {t("status.disabled")}
          </span>
        );
      },
    },
    vtActionColumn<RuleModel>(
      t("common.actions"),
      (r) => {
        const on = (r.state ?? 1) === 1;
        return (
          <RowActionGroup>
            <RowActionToggle
              active={on}
              onClick={() => void handleToggle(r)}
              activeLabel={t("common.disable")}
              inactiveLabel={t("common.enable")}
            />
            <RowActionBtn onClick={() => void openEdit(r)}>{t("common.edit")}</RowActionBtn>
            <RowActionBtn
              danger
              confirm={{ description: t("devices.detail.rules.confirmDelete", { name: r.name }) }}
              onClick={() => void deleteRule(r)}
            >
              {t("common.delete")}
            </RowActionBtn>
          </RowActionGroup>
        );
      },
      240,
    ),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center justify-end">
        <button
          type="button"
          onClick={openNew}
          className="vt-detail-action-btn px-2.5 py-1 text-xs"
        >
          <PlusOutlined /> {t("devices.detail.rules.addRule")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        <DetailTable<RuleModel>
          rowKey="id"
          columns={ruleColumns}
          dataSource={rules}
          locale={{ emptyText: t("common.noRules") }}
        />
      </div>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={
          draft?.isNew
            ? t("devices.detail.rules.addRuleDrawer")
            : t("devices.detail.rules.editRule")
        }
        size={760}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={closeDrawer}>
              {t("common.cancel")}
            </Button>
            <Button
              type="primary"
              size="small"
              disabled={saving || loading}
              onClick={() => void handleSave()}
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-text-muted">{t("devices.detail.loading")}</p>
        ) : draft ? (
          <>
            <Form.Item
              label={t("common.ruleName")}
              required
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <Input
                value={draft.rule.name}
                onChange={(e) =>
                  setDraft({ ...draft, rule: { ...draft.rule, name: e.target.value } })
                }
              />
            </Form.Item>
            <Form.Item
              label={t("common.status")}
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <OptionToggle
                value={(draft.rule.state ?? 0) as 0 | 1}
                onChange={(v) => setDraft({ ...draft, rule: { ...draft.rule, state: v } })}
                options={[
                  { label: t("status.enabled"), value: 1 },
                  { label: t("status.disabled"), value: 0 },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={t("devices.detail.rules.triggerTime")}
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <span className="inline-flex items-center rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                {t("devices.detail.rules.triggerTime")}
              </span>
            </Form.Item>
            <Form.Item
              label={t("common.pollInterval")}
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <Select
                className="vt-select-control"
                classNames={{ popup: { root: "vt-select-popup" } }}
                style={{ width: "100%" }}
                value={normalizeRuleCron(draft.rule.ruleData)}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    rule: {
                      ...draft.rule,
                      ruleData: { ...(draft.rule.ruleData ?? { type: "time" }), cron: v },
                    },
                  })
                }
                options={POLL_INTERVAL_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
              />
            </Form.Item>
            <Form.Item
              label={t("common.thresholdCount")}
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <InputNumber
                className="w-full"
                min={1}
                value={draft.rule.ruleData?.count ?? 1}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    rule: {
                      ...draft.rule,
                      ruleData: {
                        ...(draft.rule.ruleData ?? { type: "time" }),
                        count: Number(v) || 1,
                      },
                    },
                  })
                }
              />
            </Form.Item>
            <Form.Item label="触发条件" layout="vertical" className="mb-3">
              <AlarmConditionBuilder
                groups={draft.rule.columns ?? [[]]}
                properties={properties}
                onChange={(columns) => setDraft({ ...draft, rule: { ...draft.rule, columns } })}
                noPropertiesHint={t("devices.detail.meta.noMetadata")}
              />
            </Form.Item>
            <Form.Item label="处理方式" layout="vertical" className="mb-0">
              <DeviceAlarmHandlerEditor
                rows={draft.handlers}
                deletedIds={draft.deletedHandlerIds}
                properties={properties}
                onChange={(handlers) => setDraft({ ...draft, handlers })}
                onDeletedIdsChange={(deletedHandlerIds) =>
                  setDraft({ ...draft, deletedHandlerIds })
                }
              />
            </Form.Item>
          </>
        ) : null}
      </Drawer>
    </div>
  );
}
