import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Input, InputNumber, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "@/i18n";
import { operationsFor, type AlarmCond } from "@/features/devices/lib/rule-format";
import type { EnumDataItem, SimplePropertyMetadata } from "@/types/api/metadata";

const selectProps = {
  className: "vt-select-control",
  classNames: { popup: { root: "vt-select-popup" } },
  style: { width: "100%" } as const,
};

export function AlarmConditionBuilder({
  groups,
  properties,
  onChange,
  emptyHint,
  noPropertiesHint,
}: {
  groups: AlarmCond[][];
  properties: SimplePropertyMetadata[];
  onChange: (g: AlarmCond[][]) => void;
  emptyHint?: string;
  noPropertiesHint?: string;
}) {
  const { t } = useTranslation();
  const resolvedEmptyHint = emptyHint ?? t("common.noConditions");

  const setRow = (gi: number, ri: number, patch: Partial<AlarmCond>) => {
    onChange(
      groups.map((g, i) => (i !== gi ? g : g.map((r, j) => (j !== ri ? r : { ...r, ...patch })))),
    );
  };

  const addRow = (gi: number) => {
    if (properties.length === 0) return;
    const p = properties[0];
    const ops = operationsFor(p.valueType?.type);
    const newRow: AlarmCond = {
      column: p.id,
      operation: ops[0].value,
      value:
        p.valueType?.type === "enum"
          ? (p.valueType.extra?.enumData?.[0]?.key ?? "")
          : ["int", "long", "float", "double", "number"].includes(p.valueType?.type ?? "")
            ? 0
            : "",
      valueType: p.valueType?.type,
    };
    onChange(groups.map((g, i) => (i !== gi ? g : [...g, newRow])));
  };

  const delRow = (gi: number, ri: number) =>
    onChange(groups.map((g, i) => (i !== gi ? g : g.filter((_, j) => j !== ri))));

  const addGroup = () => onChange([...groups, []]);
  const delGroup = (gi: number) => onChange(groups.filter((_, i) => i !== gi));

  const onColumnChange = (gi: number, ri: number, columnId: string) => {
    const p = properties.find((x) => x.id === columnId);
    if (!p) return;
    const ops = operationsFor(p.valueType?.type);
    setRow(gi, ri, {
      column: columnId,
      operation: ops[0].value,
      valueType: p.valueType?.type,
      value:
        p.valueType?.type === "enum"
          ? (p.valueType.extra?.enumData?.[0]?.key ?? "")
          : ["int", "long", "float", "double", "number"].includes(p.valueType?.type ?? "")
            ? 0
            : "",
    });
  };

  type CondRow = { ri: number; cond: AlarmCond };
  const condColumns = (gi: number): ColumnsType<CondRow> => [
    {
      key: "column",
      title: t("common.property"),
      render: (_, { ri, cond: r }) => (
        <Select
          {...selectProps}
          value={r.column || undefined}
          placeholder={t("validation.requiredSelect", { label: t("common.property") })}
          onChange={(v) => onColumnChange(gi, ri, v)}
          options={properties.map((pp) => ({ label: pp.name, value: pp.id }))}
        />
      ),
    },
    {
      key: "operation",
      title: t("common.compare"),
      render: (_, { ri, cond: r }) => {
        const p = properties.find((x) => x.id === r.column);
        const ops = operationsFor(p?.valueType?.type);
        return (
          <Select
            {...selectProps}
            value={r.operation}
            onChange={(v) => setRow(gi, ri, { operation: v })}
            options={ops.map((o) => ({ label: o.label, value: o.value }))}
          />
        );
      },
    },
    {
      key: "value",
      title: t("common.value"),
      render: (_, { ri, cond: r }) => {
        const p = properties.find((x) => x.id === r.column);
        const isNumber = ["int", "long", "float", "double", "number"].includes(
          p?.valueType?.type ?? "",
        );
        const isEnum = p?.valueType?.type === "enum";
        const enumData = (p?.valueType?.extra?.enumData as EnumDataItem[]) ?? [];
        if (r.operation === "IS NOT NULL") return <span className="text-text-muted">—</span>;
        if (isEnum) {
          return (
            <Select
              {...selectProps}
              value={String(r.value)}
              onChange={(v) => setRow(gi, ri, { value: v })}
              options={enumData.map((d) => ({ label: d.value, value: d.key }))}
            />
          );
        }
        if (isNumber) {
          return (
            <InputNumber
              className="w-full"
              value={Number(r.value) || 0}
              onChange={(v) => setRow(gi, ri, { value: Number(v) || 0 })}
            />
          );
        }
        return <Input value={String(r.value ?? "")} onChange={(e) => setRow(gi, ri, { value: e.target.value })} />;
      },
    },
    {
      key: "actions",
      width: 48,
      align: "right",
      render: (_, { ri }) => (
        <button
          type="button"
          onClick={() => delRow(gi, ri)}
          className="rounded p-1 text-text-muted hover:bg-status-critical/10 hover:text-status-critical"
        >
          <DeleteOutlined className="h-3 w-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {groups.map((rows, gi) => (
        <div key={gi} className="rounded border border-dashed border-panel-border p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="rounded bg-panel/60 px-1.5 py-0.5 text-[10px] text-text-muted">
              {t("common.conditionGroup", { n: gi + 1 })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => addRow(gi)}
                className="inline-flex items-center gap-0.5 rounded border border-panel-border px-1.5 py-0.5 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary"
              >
                <PlusOutlined className="h-3 w-3" /> {t("common.addCondition")}
              </button>
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => delGroup(gi)}
                  className="rounded border border-status-critical/40 p-1 text-status-critical hover:bg-status-critical/10"
                >
                  <DeleteOutlined className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <Table
            rowKey="ri"
            size="small"
            pagination={false}
            columns={condColumns(gi)}
            dataSource={rows.map((cond, ri) => ({ ri, cond }))}
            locale={{ emptyText: resolvedEmptyHint }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addGroup}
        className="inline-flex items-center gap-1 rounded border border-dashed border-panel-border px-3 py-1 text-xs text-text-muted hover:border-primary/40 hover:text-primary"
      >
        <PlusOutlined className="h-3.5 w-3.5" /> {t("common.addConditionGroup")}
      </button>
      {noPropertiesHint && properties.length === 0 && <p className="text-xs text-status-warning">{noPropertiesHint}</p>}
    </div>
  );
}
