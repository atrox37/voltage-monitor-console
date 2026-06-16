import { createFileRoute } from "@tanstack/react-router";
import { Drawer, Form, Input, Select } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { drawerFooter, drawerFormItemProps } from "@/components/drawer-form";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { showError, showSuccess } from "@/lib/api-message";
import {
  deleteNotifyTemplate,
  pageNotifyConfigs,
  pageNotifyTemplates,
  saveNotifyTemplate,
  searchNotifyTemplateOne,
  sendNotifyTemplateTest,
} from "@/api";
import { pageUsers } from "@/api/sys";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import {
  blankTemplateForm,
  buildTemplateTestPayload,
  codeLabel,
  mapTemplateDtoToEditorForm,
  mapTemplateDtoToRow,
  mapTemplateEditorFormToPo,
  type NotifyChannelCode,
  type TemplateEditorForm,
  type TemplateListRow,
} from "@/features/notif/lib/notify-mappers";
import { termEqId, termLike } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { useTranslation } from "@/i18n";
import type { PageQuery, SysUserPageDto } from "@/types";

export const Route = createFileRoute("/_app/notif/templates")({
  component: NotifyTemplatesPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.create_time", order: "desc" }];

type ConfigOption = { id: string; name: string; code: NotifyChannelCode };

function NotifyTemplatesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TemplateListRow[]>([]);
  const [configs, setConfigs] = useState<ConfigOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [filterDraft, setFilterDraft] = useState({ name: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "" });

  const [addingOpen, setAddingOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateEditorForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const configById = useMemo(
    () => Object.fromEntries(configs.map((c) => [c.id, c])) as Record<string, ConfigOption>,
    [configs],
  );

  const fetchConfigs = useCallback(async () => {
    try {
      const result = await pageNotifyConfigs({
        current: 1,
        size: -1,
        terms: [],
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setConfigs(
        list.map((dto) => ({
          id: String(dto.configPo.id ?? ""),
          name: dto.configPo.name ?? "",
          code: String(dto.configPo.code ?? ""),
        })),
      );
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("notif.templates.loadConfigsFailed"));
    }
  }, [t]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const terms = [];
      const name = filterApplied.name.trim();
      if (name) terms.push(termLike("t.name", name));

      const result = await pageNotifyTemplates({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapTemplateDtoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      showError(err instanceof Error ? err.message : t("notif.templates.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, page, t]);

  useEffect(() => {
    void fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const openEdit = async (row: TemplateListRow) => {
    setLoadingDetail(true);
    try {
      const detail = await searchNotifyTemplateOne({ terms: [termEqId("t.id", row.id)] });
      if (detail) setEditing(mapTemplateDtoToEditorForm(detail));
      else setEditing(mapTemplateDtoToEditorForm(row.raw));
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setEditing(mapTemplateDtoToEditorForm(row.raw));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSave = async (form: TemplateEditorForm) => {
    setSaving(true);
    try {
      await saveNotifyTemplate(mapTemplateEditorFormToPo(form));
      showSuccess(t("common.saveSuccess"));
      setEditing(null);
      setAddingOpen(false);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("notif.templates.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: TemplateListRow) => {
    try {
      await deleteNotifyTemplate(row.id);
      showSuccess(t("common.deleteSuccess"));
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("notif.templates.deleteFailed"));
    }
  };

  return (
    <>
      <ListPageTemplate<TemplateListRow>
        title={t("notif.templates.title")}
        filters={[{ type: "text", key: "name", label: t("notif.templates.name") }]}
        columns={[
          { key: "name", title: t("notif.templates.templateName") },
          {
            key: "config",
            title: t("notif.templates.notifyConfig"),
            render: (r) => r.configName,
          },
          {
            key: "type",
            title: t("notif.templates.templateType"),
            render: (r) => (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">
                {codeLabel(r.configCode)}
              </span>
            ),
          },
          { key: "creator", title: t("notif.templates.creator") },
          { key: "org", title: t("notif.templates.org") },
          {
            key: "createTime",
            title: t("notif.templates.createTime"),
            render: (r) => (
              <span className="font-mono text-xs text-text-secondary">{r.createTime}</span>
            ),
          },
          {
            key: "updateTime",
            title: t("notif.templates.updateTime"),
            render: (r) => (
              <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span>
            ),
          },
        ]}
        rows={rows}
        loading={loading || loadingDetail}
        serverSide
        page={page}
        totalCount={total}
        onPageChange={setPage}
        filterValues={filterDraft}
        onFilterValuesChange={(draft) => setFilterDraft({ name: draft.name ?? "" })}
        onSearch={() => {
          setPage(1);
          setFilterApplied({ ...filterDraft });
        }}
        onReset={() => {
          setFilterDraft({ name: "" });
          setFilterApplied({ name: "" });
          setPage(1);
        }}
        onAdd={() => setAddingOpen(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => void openEdit(r)}>{t("common.edit")}</RowBtn>
            <RowBtn
              danger
              confirm={{
                description: t("common.confirmDeleteDesc", {
                  target: t("notif.templates.deleteTarget"),
                  name: r.name,
                }),
              }}
              onClick={() => void handleDelete(r)}
            >
              {t("common.delete")}
            </RowBtn>
          </>
        )}
      />

      {addingOpen && (
        <AddTemplateDrawer
          configs={configs}
          saving={saving}
          onCancel={() => setAddingOpen(false)}
          onSave={(name, configId) => {
            const cfg = configById[configId];
            void handleSave(blankTemplateForm(name, configId, cfg?.code ?? "aws-email"));
          }}
        />
      )}

      {editing && (
        <TemplateDrawer
          mode="edit"
          value={editing}
          configs={configs}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

    </>
  );
}

function AddTemplateDrawer({
  configs,
  saving,
  onCancel,
  onSave,
}: {
  configs: ConfigOption[];
  saving: boolean;
  onCancel: () => void;
  onSave: (name: string, configId: string) => void;
}) {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const [name, setName] = useState("");
  const [configId, setConfigId] = useState("");
  const valid = name.trim() && configId;

  return (
    <Drawer
      open
      onClose={onCancel}
      title={t("notif.templates.addTitle")}
      size={480}
      destroyOnHidden
      styles={{ body: { paddingTop: 8 } }}
      footer={drawerFooter([
        { key: "cancel", label: t("common.cancel"), onClick: onCancel },
        {
          key: "save",
          label: saving ? t("common.saving") : t("common.save"),
          type: "primary",
          disabled: !valid || saving,
          onClick: () => valid && onSave(name.trim(), configId),
        },
      ])}
    >
      <Form.Item label={t("notif.templates.notifyName")} required {...drawerFormItemProps}>
        <Input
          placeholder={ph.input(t("notif.templates.notifyName"))}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Form.Item>
      <Form.Item label={t("notif.templates.notifyConfig")} required {...drawerFormItemProps}>
        <Select
          value={configId || undefined}
          placeholder={ph.select(t("notif.templates.notifyConfig"))}
          onChange={setConfigId}
          options={configs.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Form.Item>
    </Drawer>
  );
}

function TemplateDrawer({
  mode,
  value,
  configs,
  saving,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  value: TemplateEditorForm;
  configs: ConfigOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (t: TemplateEditorForm) => void;
}) {
  const { t } = useTranslation();
  const [d, setD] = useState<TemplateEditorForm>(value);
  const [testOpen, setTestOpen] = useState(false);
  const cfg = configs.find((c) => c.id === d.configId);
  const set = <K extends keyof TemplateEditorForm>(k: K, v: TemplateEditorForm[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  const tokens = useMemo(() => {
    const vars = new Set<string>();
    const pts = new Set<string>();
    const re = /\{([#$])([A-Za-z0-9_]+)\}/g;
    for (const text of [d.contentTitle, d.contentBody]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        (m[1] === "$" ? vars : pts).add(m[2]);
      }
    }
    return { vars: [...vars], pts: [...pts] };
  }, [d.contentTitle, d.contentBody]);

  const upsertVar = (k: string, v: string) =>
    setD((x) => ({ ...x, variables: { ...x.variables, [k]: v } }));
  const upsertPt = (k: string, v: string) =>
    setD((x) => ({ ...x, points: { ...x.points, [k]: v } }));

  const handleConfigChange = (configId: string) => {
    const next = configs.find((c) => c.id === configId);
    setD((x) => ({
      ...x,
      configId,
      configCode: next?.code ?? x.configCode,
    }));
  };

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={t("notif.templates.detailTitle")}
        size={testOpen ? 700 : 640}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={drawerFooter([
          { key: "cancel", label: t("common.cancel"), onClick: onClose },
          { key: "test", label: t("common.test"), onClick: () => setTestOpen(true) },
          {
            key: "save",
            label: saving ? t("common.saving") : t("notif.templates.saveTemplate"),
            type: "primary",
            disabled: saving,
            onClick: () => onSave(d),
          },
        ])}
      >
        <section className="mb-6">
          <h4 className="mb-4 border-b border-panel-border pb-2 text-sm font-semibold text-foreground">
            {t("notif.templates.basicInfo")}
          </h4>
          <Form.Item label={t("notif.templates.templateName")} required {...drawerFormItemProps}>
            <Input value={d.name} onChange={(e) => set("name", e.target.value)} />
          </Form.Item>
          <Form.Item label={t("notif.templates.notifyConfig")} required {...drawerFormItemProps}>
            <div className="flex items-center gap-2">
              {cfg && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">
                  {codeLabel(cfg.code)}
                </span>
              )}
              <Select
                className="flex-1"
                disabled={mode === "edit"}
                value={d.configId}
                onChange={handleConfigChange}
                options={configs.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          </Form.Item>
          <Form.Item label={t("notif.templates.contentTitle")} required {...drawerFormItemProps}>
            <Input value={d.contentTitle} onChange={(e) => set("contentTitle", e.target.value)} />
          </Form.Item>
          <Form.Item label={t("notif.templates.contentBody")} required {...drawerFormItemProps}>
            <Input.TextArea
              rows={5}
              value={d.contentBody}
              onChange={(e) => set("contentBody", e.target.value)}
              placeholder={t("notif.templates.contentBodyPlaceholder")}
            />
            <p className="mt-1 text-[11px] text-text-muted">
              {t("notif.templates.contentBodyHint")}
            </p>
          </Form.Item>
        </section>

        <section className="mb-6">
          <h4 className="mb-4 border-b border-panel-border pb-2 text-sm font-semibold text-foreground">
            {t("notif.templates.varDefaults")}
          </h4>
          {tokens.vars.length === 0 ? (
            <p className="text-xs text-text-muted">{t("notif.templates.noVarTokens")}</p>
          ) : (
            tokens.vars.map((v) => (
              <Form.Item key={v} label={v} {...drawerFormItemProps}>
                <Input
                  value={d.variables[v] ?? ""}
                  onChange={(e) => upsertVar(v, e.target.value)}
                  placeholder="none"
                />
              </Form.Item>
            ))
          )}
        </section>

        <section>
          <h4 className="mb-4 border-b border-panel-border pb-2 text-sm font-semibold text-foreground">
            {t("notif.templates.pointDefaults")}
          </h4>
          {tokens.pts.length === 0 ? (
            <p className="text-xs text-text-muted">{t("notif.templates.noPointTokens")}</p>
          ) : (
            tokens.pts.map((p) => (
              <Form.Item key={p} label={p} {...drawerFormItemProps}>
                <Input
                  value={d.points[p] ?? ""}
                  onChange={(e) => upsertPt(p, e.target.value)}
                  placeholder="none"
                />
              </Form.Item>
            ))
          )}
        </section>
      </Drawer>

      {testOpen && (
        <TestSendDrawer
          form={d}
          onClose={() => setTestOpen(false)}
          onSent={() => setTestOpen(false)}
        />
      )}
    </>
  );
}

function TestSendDrawer({
  form,
  onClose,
  onSent,
}: {
  form: TemplateEditorForm;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<SysUserPageDto[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [receiver, setReceiver] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void pageUsers({ current: 1, size: -1, terms: [] })
      .then((res) => setUsers(res.records ?? res.data ?? []))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
        showError(err instanceof Error ? err.message : t("notif.templates.loadUsersFailed"));
      })
      .finally(() => setLoadingUsers(false));
  }, [t]);

  const handleSend = async () => {
    if (!receiver) return;
    setSending(true);
    try {
      await sendNotifyTemplateTest(buildTemplateTestPayload(form, receiver));
      showSuccess(t("notif.templates.testSent"));
      onSent();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("notif.templates.testFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("notif.templates.testTitle")}
      size={480}
      zIndex={1100}
      mask={false}
      destroyOnHidden
      styles={{ body: { paddingTop: 8 } }}
      footer={drawerFooter([
        { key: "cancel", label: t("common.cancel"), onClick: onClose },
        {
          key: "send",
          label: sending ? t("common.saving") : t("notif.templates.sendTest"),
          type: "primary",
          disabled: !receiver || sending,
          onClick: () => void handleSend(),
        },
      ])}
    >
      <Form.Item label={t("notif.templates.recipient")} required {...drawerFormItemProps}>
        <Select
          value={receiver || undefined}
          disabled={loadingUsers}
          placeholder={t("notif.templates.recipientPlaceholder")}
          onChange={setReceiver}
          options={users.map((u) => ({
            value: String(u.sysUserPo.id),
            label: u.sysUserPo.username,
          }))}
        />
      </Form.Item>
    </Drawer>
  );
}
