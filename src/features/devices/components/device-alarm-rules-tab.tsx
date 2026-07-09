import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Drawer, Form, Input, InputNumber, Select } from 'antd';
import { VtButton } from '@/components/vt-button';
import type { ColumnsType } from "antd/es/table";
import { parseDeviceRule, updateDeviceRule } from "@/api";
import { DetailTable } from "@/components/detail-table";
import { detailFormItemProps, detailBlockFormItemProps, selectFormItemProps } from "@/components/drawer-form";
import { OptionToggle, enabledDisabledNumberOptions } from "@/components/option-toggle";
import {
  RowActionBtn,
  RowActionGroup,
  RowActionToggle,
} from "@/components/row-action-buttons";
import { useTranslation } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/api-message";
import {
  hasValidAlarmHandlers,
  isAlarmConditionFilled,
  requiredInputRule,
  requiredInputError,
  requiredSelectRule,
} from "@/lib/form-validation";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { POLL_INTERVAL_OPTIONS, normalizeRuleCron } from "@/lib/poll-interval";
import { isRequestCanceled } from "@/lib/request";
import { vtActionColumn } from "@/lib/table-utils";
import type { JSqlColumn, RuleModel } from "@/types";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";
import { AlarmConditionBuilder } from "@/features/devices/components/alarm-condition-builder";
import { DeviceAlarmHandlerEditor } from "@/features/devices/components/device-alarm-handler-editor";
import {
  buildHandlerRuleMeta,
  mapNotifyDtosToRows,
  type DeviceAlarmHandlerRow,
} from "@/features/devices/lib/device-alarm-handler-mappers";
import {
  formatRuleCondition,
  jsqlToAlarmColumns,
  rulePollLabel,
  type AlarmCond,
} from "@/features/devices/lib/rule-format";

type RuleDraft = RuleModel & { columns?: AlarmCond[][] };

