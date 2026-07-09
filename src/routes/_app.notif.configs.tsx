import { createFileRoute } from "@tanstack/react-router";
import { Drawer, Form, Input, InputNumber } from "antd";
import { useCallback, useEffect, useState } from "react";
import { DrawerSegmentTabs } from "@/components/drawer-segment-tabs";
import { drawerFooter, drawerFormItemProps, drawerScrollBodyStyles, drawerScrollSectionClass, drawerStickySectionClass } from "@/components/drawer-form";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { requiredInputRule } from "@/lib/form-validation";
import { showError, showSuccess } from "@/lib/api-message";
import { deleteNotifyConfig, pageNotifyConfigs, saveNotifyConfig } from "@/api";
import { ListPageTemplate, RowBtn, DateTimeText } from "@/components/list-page-template";
import {
  blankConfigForm,
  codeLabel,
  mapConfigDtoToRow,
  mapConfigFormToPo,
  mapConfigPoToForm,
  NOTIFY_CONFIG_CHANNELS,
  type ConfigListRow,
  type EmailConfigForm,
} from "@/features/notif/lib/notify-mappers";
import { termLike } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { useTranslation } from "@/i18n";
import type { PageQuery } from "@/types";

export const Route = createFileRoute("/_app/notif/configs")({
  component: NotifyConfigsPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.create_time", order: "desc" }];

function NotifyConfigsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ConfigListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [filterDraft, setFilterDraft] = useState({ name: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "" });

  const [editing, setEditing] = useState<EmailConfigForm | null>(null);
  const [addingOpen, setAddingOpen] = useState(false);
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
      showError(err instanceof Error ? err.message : t("notif.configs.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, page, t]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const handleSave = async (form: EmailConfigForm) => {
    setSaving(true);
    try {
      await saveNotifyConfig(mapConfigFormToPo(form));
      showSuccess(t("common.saveSuccess"));
      setEditing(null);
      setAddingOpen(false);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("notif.configs.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ConfigListRow) => {
    try {
      await deleteNotifyConfig(row.id);
      showSuccess(t("common.deleteSuccess"));
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("notif.configs.deleteFailed"));
    }
  };

  const typeOptions = NOTIFY_CONFIG_CHANNELS.map((channel) => ({
    value: channel.code,
    label: channel.name,
  }));

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
                {codeLabel(r.code)}
              </span>
            ),
          },
          { key: "creator", title: t("notif.configs.creator") },
          { key: "org", title: t("notif.configs.org") },
          {
            key: "createTime",
            title: t("notif.configs.createTime"),
            render: (r) => <DateTimeText value={r.createTime} />,
          },
          {
            key: "updateTime",
            title: t("notif.configs.updateTime"),
            render: (r) => <DateTimeText value={r.updateTime} />,
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
        onAdd={() => setAddingOpen(true)}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing(mapConfigPoToForm(r.raw.configPo))}>
              {t("common.edit")}
            </RowBtn>
            <RowBtn
              danger
              confirm={{
                description: t("common.confirmDeleteDesc", {
                  target: t("notif.configs.deleteTarget"),
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

      {(editing || addingOpen) && (
        <ConfigDrawer
          mode={addingOpen ? "add" : "edit"}
          value={editing ?? blankConfigForm("aws-email")}
          options={typeOptions}
          saving={saving}
          onClose={() => {
            setEditing(null);
            setAddingOpen(false);
          }}
          onSave={handleSave}
          t={t}
        />
      )}

    </>
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
  const [formApi] = Form.useForm<EmailConfigForm>();
  const [d, setD] = useState<EmailConfigForm>(value);
  const ph = useFormPlaceholder();
  const set = <K extends keyof EmailConfigForm>(k: K, v: EmailConfigForm[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  const isAws = d.code === "aws-email";
  const typeTitle = options.find((o) => o.value === d.code)?.label ?? d.code;
  useEffect(() => {
    setD(value);
    formApi.setFieldsValue(value);
  }, [formApi, value]);

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("notif.configs.configTitle", { type: typeTitle })}
      size={520}
      destroyOnHidden
      styles={drawerScrollBodyStyles}
      footer={drawerFooter([
        { key: "cancel", label: t("common.cancel"), onClick: onClose },
        {
          key: "save",
          label: saving ? t("common.saving") : t("common.save"),
          type: "primary",
          disabled: saving,
          onClick: async () => {
            try {
              await formApi.validateFields();
            } catch {
              return;
            }
            onSave(d);
          },
        },
      ])}
    >
      <div className={drawerStickySectionClass}>
        <DrawerSegmentTabs
          options={options}
          value={d.code}
          disabled={mode === "edit"}
          allTextWhite
          onChange={(code) => set("code", code)}
        />
      </div>

      <div className={drawerScrollSectionClass}>
      <Form form={formApi} layout="horizontal">

        <Form.Item
          name="name"
          label={t("notif.configs.name")}
          required
          {...drawerFormItemProps}
          rules={[requiredInputRule(t, t("notif.configs.name"))]}
        >
          <Input
            placeholder={ph.input(t("notif.configs.name"))}
            value={d.name}
            onChange={(e) => {
              set("name", e.target.value);
              formApi.setFieldValue("name", e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item
          name="smtpHost"
          label={t("notif.configs.smtpHost")}
          required
          {...drawerFormItemProps}
          rules={[requiredInputRule(t, t("notif.configs.smtpHost"))]}
        >
          <Input
            placeholder={ph.input(t("notif.configs.smtpHost"))}
            value={d.smtpHost}
            onChange={(e) => {
              set("smtpHost", e.target.value);
              formApi.setFieldValue("smtpHost", e.target.value);
            }}
          />
        </Form.Item>

        {!isAws && (
          <Form.Item
            name="smtpPort"
            label={t("notif.configs.smtpPort")}
            required
            {...drawerFormItemProps}
            rules={[requiredInputRule(t, t("notif.configs.smtpPort"))]}
          >
            <InputNumber
              className="w-full"
              placeholder={ph.input(t("notif.configs.smtpPort"))}
              value={d.smtpPort}
              onChange={(v) => {
                const next = Number(v) || 0;
                set("smtpPort", next);
                formApi.setFieldValue("smtpPort", next);
              }}
            />
          </Form.Item>
        )}

        {isAws && (
          <Form.Item
            name="smtpUser"
            label={t("notif.configs.smtpUser")}
            required
            {...drawerFormItemProps}
            rules={[requiredInputRule(t, t("notif.configs.smtpUser"))]}
          >
            <Input
              placeholder={ph.input(t("notif.configs.smtpUser"))}
              value={d.smtpUser}
              onChange={(e) => {
                set("smtpUser", e.target.value);
                formApi.setFieldValue("smtpUser", e.target.value);
              }}
            />
          </Form.Item>
        )}

        <Form.Item
          name="smtpSecret"
          label={t("notif.configs.smtpSecret")}
          required
          {...drawerFormItemProps}
          rules={[requiredInputRule(t, t("notif.configs.smtpSecret"))]}
        >
          <Input.Password
            placeholder={ph.input(t("notif.configs.smtpSecret"))}
            value={d.smtpSecret}
            onChange={(e) => {
              set("smtpSecret", e.target.value);
              formApi.setFieldValue("smtpSecret", e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item
          name="sendEmail"
          label={t("notif.configs.sendEmail")}
          required
          {...drawerFormItemProps}
          rules={[requiredInputRule(t, t("notif.configs.sendEmail"))]}
        >
          <Input
            placeholder={ph.input(t("notif.configs.sendEmail"))}
            value={d.sendEmail}
            onChange={(e) => {
              set("sendEmail", e.target.value);
              formApi.setFieldValue("sendEmail", e.target.value);
            }}
          />
        </Form.Item>
      </Form>
      </div>
    </Drawer>
  );
}
