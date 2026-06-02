import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteNotifyConfig,
  getNotifySupport,
  pageNotifyConfigs,
  saveNotifyConfig,
} from "@/api";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { VtDrawer, VtField, vtInputCls, VtBtn } from "@/components/vt-drawer";
import {
  blankConfigForm,
  codeLabel,
  mapConfigDtoToRow,
  mapConfigFormToPo,
  mapConfigPoToForm,
  type ConfigListRow,
  type EmailConfigForm,
  type NotifyChannelCode,
} from "@/lib/notify-mappers";
import { termLike } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import type { NotifySupportItem, PageQuery } from "@/types";

export const Route = createFileRoute("/_app/notif/configs")({
  component: NotifyConfigsPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.create_time", order: "desc" }];

function NotifyConfigsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ConfigListRow[]>([]);
  const [support, setSupport] = useState<NotifySupportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [filterDraft, setFilterDraft] = useState({ name: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "" });

  const [pickingType, setPickingType] = useState(false);
  const [editing, setEditing] = useState<EmailConfigForm | null>(null);
  const [addingCode, setAddingCode] = useState<NotifyChannelCode | null>(null);
  const [delTarget, setDelTarget] = useState<ConfigListRow | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const terms = [];
      const name = filterApplied.name.trim();
      if (name) terms.push(termLike("t.name", name));

      const result = await pageNotifyConfigs({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapConfigDtoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      toast.error(err instanceof Error ? err.message : t("notif.configs.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, page, t]);

  useEffect(() => {
    void getNotifySupport()
      .then(setSupport)
      .catch((err) => {
        if (isRequestCanceled(err)) return;
        toast.error(err instanceof Error ? err.message : t("notif.configs.loadSupportFailed"));
      });
  }, [t]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const handleSave = async (form: EmailConfigForm) => {
    setSaving(true);
    try {
      await saveNotifyConfig(mapConfigFormToPo(form));
      toast.success(t("common.saveSuccess"));
      setEditing(null);
      setAddingCode(null);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("notif.configs.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteNotifyConfig(delTarget.id);
      toast.success(t("common.deleteSuccess"));
      setDelTarget(null);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("notif.configs.deleteFailed"));
    }
  };

  const typeOptions = support.length
    ? support.map((s) => ({
        value: String(s.type ?? s.code ?? ""),
        label: codeLabel(String(s.type ?? s.code ?? ""), support),
      }))
    : [
        { value: "email", label: "邮箱" },
        { value: "aws-email", label: "AWS 邮箱" },
      ];

  return (
    <>
      <ListPageTemplate<ConfigListRow>
        title={t("notif.configs.title")}
        filters={[{ type: "text", key: "name", label: t("notif.configs.name") }]}
        columns={[
          { key: "name", title: t("notif.configs.name") },
          {
            key: "code",
            title: t("notif.configs.type"),
            render: (r) => (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">
                {codeLabel(r.code, support)}
              </span>
            ),
          },
          { key: "creator", title: t("notif.configs.creator") },
          { key: "org", title: t("notif.configs.org") },
          {
            key: "createTime",
            title: t("notif.configs.createTime"),
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.createTime}</span>,
          },
          {
            key: "updateTime",
            title: t("notif.configs.updateTime"),
            render: (r) => <span className="font-mono text-xs text-text-secondary">{r.updateTime}</span>,
          },
        ]}
        rows={rows}
        loading={loading}
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
        onAdd={() => setPickingType(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing(mapConfigPoToForm(r.raw.configPo))}>{t("common.edit")}</RowBtn>
            <RowBtn danger onClick={() => setDelTarget(r)}>{t("common.delete")}</RowBtn>
          </>
        )}
      />

      {pickingType && (
        <TypePickerDialog
          options={typeOptions}
          hint={t("notif.configs.pickTypeHint")}
          title={t("notif.configs.pickTypeTitle")}
          typeLabel={t("notif.configs.typeLabel")}
          onPick={(code) => {
            setPickingType(false);
            setAddingCode(code);
          }}
          onClose={() => setPickingType(false)}
        />
      )}

      {(editing || addingCode) && (
        <ConfigDrawer
          mode={addingCode ? "add" : "edit"}
          value={editing ?? blankConfigForm(addingCode!)}
          options={typeOptions}
          saving={saving}
          onClose={() => {
            setEditing(null);
            setAddingCode(null);
          }}
          onSave={handleSave}
          t={t}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          open
          title={t("common.confirmDelete")}
          description={t("common.confirmDeleteDesc", {
            target: t("notif.configs.deleteTarget"),
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

function TypePickerDialog({
  options,
  title,
  typeLabel,
  hint,
  onPick,
  onClose,
}: {
  options: { value: string; label: string }[];
  title: string;
  typeLabel: string;
  hint: string;
  onPick: (code: NotifyChannelCode) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<NotifyChannelCode>(options[0]?.value ?? "email");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[420px] overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">{title}</h3>
        </header>
        <div className="space-y-3 px-5 py-5">
          <label className="block text-xs text-text-secondary">{typeLabel}</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-9 w-full rounded-md border border-panel-border bg-background/40 px-3 text-sm text-foreground outline-none focus:border-primary/60"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-text-muted">{hint}</p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn variant="ghost" onClick={onClose}>{t("common.cancel")}</VtBtn>
          <VtBtn onClick={() => onPick(selected)}>{t("common.next")}</VtBtn>
        </footer>
      </div>
    </div>
  );
}

function ConfigDrawer({
  mode,
  value,
  options,
  saving,
  onClose,
  onSave,
  t,
}: {
  mode: "add" | "edit";
  value: EmailConfigForm;
  options: { value: string; label: string }[];
  saving: boolean;
  onClose: () => void;
  onSave: (c: EmailConfigForm) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [d, setD] = useState<EmailConfigForm>(value);
  const set = <K extends keyof EmailConfigForm>(k: K, v: EmailConfigForm[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  const isAws = d.code === "aws-email";
  const typeTitle = options.find((o) => o.value === d.code)?.label ?? d.code;

  return (
    <VtDrawer
      open
      onClose={onClose}
      title={t("notif.configs.configTitle", { type: typeTitle })}
      width={520}
      footer={
        <>
          <VtBtn variant="ghost" onClick={onClose}>{t("common.cancel")}</VtBtn>
          <VtBtn disabled={saving} onClick={() => onSave(d)}>
            {saving ? t("common.saving") : t("common.save")}
          </VtBtn>
        </>
      }
    >
      <div className="mb-5">
        <div className="inline-flex overflow-hidden rounded-md border border-panel-border">
          {options.map((opt) => {
            const active = d.code === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={mode === "edit"}
                onClick={() => set("code", opt.value)}
                className={`px-4 py-1.5 text-xs transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-panel text-text-secondary hover:text-foreground"
                } ${mode === "edit" ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <VtField label={t("notif.configs.name")} required>
        <input
          className={vtInputCls}
          placeholder={t("notif.configs.name")}
          value={d.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </VtField>

      <VtField label={t("notif.configs.smtpHost")} required>
        <input
          className={vtInputCls}
          placeholder={t("notif.configs.smtpHostPlaceholder")}
          value={d.smtpHost}
          onChange={(e) => set("smtpHost", e.target.value)}
        />
      </VtField>

      {!isAws && (
        <VtField label={t("notif.configs.smtpPort")} required>
          <input
            type="number"
            className={vtInputCls}
            value={d.smtpPort}
            onChange={(e) => set("smtpPort", Number(e.target.value) || 0)}
          />
        </VtField>
      )}

      {isAws && (
        <VtField label={t("notif.configs.smtpUser")} required>
          <input
            className={vtInputCls}
            placeholder={t("notif.configs.smtpUserPlaceholder")}
            value={d.smtpUser}
            onChange={(e) => set("smtpUser", e.target.value)}
          />
        </VtField>
      )}

      <VtField label={t("notif.configs.smtpSecret")} required>
        <input
          type="password"
          className={vtInputCls}
          placeholder={t("notif.configs.smtpSecretPlaceholder")}
          value={d.smtpSecret}
          onChange={(e) => set("smtpSecret", e.target.value)}
        />
      </VtField>

      <VtField label={t("notif.configs.sendEmail")} required>
        <input
          className={vtInputCls}
          placeholder={t("notif.configs.sendEmailPlaceholder")}
          value={d.sendEmail}
          onChange={(e) => set("sendEmail", e.target.value)}
        />
      </VtField>
    </VtDrawer>
  );
}
