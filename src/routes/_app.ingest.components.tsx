import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CloseOutlined, DeleteOutlined, LoadingOutlined, MinusOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Checkbox, Drawer, Form, Input, InputNumber, Switch } from "antd";
import { drawerFooter, drawerFormItemProps } from "@/components/drawer-form";
import { showError, showSuccess } from "@/lib/api-message";
import { deleteNetwork, getDimensionTree, pageNetworks, saveNetwork, uploadNetworkFile } from "@/api";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
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
          { key: "org", title: t("common.orgBelong") },
          { key: "updateTime", title: t("common.updatedAt"), render: (r) => <span className="text-text-secondary">{r.updateTime}</span> },
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
  const [d, setD] = useState<NetworkCompForm>(value);
  const [topicDraft, setTopicDraft] = useState("");
  const [recruitOpen, setRecruitOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTag, setUploadTag] = useState<"sslCa" | "sslCert" | "sslKey" | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setD(value);
  }, [value]);

  const set = <K extends keyof NetworkCompForm>(k: K, v: NetworkCompForm[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  const addTopic = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const v = topicDraft.trim();
    if (!v) return;
    set("topics", [...d.topics, v]);
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
        width={560}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={drawerFooter([
          { key: "cancel", label: t("common.cancel"), onClick: onClose },
          {
            key: "save",
            label: saving ? t("common.saving") : t("common.save"),
            type: "primary",
            disabled: saving,
            onClick: () => onSave(d),
          },
        ])}
      >
        <div className="mb-5">
          <div className="inline-flex overflow-hidden rounded-md border border-panel-border">
            {TYPE_OPTIONS.map((opt) => {
              const active = d.type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={mode === "edit"}
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

        <Form.Item label={t("common.nameLabel")} required {...drawerFormItemProps}>
          <Input value={d.name} onChange={(e) => set("name", e.target.value)} />
        </Form.Item>

        <Form.Item label={t("common.status")} {...drawerFormItemProps}>
          <Switch
            disabled={mode === "add"}
            checked={d.enabled}
            onChange={(enabled) => set("enabled", enabled)}
          />
          <span className="ml-2 text-xs text-text-secondary">{d.enabled ? t("common.on") : t("common.off")}</span>
        </Form.Item>

        <Form.Item label={t("ingest.components.ip")} required {...drawerFormItemProps}>
          <Input value={d.ip} onChange={(e) => set("ip", e.target.value)} />
        </Form.Item>

        <Form.Item label={t("ingest.components.port")} required {...drawerFormItemProps}>
          <div className="inline-flex items-center overflow-hidden rounded-md border border-panel-border">
            <button type="button" onClick={() => set("port", Math.max(1, d.port - 1))} className="flex h-9 w-9 items-center justify-center bg-panel text-text-secondary hover:text-foreground">
              <MinusOutlined className="text-sm" />
            </button>
            <InputNumber
              controls={false}
              value={d.port}
              onChange={(v) => set("port", Number(v) || 0)}
              className="!h-9 !w-24 !rounded-none border-x border-panel-border text-center"
            />
            <button type="button" onClick={() => set("port", d.port + 1)} className="flex h-9 w-9 items-center justify-center bg-panel text-text-secondary hover:text-foreground">
              <PlusOutlined className="text-sm" />
            </button>
          </div>
        </Form.Item>

        <Form.Item label={t("ingest.components.username")} {...drawerFormItemProps}>
          <Input value={d.username} onChange={(e) => set("username", e.target.value)} />
        </Form.Item>

        <Form.Item label={t("ingest.components.password")} {...drawerFormItemProps}>
          <Input.Password value={d.password} onChange={(e) => set("password", e.target.value)} />
        </Form.Item>

        <Form.Item label={t("ingest.components.ssl")} {...drawerFormItemProps}>
          <Switch checked={d.ssl} onChange={(ssl) => set("ssl", ssl)} />
        </Form.Item>

        {d.ssl && (
          <>
            <Form.Item label={t("ingest.components.caCert")} {...drawerFormItemProps}>
              <UploadInput value={d.caCert} uploading={uploading && uploadTag === "sslCa"} onPick={() => pickUpload("sslCa")} />
            </Form.Item>
            <Form.Item label={t("ingest.components.sslCert")} {...drawerFormItemProps}>
              <UploadInput value={d.sslCert} uploading={uploading && uploadTag === "sslCert"} onPick={() => pickUpload("sslCert")} />
            </Form.Item>
            <Form.Item label={t("ingest.components.sslKey")} {...drawerFormItemProps}>
              <UploadInput value={d.sslKey} uploading={uploading && uploadTag === "sslKey"} onPick={() => pickUpload("sslKey")} />
            </Form.Item>
          </>
        )}

        <Form.Item label={t("ingest.components.topics")} {...drawerFormItemProps}>
          <div className="rounded-md border border-panel-border bg-background/40 p-2">
            <div className="flex flex-wrap gap-1.5">
              {d.topics.map((topic, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded bg-panel px-2 py-1 text-[11px] text-foreground">
                  {topic}
                  <button type="button" onClick={() => set("topics", d.topics.filter((_, idx) => idx !== i))} className="text-text-muted hover:text-status-critical">
                    <CloseOutlined className="text-xs" />
                  </button>
                </span>
              ))}
              <input value={topicDraft} onChange={(e) => setTopicDraft(e.target.value)} onKeyDown={addTopic} placeholder={t("ingest.components.topicPlaceholder")} className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-xs text-foreground placeholder:text-text-muted outline-none" />
            </div>
          </div>
        </Form.Item>

        <Form.Item label={t("ingest.components.recruit")} {...drawerFormItemProps}>
          <div className="rounded-md border border-panel-border">
            <div className="flex items-center border-b border-panel-border bg-panel/40 px-3 py-2 text-[11px] text-text-secondary">
              <div className="w-1/4">{t("ingest.components.recruitColName")}</div>
              <div className="w-1/3">{t("ingest.components.recruitColTopic")}</div>
              <div className="w-1/4">{t("ingest.components.recruitColPayload")}</div>
              <div className="ml-auto">
                <button type="button" onClick={() => setRecruitOpen(true)} className="flex h-6 w-6 items-center justify-center rounded border border-panel-border text-text-secondary hover:text-primary">
                  <PlusOutlined className="text-xs" />
                </button>
              </div>
            </div>
            {d.recruits.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-text-muted">{t("common.noData")}</div>
            ) : (
              d.recruits.map((r) => (
                <div key={r.id} className="flex items-start border-t border-panel-border/60 px-3 py-2 text-xs text-foreground">
                  <div className="w-1/4 pr-2 break-words">{r.name}</div>
                  <div className="w-1/3 pr-2 break-all text-text-secondary">{r.topic}</div>
                  <div className="w-1/4 pr-2 break-all text-text-secondary">{r.payload}</div>
                  <button type="button" onClick={() => set("recruits", d.recruits.filter((x) => x.id !== r.id))} className="ml-auto text-text-muted hover:text-status-critical">
                    <DeleteOutlined className="text-sm" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Form.Item>
      </Drawer>

      {recruitOpen && (
        <RecruitDialog
          onClose={() => setRecruitOpen(false)}
          onAdd={(r) => { set("recruits", [...d.recruits, r]); setRecruitOpen(false); }}
        />
      )}
    </>
  );
}

function UploadInput({ value, uploading, onPick }: { value: string; uploading?: boolean; onPick: () => void }) {
  const { t } = useTranslation();
  const fileName = value ? value.split("/").pop() ?? "" : "";
  return (
    <div className="flex gap-2">
      <Input readOnly placeholder={t("common.selectFile")} value={fileName} />
      <Button
        icon={uploading ? <LoadingOutlined spin /> : <UploadOutlined />}
        onClick={onPick}
        disabled={uploading}
        title={t("common.selectFile")}
      />
    </div>
  );
}

function RecruitDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (r: RecruitRow) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [payload, setPayload] = useState("");
  const [gateway, setGateway] = useState(false);
  const [direct, setDirect] = useState(false);

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("ingest.components.recruitAdd")}
      width={480}
      zIndex={1200}
      destroyOnHidden
      styles={{ body: { paddingTop: 8 } }}
      footer={drawerFooter([
        { key: "cancel", label: t("common.cancel"), onClick: onClose },
        {
          key: "confirm",
          label: t("common.confirm"),
          type: "primary",
          onClick: () => onAdd({ id: String(Date.now()), name, topic, payload, targets: { gateway, direct } }),
        },
      ])}
    >
      <Form.Item label={t("ingest.components.recruitName")} required {...drawerFormItemProps}>
        <Input placeholder={t("common.inputPlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
      </Form.Item>
      <Form.Item label={t("common.topic")} required {...drawerFormItemProps}>
        <Input placeholder={t("common.inputPlaceholder")} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </Form.Item>
      <Form.Item label={t("common.payload")} {...drawerFormItemProps}>
        <Input.TextArea rows={4} placeholder={t("common.inputPlaceholder")} value={payload} onChange={(e) => setPayload(e.target.value)} />
      </Form.Item>
      <Form.Item label={t("common.target")} {...drawerFormItemProps}>
        <div className="flex items-center gap-5 text-xs text-foreground">
          <Checkbox checked={gateway} onChange={(e) => setGateway(e.target.checked)}>
            {t("common.gateway")}
          </Checkbox>
          <Checkbox checked={direct} onChange={(e) => setDirect(e.target.checked)}>
            {t("common.directDevice")}
          </Checkbox>
        </div>
      </Form.Item>
    </Drawer>
  );
}
