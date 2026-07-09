import { useCallback, useEffect, useMemo, useState } from "react";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Drawer, Form, Input, Select, Table, Tag } from 'antd';
import { VtButton } from '@/components/vt-button';
import { detailFormItemProps } from "@/components/drawer-form";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "@/i18n";
import { pageNotifyTemplates } from "@/api";
import { pageUsers } from "@/api/sys";
import { isRequestCanceled } from "@/lib/request";
import type { NotifyTemplatePageDto } from "@/types";
import type { SimplePropertyMetadata } from "@/types/api/metadata";
import type { DeviceAlarmHandlerRow } from "@/features/devices/lib/device-alarm-handler-mappers";

const selectProps = {
  className: "vt-select-control",
  classNames: { popup: { root: "vt-select-popup" } },
  style: { width: "100%" } as const,
};

function parseMsgContent(raw: unknown): { title?: string; content?: string } {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return parseMsgContent(JSON.parse(raw));
    } catch {
      return { content: raw };
    }
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return {
      title: String(o.title ?? o.subject ?? ""),
      content: String(o.content ?? o.body ?? ""),
    };
  }
  return {};
}

function parseTemplateVarKeys(template: NotifyTemplatePageDto["templatePo"]): string[] {
  const vars = new Set<string>();
  const re = /\{\$([^}]+)\}/g;
  const msg = parseMsgContent(template.msgContent);
  for (const text of [msg.title, msg.content]) {
    if (!text) continue;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1]?.trim();
      if (name) vars.add(name);
    }
  }
  return [...vars];
}

function parsePropertyPointKeys(template: NotifyTemplatePageDto["templatePo"]): string[] {
  const pts = new Set<string>();
  const re = /\{#([^}]+)\}/g;
  const msg = parseMsgContent(template.msgContent);
  for (const text of [msg.title, msg.content]) {
    if (!text) continue;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1]?.trim();
      if (name) pts.add(name);
    }
  }
  return [...pts];
}

type VarsDrawerState = {
  index: number;
  templateKeys: string[];
  pointKeys: string[];
  draft: Record<string, string>;
};

