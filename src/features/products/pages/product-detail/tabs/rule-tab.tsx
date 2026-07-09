import { useState } from "react";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Drawer, Form, Input, InputNumber, Select } from 'antd';
import { VtButton } from '@/components/vt-button';
import type { ColumnsType } from "antd/es/table";
import { DetailTable } from "@/components/detail-table";
import { detailFormItemProps, detailBlockFormItemProps, selectFormItemProps } from "@/components/drawer-form";
import { OptionToggle, enableOffNumberOptions } from "@/components/option-toggle";
import { useTranslation } from "@/i18n";
import { vtActionColumn } from "@/lib/table-utils";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";
import { AlarmConditionBuilder } from "@/features/devices/components/alarm-condition-builder";
import {
  formatRuleCondition,
  jsqlToAlarmColumns,
  rulePollLabel,
  type AlarmCond,
} from "@/features/devices/lib/rule-format";
import { parseProductRule } from "@/api";
import { POLL_INTERVAL_OPTIONS, normalizeRuleCron } from "@/lib/poll-interval";
import { isAlarmConditionFilled, requiredInputError, requiredInputRule, requiredSelectRule } from "@/lib/form-validation";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import type { JSqlColumn } from "@/types";
import type { RuleModel } from "@/types/api/metadata";

type RuleDraft = RuleModel & { columns?: AlarmCond[][] };

