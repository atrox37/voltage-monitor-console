import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CloseOutlined, DeleteOutlined, EditOutlined, LoadingOutlined, MinusOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { Checkbox, Drawer, Form, Input, InputNumber, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { VtButton } from "@/components/vt-button";
import { OptionToggle, enabledDisabledNumberOptions, onOffNumberOptions } from "@/components/option-toggle";
import { DrawerSegmentTabs } from "@/components/drawer-segment-tabs";
import {
  drawerFormItemProps,
  drawerBlockFormItemProps,
  drawerFooter,
  drawerScrollBodyStyles,
  drawerScrollSectionClass,
  drawerStickySectionClass,
  nestedDrawerProps,
} from "@/components/drawer-form";
import { showError, showSuccess } from "@/lib/api-message";
import { deleteNetwork, getDimensionTree, pageNetworks, saveNetwork, uploadNetworkFile } from "@/api";
import { ListPageTemplate, RowBtn, StatusBadge, DateTimeText } from "@/components/list-page-template";
import { NetworkConnectStatusBadge } from "@/components/status-display";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import { vtActionColumn } from "@/lib/table-utils";
import {
  blankNetworkForm,
  mapNetworkFormToPo,
  mapNetworkVoToForm,
  mapNetworkVoToRow,
  type CompType,
  type NetworkCompForm,
  type NetworkListRow,
  type RecruitRow,
} from "@/features/ingest/lib/ingest-mappers";
import { termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { useFormPlaceholder } from "@/lib/form-placeholder";
import { requiredInputError, requiredInputRule, requiredSelectError, requiredSelectRule } from "@/lib/form-validation";
import { useTranslation } from "@/i18n";
import type { PageQuery } from "@/types";

export const Route = createFileRoute("/_app/ingest/components")({
  component: NetworkComponentsPage,
});

const TYPE_OPTIONS: { value: CompType; label: string }[] = [
  { value: "MQTT_CLIENT", label: "MQTT CLIENT" },
];
const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.update_time", order: "desc" }];

function NetworkComponentsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<NetworkListRow[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [filterDraft, setFilterDraft] = useState({ name: "", orgId: "", type: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "", orgId: "", type: "" });

  const [editing, setEditing] = useState<NetworkCompForm | null>(null);
  const [addingOpen, setAddingOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const terms = [];
      const name = filterApplied.name.trim();
      if (name) terms.push(termLike("t.name", name));
      if (filterApplied.orgId) terms.push(termEq("t.org_id", toDbId(filterApplied.orgId)));
      if (filterApplied.type) terms.push(termEq("t.type", filterApplied.type));

      const result = await pageNetworks({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapNetworkVoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      showError(err instanceof Error ? err.message : t("ingest.components.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, filterApplied.orgId, filterApplied.type, page, t]);

  useEffect(() => {
    void getDimensionTree()
      .then((root) => setOrgNodes(dimensionToOrgNodes(root)))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const handleSave = async (form: NetworkCompForm) => {
    setSaving(true);
    try {
      await saveNetwork(mapNetworkFormToPo(form));
      showSuccess(t("common.saveSuccess"));
      setEditing(null);
      setAddingOpen(false);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("common.loadFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: NetworkListRow) => {
    try {
      await deleteNetwork(row.id);
      showSuccess(t("common.deleteSuccess"));
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("common.loadFailed"));
    }
  };

  return (
    <>
      <ListPageTemplate<NetworkListRow>
        title={t("ingest.components.title")}
        loading={loading}
        serverSide
        rows={rows}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onSearch={() => {
          setFilterApplied({ ...filterDraft });
          setPage(1);
        }}
        onReset={() => {
          const empty = { name: "", orgId: "", type: "" };
          setFilterDraft(empty);
          setFilterApplied(empty);
          setPage(1);
        }}
        filterValues={filterDraft}
        onFilterValuesChange={(draft) =>
          setFilterDraft({
            name: draft.name ?? "",
            orgId: draft.orgId ?? "",
            type: draft.type ?? "",
          })
        }
        filters={[
          { type: "text", key: "name", label: t("common.nameLabel") },
          {
            type: "orgTree",
            key: "orgId",
            label: t("common.orgLabel"),
            nodes: orgNodes,
          },
          {
            type: "select",
            key: "type",
            label: t("common.compType"),
            options: TYPE_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })),
          },
        ]}
        columns={[
          { key: "name", title: t("common.nameLabel") },
          { key: "type", title: t("ingest.components.type"), render: (r) => TYPE_OPTIONS.find((o) => o.value === r.type)?.label ?? r.type },
          {
            key: "status",
            title: t("common.status"),
            width: 96,
            render: (r) => <StatusBadge status={r.enabled ? "enabled" : "disabled"} />,
          },
          {
            key: "connectStatus",
            title: t("ingest.components.connectStatus"),
            width: 110,
            render: (r) => <NetworkConnectStatusBadge status={r.connectStatus} />,
          },
          { key: "org", title: t("common.orgBelong") },
          { key: "updateTime", title: t("common.updatedAt"), render: (r) => <DateTimeText value={r.updateTime} /> },
        ]}
        onAdd={() => {
          setAddingOpen(true);
          setEditing(blankNetworkForm("MQTT_CLIENT"));
        }}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => setEditing(mapNetworkVoToForm(r.raw))}>{t("common.edit")}</RowBtn>
            <RowBtn
              danger
              confirm={{
                title: t("common.confirmDelete"),
                description: t("common.confirmDeleteDesc", { target: t("ingest.components.title"), name: r.name }),
                confirmText: t("common.delete"),
              }}
              onClick={() => void handleDelete(r)}
            >
              {t("common.delete")}
            </RowBtn>
          </>
        )}
      />

      {(editing || addingOpen) && editing && (
        <ComponentDrawer
          mode={addingOpen ? "add" : "edit"}
          value={editing}
          saving={saving}
          onClose={() => { setEditing(null); setAddingOpen(false); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}

type ComponentFormValues = {
  name: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  enabled: 0 | 1;
  ssl: 0 | 1;
  topics: string[];
  caCert: string;
  sslCert: string;
  sslKey: string;
};

function ComponentDrawer({
  mode, value, saving, onClose, onSave,
}: {
  mode: "add" | "edit";
  value: NetworkCompForm;
  saving: boolean;
  onClose: () => void;
  onSave: (c: NetworkCompForm) => void;
}) {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const [formApi] = Form.useForm<ComponentFormValues>();
  const [d, setD] = useState<NetworkCompForm>(value);
  const [topicDraft, setTopicDraft] = useState("");
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [recruitDraft, setRecruitDraft] = useState<RecruitRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTag, setUploadTag] = useState<"sslCa" | "sslCert" | "sslKey" | null>(null);
  const [uploading, setUploading] = useState(false);
  /** 编辑已启用组件时，仅允许修改状态，保存后可再次编辑其他字段 */
  const fieldsLocked = mode === "edit" && value.enabled;

  useEffect(() => {
    setD(value);
    formApi.setFieldsValue({
      name: value.name,
      ip: value.ip,
      port: value.port,
      username: value.username,
      password: value.password,
      enabled: value.enabled ? 1 : 0,
      ssl: value.ssl ? 1 : 0,
      topics: value.topics,
      caCert: value.caCert,
      sslCert: value.sslCert,
      sslKey: value.sslKey,
    });
  }, [formApi, value]);

  const set = <K extends keyof NetworkCompForm>(k: K, v: NetworkCompForm[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  const syncTopics = (topics: string[]) => {
    set("topics", topics);
    formApi.setFieldValue("topics", topics);
  };

  const addTopic = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const v = topicDraft.trim();
    if (!v) return;
    syncTopics([...d.topics, v]);
    setTopicDraft("");
    e.preventDefault();
  };

  const pickUpload = (tag: "sslCa" | "sslCert" | "sslKey") => {
    setUploadTag(tag);
    fileRef.current?.click();
  };

  const onFilePicked = async (file: File | undefined) => {
    if (!file || !uploadTag) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucketType", "s3");
      const res = await uploadNetworkFile(fd);
      const key = uploadTag === "sslCa" ? "caCert" : uploadTag === "sslCert" ? "sslCert" : "sslKey";
      set(key, res.url);
      formApi.setFieldValue(key, res.url);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("ingest.protocols.uploadFailed"));
    } finally {
      setUploading(false);
      setUploadTag(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pem,.crt,.key,.cer"
        onChange={(e) => void onFilePicked(e.target.files?.[0])}
      />
      <Drawer
        open
        onClose={onClose}
        title={mode === "add" ? t("common.addTitle") : t("common.editTitle")}
        size={560}
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
          {fieldsLocked && (
            <p className="rounded-md border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
              {t("ingest.components.enabledEditHint")}
            </p>
          )}
          <DrawerSegmentTabs
            options={TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
            value={d.type}
            disabled={mode === "edit"}
            allTextWhite
          />
        </div>

        <div className={drawerScrollSectionClass}>
        <Form form={formApi} layout="horizontal">

        <Form.Item
          name="name"
          label={t("common.nameLabel")}
          required
          {...drawerFormItemProps}
          rules={[requiredInputRule(t, t("common.nameLabel"))]}
        >
          <Input
            disabled={fieldsLocked}
            placeholder={ph.input(t("common.nameLabel"))}
            value={d.name}
            onChange={(e) => {
              set("name", e.target.value);
              formApi.setFieldValue("name", e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item
          name="enabled"
          label={t("common.status")}
          required
          {...drawerFormItemProps}
          rules={[requiredSelectRule(t, t("common.status"))]}
        >
          <OptionToggle
            disabled={mode === "add"}
            value={d.enabled ? 1 : 0}
            onChange={(v) => {
              set("enabled", v === 1);
              formApi.setFieldValue("enabled", v);
            }}
            options={enabledDisabledNumberOptions(t)}
          />
        </Form.Item>

        <Form.Item
          name="ip"
          label={t("ingest.components.ip")}
          required
          {...drawerFormItemProps}
          rules={[requiredInputRule(t, t("ingest.components.ip"))]}
        >
          <Input
            disabled={fieldsLocked}
            placeholder={ph.input(t("ingest.components.ip"))}
            value={d.ip}
            onChange={(e) => {
              set("ip", e.target.value);
              formApi.setFieldValue("ip", e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item
          name="port"
          label={t("ingest.components.port")}
          required
          {...drawerFormItemProps}
          rules={[
            {
              validator: async () => {
                if (!d.port) {
                  return Promise.reject(requiredInputError(t, t("ingest.components.port")));
                }
              },
            },
          ]}
        >
          <div className={`inline-flex w-fit items-center overflow-hidden rounded-md border border-panel-border ${fieldsLocked ? "opacity-60" : ""}`}>
            <button
              type="button"
              disabled={fieldsLocked}
              onClick={() => {
                const port = Math.max(1, d.port - 1);
                set("port", port);
                formApi.setFieldValue("port", port);
              }}
              className="flex h-9 w-9 items-center justify-center bg-panel text-text-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MinusOutlined className="text-sm" />
            </button>
            <InputNumber
              controls={false}
              disabled={fieldsLocked}
              placeholder={ph.input(t("ingest.components.port"))}
              value={d.port}
              onChange={(v) => {
                const port = Number(v) || 0;
                set("port", port);
                formApi.setFieldValue("port", port);
              }}
              className="!h-9 !w-24 !rounded-none border-x border-panel-border text-center"
            />
            <button
              type="button"
              disabled={fieldsLocked}
              onClick={() => {
                const port = d.port + 1;
                set("port", port);
                formApi.setFieldValue("port", port);
              }}
              className="flex h-9 w-9 items-center justify-center bg-panel text-text-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusOutlined className="text-sm" />
            </button>
          </div>
        </Form.Item>

        <Form.Item
          name="username"
          label={t("ingest.components.username")}
          {...drawerFormItemProps}
        >
          <Input
            disabled={fieldsLocked}
            placeholder={ph.input(t("ingest.components.username"))}
            value={d.username}
            onChange={(e) => {
              set("username", e.target.value);
              formApi.setFieldValue("username", e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={t("ingest.components.password")}
          {...drawerFormItemProps}
        >
          <Input.Password
            disabled={fieldsLocked}
            placeholder={ph.input(t("ingest.components.password"))}
            value={d.password}
            onChange={(e) => {
              set("password", e.target.value);
              formApi.setFieldValue("password", e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item
          name="ssl"
          label={t("ingest.components.ssl")}
          required
          {...drawerFormItemProps}
          rules={[requiredSelectRule(t, t("ingest.components.ssl"))]}
        >
          <OptionToggle
            disabled={fieldsLocked}
            value={d.ssl ? 1 : 0}
            onChange={(v) => {
              set("ssl", v === 1);
              formApi.setFieldValue("ssl", v);
            }}
            options={onOffNumberOptions(t)}
          />
        </Form.Item>

        {d.ssl && (
          <>
            <Form.Item
              name="caCert"
              label={t("ingest.components.caCert")}
              required
              {...drawerFormItemProps}
              rules={[
                {
                  validator: async () => {
                    if (d.ssl && !d.caCert?.trim()) {
                      return Promise.reject(requiredSelectError(t, t("ingest.components.caCert")));
                    }
                  },
                },
              ]}
            >
              <UploadInput disabled={fieldsLocked} value={d.caCert} uploading={uploading && uploadTag === "sslCa"} onPick={() => pickUpload("sslCa")} />
            </Form.Item>
            <Form.Item
              name="sslCert"
              label={t("ingest.components.sslCert")}
              required
              {...drawerFormItemProps}
              rules={[
                {
                  validator: async () => {
                    if (d.ssl && !d.sslCert?.trim()) {
                      return Promise.reject(requiredSelectError(t, t("ingest.components.sslCert")));
                    }
                  },
                },
              ]}
            >
              <UploadInput disabled={fieldsLocked} value={d.sslCert} uploading={uploading && uploadTag === "sslCert"} onPick={() => pickUpload("sslCert")} />
            </Form.Item>
            <Form.Item
              name="sslKey"
              label={t("ingest.components.sslKey")}
              required
              {...drawerFormItemProps}
              rules={[
                {
                  validator: async () => {
                    if (d.ssl && !d.sslKey?.trim()) {
                      return Promise.reject(requiredSelectError(t, t("ingest.components.sslKey")));
                    }
                  },
                },
              ]}
            >
              <UploadInput disabled={fieldsLocked} value={d.sslKey} uploading={uploading && uploadTag === "sslKey"} onPick={() => pickUpload("sslKey")} />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="topics"
          label={t("ingest.components.topics")}
          required
          {...drawerBlockFormItemProps}
          rules={[
            {
              validator: async () => {
                if (d.topics.length === 0) {
                  return Promise.reject(requiredInputError(t, t("ingest.components.topics")));
                }
              },
            },
          ]}
        >
          <div className={`w-full rounded-md border border-panel-border bg-background/40 p-2 ${fieldsLocked ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap gap-1.5">
              {d.topics.map((topic, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded bg-panel px-2 py-1 text-[11px] text-foreground">
                  {topic}
                  <button
                    type="button"
                    disabled={fieldsLocked}
                    onClick={() => syncTopics(d.topics.filter((_, idx) => idx !== i))}
                    className="text-text-muted hover:text-status-critical disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CloseOutlined className="text-xs" />
                  </button>
                </span>
              ))}
              <input
                value={topicDraft}
                disabled={fieldsLocked}
                onChange={(e) => setTopicDraft(e.target.value)}
                onKeyDown={addTopic}
                placeholder={t("ingest.components.topicPlaceholder")}
                className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-xs text-foreground placeholder:text-text-muted outline-none disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </Form.Item>

        <Form.Item label={t("ingest.components.recruit")} {...drawerBlockFormItemProps}>
          <RecruitSection
            items={d.recruits}
            disabled={fieldsLocked}
            onAdd={() => {
              setRecruitDraft(null);
              setRecruitOpen(true);
            }}
            onEdit={(row) => {
              setRecruitDraft(row);
              setRecruitOpen(true);
            }}
            onDelete={(id) => set("recruits", d.recruits.filter((x) => x.id !== id))}
          />
        </Form.Item>
        </Form>
        </div>

        <RecruitDialog
          open={recruitOpen}
          initial={recruitDraft}
          onClose={() => {
            setRecruitOpen(false);
            setRecruitDraft(null);
          }}
          onSave={(r) => {
            if (recruitDraft) {
              set(
                "recruits",
                d.recruits.map((x) => (x.id === r.id ? r : x)),
              );
            } else {
              set("recruits", [...d.recruits, r]);
            }
            setRecruitOpen(false);
            setRecruitDraft(null);
          }}
        />
      </Drawer>
    </>
  );
}

function RecruitSection({
  items,
  disabled,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: RecruitRow[];
  disabled?: boolean;
  onAdd: () => void;
  onEdit: (row: RecruitRow) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const columns: ColumnsType<RecruitRow> = [
    { key: "name", title: t("ingest.components.recruitColName"), dataIndex: "name" },
    {
      key: "topic",
      title: t("ingest.components.recruitColTopic"),
      dataIndex: "topic",
      render: (v) => <span className="break-all text-text-secondary">{v}</span>,
    },
    {
      key: "payload",
      title: t("ingest.components.recruitColPayload"),
      dataIndex: "payload",
      render: (v) => <span className="break-all text-text-secondary">{v}</span>,
    },
    vtActionColumn<RecruitRow>(
      t("common.actions"),
      (row) => (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onEdit(row)}
            className="mx-0.5 rounded p-1 text-text-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <EditOutlined className="h-3 w-3" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDelete(row.id)}
            className="mx-0.5 rounded p-1 text-text-muted hover:text-status-critical disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DeleteOutlined className="h-3 w-3" />
          </button>
        </>
      ),
      100,
    ),
  ];

  return (
    <div className={disabled ? "opacity-60" : undefined}>
      <div className="mb-1.5 flex items-center justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded border border-panel-border px-2 py-0.5 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusOutlined className="h-3 w-3" /> {t("common.add")}
        </button>
      </div>
      <div className="overflow-hidden rounded border border-panel-border">
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          className="vt-ant-data-table"
          columns={columns}
          dataSource={items}
          locale={{ emptyText: t("common.noData") }}
        />
      </div>
    </div>
  );
}

function UploadInput({ value, uploading, onPick, disabled }: { value: string; uploading?: boolean; onPick: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const fileName = value ? value.split("/").pop() ?? "" : "";
  return (
    <div className="flex w-full gap-2">
      <Input readOnly disabled={disabled} className="min-w-0 flex-1" placeholder={t("common.selectFile")} value={fileName} />
      <VtButton
        icon={uploading ? <LoadingOutlined spin /> : <UploadOutlined />}
        onClick={onPick}
        disabled={disabled || uploading}
        title={t("common.selectFile")}
      />
    </div>
  );
}

function RecruitDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: RecruitRow | null;
  onClose: () => void;
  onSave: (r: RecruitRow) => void;
}) {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const [formApi] = Form.useForm<{ name: string; topic: string; payload: string; target: string }>();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [payload, setPayload] = useState("");
  const [gateway, setGateway] = useState(false);
  const [direct, setDirect] = useState(false);
  const isEdit = !!initial;

  useEffect(() => {
    if (!open) {
      formApi.resetFields();
      setName("");
      setTopic("");
      setPayload("");
      setGateway(false);
      setDirect(false);
      return;
    }
    const nextName = initial?.name ?? "";
    const nextTopic = initial?.topic ?? "";
    const nextPayload = initial?.payload ?? "";
    const nextGateway = initial?.targets.gateway ?? false;
    const nextDirect = initial?.targets.direct ?? false;
    setName(nextName);
    setTopic(nextTopic);
    setPayload(nextPayload);
    setGateway(nextGateway);
    setDirect(nextDirect);
    formApi.setFieldsValue({
      name: nextName,
      topic: nextTopic,
      payload: nextPayload,
      target: nextGateway || nextDirect ? "ok" : "",
    });
  }, [open, initial, formApi]);

  const syncTarget = (nextGateway: boolean, nextDirect: boolean) => {
    const target = nextGateway || nextDirect ? "ok" : "";
    formApi.setFieldValue("target", target);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? t("common.edit") : t("ingest.components.recruitAdd")}
      size={480}
      {...nestedDrawerProps}
      footer={drawerFooter([
        { key: "cancel", label: t("common.cancel"), onClick: onClose },
        {
          key: "confirm",
          label: t("common.confirm"),
          type: "primary",
          onClick: async () => {
            syncTarget(gateway, direct);
            try {
              await formApi.validateFields();
            } catch {
              return;
            }
            onSave({
              id: initial?.id ?? String(Date.now()),
              name,
              topic,
              payload,
              targets: { gateway, direct },
            });
          },
        },
      ])}
    >
      <Form form={formApi} layout="horizontal">
      <Form.Item
        name="name"
        label={t("ingest.components.recruitName")}
        required
        {...drawerFormItemProps}
        rules={[requiredInputRule(t, t("ingest.components.recruitName"))]}
      >
        <Input
          placeholder={ph.input(t("ingest.components.recruitName"))}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            formApi.setFieldValue("name", e.target.value);
          }}
        />
      </Form.Item>
      <Form.Item
        name="topic"
        label={t("common.topic")}
        required
        {...drawerFormItemProps}
        rules={[requiredInputRule(t, t("common.topic"))]}
      >
        <Input
          placeholder={ph.input(t("common.topic"))}
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            formApi.setFieldValue("topic", e.target.value);
          }}
        />
      </Form.Item>
      <Form.Item
        name="payload"
        label={t("common.payload")}
        required
        {...drawerFormItemProps}
        rules={[requiredInputRule(t, t("common.payload"))]}
      >
        <Input.TextArea
          rows={4}
          placeholder={ph.input(t("common.payload"))}
          value={payload}
          onChange={(e) => {
            setPayload(e.target.value);
            formApi.setFieldValue("payload", e.target.value);
          }}
        />
      </Form.Item>
      <Form.Item
        name="target"
        label={t("common.target")}
        required
        {...drawerFormItemProps}
        rules={[
          {
            validator: async () => {
              if (!gateway && !direct) {
                return Promise.reject(requiredInputError(t, t("common.target")));
              }
            },
          },
        ]}
      >
        <div className="flex items-center gap-5 text-xs text-foreground">
          <Checkbox
            checked={gateway}
            onChange={(e) => {
              const next = e.target.checked;
              setGateway(next);
              syncTarget(next, direct);
            }}
          >
            {t("common.gateway")}
          </Checkbox>
          <Checkbox
            checked={direct}
            onChange={(e) => {
              const next = e.target.checked;
              setDirect(next);
              syncTarget(gateway, next);
            }}
          >
            {t("common.directDevice")}
          </Checkbox>
        </div>
      </Form.Item>
      </Form>
    </Drawer>
  );
}