export function DeviceAlarmHandlerEditor({
  rows,
  onChange,
  deletedIds,
  onDeletedIdsChange,
  properties,
}: {
  rows: DeviceAlarmHandlerRow[];
  onChange: (rows: DeviceAlarmHandlerRow[]) => void;
  deletedIds: (number | string)[];
  onDeletedIdsChange: (ids: (number | string)[]) => void;
  properties: SimplePropertyMetadata[];
}) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<NotifyTemplatePageDto[]>([]);
  const [users, setUsers] = useState<{ id: string; label: string }[]>([]);
  const [varsDrawer, setVarsDrawer] = useState<VarsDrawerState | null>(null);

  const propertyIdSet = useMemo(() => new Set(properties.map((p) => String(p.id))), [properties]);
  const propertyNameMap = useMemo(
    () => Object.fromEntries(properties.map((p) => [String(p.id), p.name || p.id])),
    [properties],
  );

  const loadOptions = useCallback(async () => {
    try {
      const [tplRes, userRes] = await Promise.all([
        pageNotifyTemplates({ current: 1, size: -1, terms: [], sorts: [] }),
        pageUsers({ current: 1, size: -1, terms: [] }),
      ]);
      setTemplates(tplRes.records ?? tplRes.data ?? []);
      const list = userRes.records ?? userRes.data ?? [];
      setUsers(
        list.map((u) => ({
          id: String(u.sysUserPo.id ?? ""),
          label: u.sysUserPo.username ?? String(u.sysUserPo.id ?? ""),
        })),
      );
    } catch (err) {
      if (isRequestCanceled(err)) return;
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const templateOptions = useMemo(
    () =>
      templates.map((item) => ({
        value: String(item.templatePo.id ?? ""),
        label: item.templatePo.name ?? "",
        configId: String(item.configPo?.id ?? item.templatePo.configId ?? ""),
        template: item.templatePo,
      })),
    [templates],
  );

  const addRow = () => {
    onChange([
      ...rows,
      {
        userId: "",
        templateId: "",
        handlerType: "notify",
        handlerData: { type: "notify", variables: {} },
      },
    ]);
  };

  const removeRow = (index: number) => {
    const row = rows[index];
    if (row?.id != null) {
      onDeletedIdsChange([...deletedIds, row.id]);
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  const patchRow = (index: number, patch: Partial<DeviceAlarmHandlerRow>) => {
    onChange(rows.map((r, i) => (i !== index ? r : { ...r, ...patch })));
  };

  const onTemplateChange = (index: number, templateId: string) => {
    const hit = templateOptions.find((o) => o.value === templateId);
    const variables =
      hit?.template.variables &&
      typeof hit.template.variables === "object" &&
      !Array.isArray(hit.template.variables)
        ? { ...(hit.template.variables as Record<string, string>) }
        : {};
    patchRow(index, {
      templateId,
      configId: hit?.configId,
      handlerData: { type: "notify", variables },
    });
  };

  const openVarsDrawer = (index: number) => {
    const row = rows[index];
    const hit = templateOptions.find((o) => o.value === row.templateId);
    if (!hit) return;
    const templateKeys = parseTemplateVarKeys(hit.template);
    const pointKeys = parsePropertyPointKeys(hit.template);
    const existing = row.handlerData?.variables ?? {};
    const draft: Record<string, string> = {};
    for (const key of [...templateKeys, ...pointKeys]) {
      draft[key] = existing[key] != null ? String(existing[key]) : "";
    }
    setVarsDrawer({ index, templateKeys, pointKeys, draft });
  };

  const matchedPointIds = varsDrawer
    ? varsDrawer.pointKeys.filter((id) => propertyIdSet.has(String(id)))
    : [];
  const unmatchedPointIds = varsDrawer
    ? varsDrawer.pointKeys.filter((id) => !propertyIdSet.has(String(id)))
    : [];

  const columns: ColumnsType<DeviceAlarmHandlerRow & { index: number }> = [
    {
      key: "user",
      title: t("common.notificationUser"),
      render: (_, r) => (
        <Select
          {...selectProps}
          placeholder={t("validation.requiredSelect", { label: t("common.notificationUser") })}
          value={r.userId || undefined}
          onChange={(v) => patchRow(r.index, { userId: v })}
          options={users.map((u) => ({ label: u.label, value: u.id }))}
        />
      ),
    },
    {
      key: "template",
      title: t("common.notificationTemplate"),
      render: (_, r) => (
        <Select
          {...selectProps}
          placeholder={t("validation.requiredSelect", { label: t("common.notificationTemplate") })}
          value={r.templateId || undefined}
          onChange={(v) => onTemplateChange(r.index, v)}
          options={templateOptions.map((o) => ({ label: o.label, value: o.value }))}
        />
      ),
    },
    {
      key: "vars",
      title: t("common.templateVariables"),
      width: 120,
      render: (_, r) => (
        <VtButton type="default" disabled={!r.templateId} onClick={() => openVarsDrawer(r.index)}>
          {t("common.edit")}
        </VtButton>
      ),
    },
    {
      key: "actions",
      width: 48,
      align: "center",
      render: (_, r) => (
        <button
          type="button"
          onClick={() => removeRow(r.index)}
          className="rounded p-1 text-text-muted hover:bg-status-critical/10 hover:text-status-critical"
        >
          <DeleteOutlined className="h-3 w-3" />
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          {t("common.notificationHandling")} · {t("common.notify")}
        </span>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-text-secondary hover:border-primary/40 hover:text-primary"
        >
          <PlusOutlined className="h-3 w-3" /> {t("common.add")}
        </button>
      </div>
      <Table
        rowKey={(_, i) => String(i)}
        pagination={false}
        columns={columns}
        dataSource={rows.map((row, index) => ({ ...row, index }))}
        locale={{ emptyText: t("common.noNotificationHandlers") }}
      />

      <Drawer
        open={!!varsDrawer}
        onClose={() => setVarsDrawer(null)}
        title={t("common.editTemplateVariables")}
        size={480}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={
          <div className="flex justify-end gap-2">
            <VtButton type="default" onClick={() => setVarsDrawer(null)}>
              {t("common.cancel")}
            </VtButton>
            <VtButton
              type="primary"
              onClick={() => {
                if (!varsDrawer) return;
                const row = rows[varsDrawer.index];
                patchRow(varsDrawer.index, {
                  handlerData: {
                    ...row.handlerData,
                    type: "notify",
                    variables: { ...varsDrawer.draft },
                  },
                });
                setVarsDrawer(null);
              }}
            >
              {t("common.confirm")}
            </VtButton>
          </div>
        }
      >
        {varsDrawer && (
          <>
            {varsDrawer.templateKeys.map((key) => (
              <Form.Item key={key} label={key} {...detailFormItemProps}>
                <Input
                  placeholder={t("common.none")}
                  value={varsDrawer.draft[key] ?? ""}
                  onChange={(e) =>
                    setVarsDrawer({
                      ...varsDrawer,
                      draft: { ...varsDrawer.draft, [key]: e.target.value },
                    })
                  }
                />
              </Form.Item>
            ))}
            {varsDrawer.templateKeys.length === 0 && varsDrawer.pointKeys.length === 0 && (
              <p className="text-xs text-text-muted">{t("common.noEditablePlaceholders")}</p>
            )}

            {varsDrawer.pointKeys.length > 0 && (
              <>
                <h4 className="mb-2 mt-4 border-t border-panel-border pt-4 text-sm font-semibold text-foreground">
                  {t("common.involvedPoints")}
                </h4>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {matchedPointIds.length > 0 ? (
                    matchedPointIds.map((id) => (
                      <Tag key={id} color="processing">
                        {propertyNameMap[String(id)] ?? id}
                      </Tag>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">{t("common.none")}</span>
                  )}
                </div>

                <h4 className="mb-2 text-sm font-semibold text-foreground">{t("common.uninvolvedPoints")}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {unmatchedPointIds.length > 0 ? (
                    unmatchedPointIds.map((id) => (
                      <Tag key={id} color="warning">
                        {id}
                      </Tag>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">{t("common.none")}</span>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
