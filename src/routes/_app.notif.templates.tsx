import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteNotifyTemplate,
  getNotifySupport,
  pageNotifyConfigs,
  pageNotifyTemplates,
  saveNotifyTemplate,
  searchNotifyTemplateOne,
  sendNotifyTemplateTest,
} from "@/api";
import { pageUsers } from "@/api/sys";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { VtDrawer, VtField, vtInputCls, VtBtn } from "@/components/vt-drawer";
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
} from "@/lib/notify-mappers";
import { termEq, termLike } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import type { NotifySupportItem, PageQuery, SysUserPageDto } from "@/types";

export const Route = createFileRoute("/_app/notif/templates")({
  component: NotifyTemplatesPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.create_time", order: "desc" }];

type ConfigOption = { id: string; name: string; code: NotifyChannelCode };

function NotifyTemplatesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TemplateListRow[]>([]);
  const [configs, setConfigs] = useState<ConfigOption[]>([]);
  const [support, setSupport] = useState<NotifySupportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [filterDraft, setFilterDraft] = useState({ name: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "" });

  const [pickingConfig, setPickingConfig] = useState(false);
  const [editing, setEditing] = useState<TemplateEditorForm | null>(null);
  const [adding, setAdding] = useState<TemplateEditorForm | null>(null);
  const [delTarget, setDelTarget] = useState<TemplateListRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const configById = useMemo(
    () => Object.fromEntries(configs.map((c) => [c.id, c])) as Record<string, ConfigOption>,
    [configs],
  );

  const fetchConfigs = useCallback(async () => {
    try {
      const result = await pageNotifyConfigs({ current: 1, size: -1, terms: [], sorts: DEFAULT_SORTS });
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
      toast.error(err instanceof Error ? err.message : t("notif.templates.loadConfigsFailed"));
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
      toast.error(err instanceof Error ? err.message : t("notif.templates.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, page, t]);

  useEffect(() => {
    void getNotifySupport()
      .then(setSupport)
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
    void fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const openEdit = async (row: TemplateListRow) => {
    setLoadingDetail(true);
    try {
      const detail = await searchNotifyTemplateOne({ terms: [termEq("t.id", row.id)] });
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
      toast.success(t("common.saveSuccess"));
      setEditing(null);
      setAdding(null);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("notif.templates.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteNotifyTemplate(delTarget.id);
      toast.success(t("common.deleteSuccess"));
      setDelTarget(null);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("notif.templates.deleteFailed"));
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
                {codeLabel(r.configCode, support)}
              </span>
            ),
          },
          { key: "creator", title: t("notif.templates.creator") },
          { key: "org", title: t("notif.templates.org") },
          {
            key: "createTime",
            title: t("notif.templates.createTime"),
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.createTime}</span>,
          },
          {
            key: "updateTime",
            title: t("notif.templates.updateTime"),
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span>,
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
        onAdd={() => setPickingConfig(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => void openEdit(r)}>{t("common.edit")}</RowBtn>
            <RowBtn danger onClick={() => setDelTarget(r)}>{t("common.delete")}</RowBtn>
          </>
        )}
      />

      {pickingConfig && (
        <AddTemplateDialog
          configs={configs}
          onCancel={() => setPickingConfig(false)}
          onNext={(name, configId) => {
            const cfg = configById[configId];
            setPickingConfig(false);
            setAdding(blankTemplateForm(name, configId, cfg?.code ?? "email"));
          }}
        />
      )}

      {(editing || adding) && (
        <TemplateDrawer
          mode={adding ? "add" : "edit"}
          value={editing ?? adding!}
          configs={configs}
          support={support}
          saving={saving}
          onClose={() => {
            setEditing(null);
            setAdding(null);
          }}
          onSave={handleSave}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          open
          title={t("common.confirmDelete")}
          description={t("common.confirmDeleteDesc", {
            target: t("notif.templates.deleteTarget"),
            name: delTarget.name,
          })}
          danger
          onClose={() => setDelTarget(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </>
  );
}

function AddTemplateDialog({
  configs,
  onCancel,
  onNext,
}: {
  configs: ConfigOption[];
  onCancel: () => void;
  onNext: (name: string, configId: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [configId, setConfigId] = useState("");
  const valid = name.trim() && configId;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[460px] overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">
            {t("notif.templates.addTitle")}
          </h3>
        </header>
        <div className="space-y-4 px-5 py-5">
          <VtField label={t("notif.templates.notifyName")} required>
            <input
              className={vtInputCls}
              placeholder={t("notif.templates.notifyNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </VtField>
          <VtField label={t("notif.templates.notifyConfig")} required>
            <select className={vtInputCls} value={configId} onChange={(e) => setConfigId(e.target.value)}>
              <option value="">{t("common.select")}</option>
              {configs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </VtField>
        </div>
        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn variant="ghost" onClick={onCancel}>{t("common.cancel")}</VtBtn>
          <VtBtn disabled={!valid} onClick={() => valid && onNext(name.trim(), configId)}>
            {t("common.next")}
          </VtBtn>
        </footer>
      </div>
    </div>
  );
}

function TemplateDrawer({
  mode,
  value,
  configs,
  support,
  saving,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  value: TemplateEditorForm;
  configs: ConfigOption[];
  support: NotifySupportItem[];
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
      <VtDrawer
        open
        onClose={onClose}
        title={t("notif.templates.detailTitle")}
        width={640}
        footer={
          <>
            <VtBtn variant="ghost" onClick={onClose}>{t("common.cancel")}</VtBtn>
            <VtBtn variant="ghost" onClick={() => setTestOpen(true)}>{t("common.test")}</VtBtn>
            <VtBtn disabled={saving} onClick={() => onSave(d)}>
              {saving ? t("common.saving") : t("notif.templates.saveTemplate")}
            </VtBtn>
          </>
        }
      >
        <section className="mb-6">
          <h4 className="mb-4 border-b border-panel-border pb-2 text-sm font-semibold text-foreground">
            {t("notif.templates.basicInfo")}
          </h4>
          <VtField label={t("notif.templates.templateName")} required>
            <input className={vtInputCls} value={d.name} onChange={(e) => set("name", e.target.value)} />
          </VtField>
          <VtField label={t("notif.templates.notifyConfig")} required>
            <div className="flex items-center gap-2">
              {cfg && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">
                  {codeLabel(cfg.code, support)}
                </span>
              )}
              <select
                className={vtInputCls}
                disabled={mode === "edit"}
                value={d.configId}
                onChange={(e) => handleConfigChange(e.target.value)}
              >
                {configs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </VtField>
          <VtField label={t("notif.templates.contentTitle")} required>
            <input className={vtInputCls} value={d.contentTitle} onChange={(e) => set("contentTitle", e.target.value)} />
          </VtField>
          <VtField label={t("notif.templates.contentBody")} required full>
            <textarea
              className={`${vtInputCls} h-28 py-2`}
              value={d.contentBody}
              onChange={(e) => set("contentBody", e.target.value)}
              placeholder={t("notif.templates.contentBodyPlaceholder")}
            />
            <p className="mt-1 text-[11px] text-text-muted">{t("notif.templates.contentBodyHint")}</p>
          </VtField>
        </section>

        <section className="mb-6">
          <h4 className="mb-4 border-b border-panel-border pb-2 text-sm font-semibold text-foreground">
            {t("notif.templates.varDefaults")}
          </h4>
          {tokens.vars.length === 0 ? (
            <p className="text-xs text-text-muted">{t("notif.templates.noVarTokens")}</p>
          ) : (
            tokens.vars.map((v) => (
              <VtField key={v} label={v}>
                <input
                  className={vtInputCls}
                  value={d.variables[v] ?? ""}
                  onChange={(e) => upsertVar(v, e.target.value)}
                  placeholder="none"
                />
              </VtField>
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
              <VtField key={p} label={p}>
                <input
                  className={vtInputCls}
                  value={d.points[p] ?? ""}
                  onChange={(e) => upsertPt(p, e.target.value)}
                  placeholder="none"
                />
              </VtField>
            ))
          )}
        </section>
      </VtDrawer>

      {testOpen && (
        <TestSendDialog
          form={d}
          onCancel={() => setTestOpen(false)}
          onSent={() => setTestOpen(false)}
        />
      )}
    </>
  );
}

function TestSendDialog({
  form,
  onCancel,
  onSent,
}: {
  form: TemplateEditorForm;
  onCancel: () => void;
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
        toast.error(err instanceof Error ? err.message : t("notif.templates.loadUsersFailed"));
      })
      .finally(() => setLoadingUsers(false));
  }, [t]);

  const handleSend = async () => {
    if (!receiver) return;
    setSending(true);
    try {
      await sendNotifyTemplateTest(buildTemplateTestPayload(form, receiver));
      toast.success(t("notif.templates.testSent"));
      onSent();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("notif.templates.testFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[460px] overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">
            {t("notif.templates.testTitle")}
          </h3>
        </header>
        <div className="px-5 py-5">
          <VtField label={t("notif.templates.recipient")} required>
            <select
              className={vtInputCls}
              value={receiver}
              disabled={loadingUsers}
              onChange={(e) => setReceiver(e.target.value)}
            >
              <option value="">{t("notif.templates.recipientPlaceholder")}</option>
              {users.map((u) => (
                <option key={String(u.sysUserPo.id)} value={String(u.sysUserPo.id)}>
                  {u.sysUserPo.username}
                </option>
              ))}
            </select>
          </VtField>
        </div>
        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn variant="ghost" onClick={onCancel}>{t("common.cancel")}</VtBtn>
          <VtBtn disabled={!receiver || sending} onClick={() => void handleSend()}>
            {sending ? t("common.saving") : t("notif.templates.sendTest")}
          </VtBtn>
        </footer>
      </div>
    </div>
  );
}
