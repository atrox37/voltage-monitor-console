import { useState } from "react";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, InputNumber, Select } from "antd";
import { OptionToggle } from "@/components/option-toggle";
import { DetailTable } from "@/components/detail-table";
import type { ColumnsType } from "antd/es/table";
import { vtActionColumn } from "@/lib/table-utils";
import { useConfirm } from "@/components/confirm-dialog";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";
import { POLL_INTERVAL_OPTIONS, normalizeRuleCron } from "@/lib/poll-interval";

import { AlarmConditionBuilder } from "@/features/devices/components/alarm-condition-builder";
import {
  formatRuleCondition,
  jsqlToAlarmColumns,
  rulePollLabel,
  type AlarmCond,
} from "@/features/devices/lib/rule-format";
import { parseProductRule } from "@/api";
import type { JSqlColumn } from "@/types";
import type { RuleModel } from "@/types/api/metadata";

type RuleDraft = RuleModel & { columns?: AlarmCond[][] };

export function TabRule() {
  const { product, updateMetadata, serializeRule } = useProductEdit();
  const { confirm, confirmNode } = useConfirm();
  const [draft, setDraft] = useState<{ rule: RuleDraft; index: number } | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleLoading, setRuleLoading] = useState(false);

  const properties = product?.metadata.properties ?? [];

  const toJsqlColumns = (groups: AlarmCond[][]): JSqlColumn[][] =>
    groups.map((grp) =>
      grp.map((c) => ({
        column: c.column,
        operation: c.operation,
        value: c.value,
        valueType: c.valueType,
      })),
    );

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
    } catch {
      setDraft({
        rule: {
          ...JSON.parse(JSON.stringify(row)),
          columns: [[]],
          ruleData: {
            type: "time",
            count: row.ruleData?.count ?? 1,
            cron: normalizeRuleCron(row.ruleData),
          },
        },
        index,
      });
    } finally {
      setRuleLoading(false);
    }
  };

  const saveRule = async () => {
    if (!draft || !draft.rule.name.trim()) return;
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
    } catch {
      // toast handled in context
    } finally {
      setRuleSaving(false);
    }
  };

  if (!product) return null;

  type RuleRow = RuleDraft & { index: number };
  const ruleRows: RuleRow[] = ((product.metadata.rules as RuleDraft[]) ?? []).map((r, index) => ({
    ...r,
    index,
  }));
  const ruleColumns: ColumnsType<RuleRow> = [
    { key: "name", title: "规则名称", dataIndex: "name" },
    {
      key: "poll",
      title: "轮询周期",
      render: (_, r) => <span className="text-xs text-text-secondary">{rulePollLabel(r)}</span>,
    },
    {
      key: "count",
      title: "触发阈值",
      render: (_, r) => (
        <span className="text-xs text-text-secondary">连续 {r.ruleData?.count ?? 1} 次</span>
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
      title: "状态",
      render: (_, r) => (
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${
            r.state === 1
              ? "bg-status-online/15 text-status-online"
              : "bg-panel-heavy text-text-muted"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {r.state === 1 ? "已启用" : "已禁用"}
        </span>
      ),
    },
    vtActionColumn<RuleRow>(
      "操作",
      (r) => (
        <>
          <button
            disabled={ruleLoading}
            onClick={() => void openRuleEdit(r, r.index)}
            className="mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <EditOutlined className="h-3 w-3" /> 编辑
          </button>
          <button
            onClick={() =>
              confirm({
                description: (
                  <>
                    确定删除规则 <span className="font-semibold text-foreground">「{r.name}」</span>{" "}
                    吗？
                  </>
                ),
                onConfirm: () =>
                  updateMetadata((m) => ({
                    ...m,
                    rules: (m.rules ?? []).filter((_, idx) => idx !== r.index),
                  })),
              })
            }
            className="mx-0.5 inline-flex items-center gap-1 rounded border border-status-critical/40 px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10"
          >
            <DeleteOutlined className="h-3 w-3" /> 删除
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
          onClick={() =>
            setDraft({
              rule: {
                id: `r${Date.now()}`,
                name: "",
                state: 1,
                ruleData: { type: "time", cron: POLL_INTERVAL_OPTIONS[0].value, count: 1 },
                ruleMeta: { sql: "", param: {} },
                columns: [[]],
              },
              index: -1,
            })
          }
          className="vt-detail-action-btn px-2.5 py-1 text-xs"
        >
          <PlusOutlined /> 新增规则
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        <DetailTable<RuleRow>
          rowKey="id"
          columns={ruleColumns}
          dataSource={ruleRows}
          locale={{ emptyText: "暂无规则" }}
        />
      </div>

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft && draft.index < 0 ? "新增告警规则" : "编辑告警规则"}
        size={720}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={() => setDraft(null)}>
              取消
            </Button>
            <Button
              type="primary"
              size="small"
              disabled={ruleSaving}
              onClick={() => void saveRule()}
            >
              {ruleSaving ? "保存中…" : "保存"}
            </Button>
          </div>
        }
      >
        {draft && (
          <>
            <Form.Item
              label="规则名称"
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
              label="工作状态"
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <OptionToggle
                value={(draft.rule.state ?? 0) as 0 | 1}
                onChange={(v) => setDraft({ ...draft, rule: { ...draft.rule, state: v } })}
                options={[
                  { label: "启用", value: 1 },
                  { label: "关闭", value: 0 },
                ]}
              />
            </Form.Item>
            <Form.Item
              label="触发方式"
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <span className="inline-flex items-center rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                定时轮询
              </span>
            </Form.Item>
            <Form.Item
              label="轮询周期"
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
              label="触发阈值"
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              className="mb-3"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-muted">连续</span>
                <InputNumber
                  min={1}
                  className="w-20"
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
                <span className="text-xs text-text-muted">次满足条件后触发</span>
              </div>
            </Form.Item>
            <Form.Item label="触发条件" layout="vertical" className="mb-3">
              <AlarmConditionBuilder
                groups={draft.rule.columns ?? [[]]}
                properties={properties}
                onChange={(columns) => setDraft({ ...draft, rule: { ...draft.rule, columns } })}
              />
            </Form.Item>
          </>
        )}
      </Drawer>

      {confirmNode}
    </div>
  );
}