export function DeviceAlarmRulesTab() {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const { device, updateMetadata, save, reload } = useDeviceEdit();
  const [formApi] = Form.useForm<{
    name: string;
    state: number;
    triggerMode: string;
    pollInterval: string;
    triggerCount: number;
    triggerCondition: string;
    notificationHandler: string;
  }>();
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

  const syncRuleFormFields = (
    rule: RuleDraft,
    handlers: DeviceAlarmHandlerRow[] | undefined,
  ) => {
    formApi.setFieldsValue({
      name: rule.name,
      state: rule.state ?? 0,
      triggerMode: rule.ruleData?.type ?? "time",
      pollInterval: normalizeRuleCron(rule.ruleData),
      triggerCount: rule.ruleData?.count ?? 1,
      triggerCondition: isAlarmConditionFilled(rule.columns) ? "ok" : "",
      notificationHandler: hasValidAlarmHandlers(handlers) ? "ok" : "",
    });
  };

  const syncRuleValidation = (
    columns: AlarmCond[][] | undefined,
    handlers: DeviceAlarmHandlerRow[] | undefined,
  ) => {
    formApi.setFieldsValue({
      triggerCondition: isAlarmConditionFilled(columns) ? "ok" : "",
      notificationHandler: hasValidAlarmHandlers(handlers) ? "ok" : "",
    });
  };

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
    syncRuleFormFields(rule, []);
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
      const handlers = mapNotifyDtosToRows(detail.notifyDtos);
      setDraft({
        rule: base,
        handlers,
        deletedHandlerIds: [],
        isNew: false,
      });
      syncRuleFormFields(base, handlers);
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
      syncRuleFormFields(base, []);
      showApiError(err, t("devices.detail.rules.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDraft(null);
    formApi.resetFields();
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
      const alarmColumns = detail.columns?.length ? jsqlToAlarmColumns(detail.columns) : [[]];
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
    if (!draft) return;
    syncRuleFormFields(draft.rule, draft.handlers);
    try {
      await formApi.validateFields();
    } catch {
      return;
    }
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
      title: t("common.triggerCondition"),
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
        <button type="button" onClick={openNew} className="vt-detail-action-btn px-2.5 py-1 text-xs">
          <PlusOutlined /> {t("devices.detail.rules.addRule")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        <DetailTable rowKey="id" columns={ruleColumns} dataSource={rules} locale={{ emptyText: t("common.noRules") }} />
      </div>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={draft?.isNew ? t("devices.detail.rules.addRuleDrawer") : t("devices.detail.rules.editRule")}
        size={760}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton type="default" onClick={closeDrawer}>
              {t("common.cancel")}
            </VtButton>
            <VtButton type="primary" disabled={saving || loading} onClick={() => void handleSave()}>
              {saving ? t("common.saving") : t("common.save")}
            </VtButton>
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-text-muted">{t("devices.detail.loading")}</p>
        ) : draft ? (
          <Form form={formApi} layout="horizontal">
            <Form.Item
              name="name"
              label={t("common.ruleName")}
              required
              {...detailFormItemProps}
              rules={[requiredInputRule(t, t("common.ruleName"))]}
            >
              <Input
                value={draft.rule.name}
                onChange={(e) => {
                  setDraft({ ...draft, rule: { ...draft.rule, name: e.target.value } });
                  formApi.setFieldValue("name", e.target.value);
                }}
              />
            </Form.Item>
            <Form.Item
              name="state"
              label={t("common.status")}
              required
              {...detailFormItemProps}
              rules={[requiredSelectRule(t, t("common.status"))]}
            >
              <OptionToggle
                value={(draft.rule.state ?? 0) as 0 | 1}
                onChange={(v) => {
                  setDraft({ ...draft, rule: { ...draft.rule, state: v } });
                  formApi.setFieldValue("state", v);
                }}
                options={enabledDisabledNumberOptions(t, "status")}
              />
            </Form.Item>
            <Form.Item
              name="triggerMode"
              label={t("devices.detail.rules.triggerTime")}
              required
              {...detailFormItemProps}
              rules={[requiredSelectRule(t, t("common.triggerMode"))]}
            >
              <span className="inline-flex items-center rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                {t("devices.detail.rules.triggerTime")}
              </span>
            </Form.Item>
            <Form.Item
              name="pollInterval"
              label={t("common.pollInterval")}
              required
              {...detailFormItemProps}
              {...selectFormItemProps}
              rules={[requiredSelectRule(t, t("common.pollInterval"))]}
            >
              <Select
                className="vt-select-control"
                classNames={{ popup: { root: "vt-select-popup" } }}
                style={{ width: "100%" }}
                placeholder={ph.select(t("common.pollInterval"))}
                value={normalizeRuleCron(draft.rule.ruleData)}
                onChange={(v) => {
                  setDraft({
                    ...draft,
                    rule: { ...draft.rule, ruleData: { ...(draft.rule.ruleData ?? { type: "time" }), cron: v } },
                  });
                  formApi.setFieldValue("pollInterval", v);
                }}
                options={POLL_INTERVAL_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
              />
            </Form.Item>
            <Form.Item
              name="triggerCount"
              label={t("common.thresholdCount")}
              required
              {...detailFormItemProps}
              rules={[
                {
                  validator: async (_, val) => {
                    if (!val || Number(val) < 1) {
                      return Promise.reject(requiredInputError(t, t("common.triggerThreshold")));
                    }
                  },
                },
              ]}
            >
              <InputNumber
                className="w-full"
                min={1}
                value={draft.rule.ruleData?.count ?? 1}
                onChange={(v) => {
                  const count = Number(v) || 1;
                  setDraft({
                    ...draft,
                    rule: { ...draft.rule, ruleData: { ...(draft.rule.ruleData ?? { type: "time" }), count } },
                  });
                  formApi.setFieldValue("triggerCount", count);
                }}
              />
            </Form.Item>
            <Form.Item
              name="triggerCondition"
              label={t("common.triggerCondition")}
              required
              {...detailBlockFormItemProps}
              rules={[
                {
                  validator: async () => {
                    if (!isAlarmConditionFilled(draft.rule.columns)) {
                      return Promise.reject(t("validation.triggerConditionRequired"));
                    }
                  },
                },
              ]}
            >
              <AlarmConditionBuilder
                groups={draft.rule.columns ?? [[]]}
                properties={properties}
                onChange={(columns) => {
                  setDraft({ ...draft, rule: { ...draft.rule, columns } });
                  syncRuleValidation(columns, draft.handlers);
                }}
                noPropertiesHint={t("devices.detail.meta.noMetadata")}
              />
            </Form.Item>
            <Form.Item
              name="notificationHandler"
              label={t("common.notificationHandling")}
              required
              {...detailBlockFormItemProps}
              className="mb-0"
              rules={[
                {
                  validator: async () => {
                    if (!hasValidAlarmHandlers(draft.handlers)) {
                      return Promise.reject(t("validation.notificationHandlerRequired"));
                    }
                  },
                },
              ]}
            >
              <DeviceAlarmHandlerEditor
                rows={draft.handlers}
                deletedIds={draft.deletedHandlerIds}
                properties={properties}
                onChange={(handlers) => {
                  setDraft({ ...draft, handlers });
                  syncRuleValidation(draft.rule.columns, handlers);
                }}
                onDeletedIdsChange={(deletedHandlerIds) =>
                  setDraft({ ...draft, deletedHandlerIds })
                }
              />
            </Form.Item>
          </Form>
        ) : null}
      </Drawer>
    </div>
  );
}