export function TabRule() {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const { product, updateMetadata, serializeRule } = useProductEdit();
  const [formApi] = Form.useForm<{
    name: string;
    state: number;
    triggerMode: string;
    pollInterval: string;
    triggerCount: number;
    triggerCondition: string;
  }>();
  const [draft, setDraft] = useState<{ rule: RuleDraft; index: number } | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleLoading, setRuleLoading] = useState(false);

  if (!product) return null;

  const properties = product.metadata.properties ?? [];

  const toJsqlColumns = (groups: AlarmCond[][]): JSqlColumn[][] =>
    groups.map((grp) =>
      grp.map((c) => ({
        column: c.column,
        operation: c.operation,
        value: c.value,
        valueType: c.valueType,
      })),
    );

  const syncRuleFormFields = (rule: RuleDraft) => {
    formApi.setFieldsValue({
      name: rule.name,
      state: rule.state ?? 0,
      triggerMode: rule.ruleData?.type ?? "time",
      pollInterval: normalizeRuleCron(rule.ruleData),
      triggerCount: rule.ruleData?.count ?? 1,
      triggerCondition: isAlarmConditionFilled(rule.columns) ? "ok" : "",
    });
  };

  const openRuleEdit = async (row: RuleModel, index: number) => {
    setRuleLoading(true);
    try {
      const base: RuleDraft = JSON.parse(JSON.stringify(row));
      base.ruleData = {
        type: "time",
        count: base.ruleData?.count ?? 1,
        cron: normalizeRuleCron(base.ruleData),
      };
      if (base.ruleMeta?.sql) {
        const parsed = await parseProductRule(base.ruleMeta);
        base.columns = jsqlToAlarmColumns(parsed);
      } else {
        base.columns = base.columns ?? [[]];
      }
      setDraft({ rule: base, index });
      syncRuleFormFields(base);
    } catch {
      const fallback: RuleDraft = {
        ...JSON.parse(JSON.stringify(row)),
        columns: [[]],
        ruleData: {
          type: "time",
          count: row.ruleData?.count ?? 1,
          cron: normalizeRuleCron(row.ruleData),
        },
      };
      setDraft({ rule: fallback, index });
      syncRuleFormFields(fallback);
    } finally {
      setRuleLoading(false);
    }
  };

  const saveRule = async () => {
    if (!draft) return;
    syncRuleFormFields(draft.rule);
    try {
      await formApi.validateFields();
    } catch {
      return;
    }
    setRuleSaving(true);
    try {
      const { columns, ...rulePo } = draft.rule;
      const cron = normalizeRuleCron(draft.rule.ruleData);
      await serializeRule(
        draft.index,
        {
          ...rulePo,
          ruleData: { ...rulePo.ruleData, type: "time", cron, count: rulePo.ruleData?.count ?? 1 },
        },
        toJsqlColumns(columns ?? [[]]),
      );
      setDraft(null);
    } finally {
      setRuleSaving(false);
    }
  };

  type RuleRow = RuleDraft & { index: number };
  const ruleRows: RuleRow[] = ((product.metadata.rules as RuleDraft[]) ?? []).map((r, index) => ({
    ...r,
    index,
  }));

  const ruleColumns: ColumnsType<RuleRow> = [
    { key: "name", title: t("common.ruleName"), dataIndex: "name" },
    {
      key: "poll",
      title: t("common.pollInterval"),
      render: (_, r) => <span className="text-xs text-text-secondary">{rulePollLabel(r)}</span>,
    },
    {
      key: "count",
      title: t("common.thresholdCount"),
      render: (_, r) => (
        <span className="text-xs text-text-secondary">
          {t("devices.products.detail.rule.consecutiveCount", { count: r.ruleData?.count ?? 1 })}
        </span>
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
      render: (_, r) => (
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${
            r.state === 1
              ? "bg-status-online/15 text-status-online"
              : "bg-panel-heavy text-text-muted"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {r.state === 1 ? t("common.enabledState") : t("common.disabledState")}
        </span>
      ),
    },
    vtActionColumn<RuleRow>(
      t("common.actions"),
      (r) => (
        <>
          <button
            disabled={ruleLoading}
            onClick={() => void openRuleEdit(r, r.index)}
            className="mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <EditOutlined className="h-3 w-3" /> {t("common.edit")}
          </button>
          <button
            onClick={() =>
              updateMetadata((m) => ({
                ...m,
                rules: (m.rules ?? []).filter((_, idx) => idx !== r.index),
              }))
            }
            className="mx-0.5 inline-flex items-center gap-1 rounded border border-status-critical/40 px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10"
          >
            <DeleteOutlined className="h-3 w-3" /> {t("common.delete")}
          </button>
        </>
      ),
      180,
    ),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center justify-end">
        <button
          type="button"
          onClick={() => {
            const rule: RuleDraft = {
              id: `r${Date.now()}`,
              name: "",
              state: 1,
              ruleData: { type: "time", cron: POLL_INTERVAL_OPTIONS[0].value, count: 1 },
              ruleMeta: { sql: "", param: {} },
              columns: [[]],
            };
            setDraft({ rule, index: -1 });
            syncRuleFormFields(rule);
          }}
          className="vt-detail-action-btn px-2.5 py-1 text-xs"
        >
          <PlusOutlined /> {t("devices.products.detail.rule.addRule")}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        <DetailTable rowKey="id" columns={ruleColumns} dataSource={ruleRows} locale={{ emptyText: t("common.noRules") }} />
      </div>

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!draft}
        onClose={() => {
          setDraft(null);
          formApi.resetFields();
        }}
        title={draft && draft.index < 0 ? t("devices.products.detail.rule.addAlarmRule") : t("devices.products.detail.rule.editRule")}
        size={720}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton type="default" onClick={() => setDraft(null)}>
              {t("common.cancel")}
            </VtButton>
            <VtButton type="primary" disabled={ruleSaving} onClick={() => void saveRule()}>
              {ruleSaving ? t("common.saving") : t("common.save")}
            </VtButton>
          </div>
        }
      >
        {draft && (
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
              label={t("common.workState")}
              required
              {...detailFormItemProps}
              rules={[requiredSelectRule(t, t("common.workState"))]}
            >
              <OptionToggle
                value={(draft.rule.state ?? 0) as 0 | 1}
                onChange={(v) => {
                  setDraft({ ...draft, rule: { ...draft.rule, state: v } });
                  formApi.setFieldValue("state", v);
                }}
                options={enableOffNumberOptions(t)}
              />
            </Form.Item>
            <Form.Item
              name="triggerMode"
              label={t("common.triggerMode")}
              required
              {...detailFormItemProps}
              rules={[requiredSelectRule(t, t("common.triggerMode"))]}
            >
              <span className="inline-flex items-center rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                {t("devices.products.detail.rule.timedPollLabel")}
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
              label={t("common.triggerThreshold")}
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
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-muted">{t("common.consecutive")}</span>
                <InputNumber
                  min={1}
                  className="w-20"
                  value={draft.rule.ruleData?.count ?? 1}
                  onChange={(v) => {
                    const count = Number(v) || 1;
                    setDraft({
                      ...draft,
                      rule: {
                        ...draft.rule,
                        ruleData: { ...(draft.rule.ruleData ?? { type: "time" }), count },
                      },
                    });
                    formApi.setFieldValue("triggerCount", count);
                  }}
                />
                <span className="text-xs text-text-muted">{t("common.consecutiveSuffix")}</span>
              </div>
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
                  formApi.setFieldValue(
                    "triggerCondition",
                    isAlarmConditionFilled(columns) ? "ok" : "",
                  );
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </div>
  );
}
