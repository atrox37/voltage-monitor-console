import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Drawer, Form, Input } from "antd";
import { OptionToggle } from "@/components/option-toggle";
import { LoadingOutlined, UploadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { showApiError, showError, showSuccess } from "@/lib/api-message";
import {
  deleteProtocol,
  pageProtocols,
  reloadProtocol,
  saveProtocol,
  testProtocol,
  uploadProtocol,
} from "@/api";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { useDimensionTreeQuery } from "@/hooks/use-dimension-tree-query";
import { useServerPageQuery } from "@/hooks/use-server-page-query";
import {
  mapProtocolDtoToForm,
  mapProtocolDtoToRow,
  mapProtocolFormToPo,
  protocolTestType,
} from "@/features/ingest/lib/ingest-mappers";
import { useListPagination } from "@/lib/list-pagination";
import { queryKeys } from "@/lib/query-keys";
import { termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import type { DeviceProtocolPageDto, PageQuery } from "@/types";

export const Route = createFileRoute("/_app/ingest/protocols")({
  component: ProtocolsPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.update_time", order: "desc" }];

type ProtocolForm = {
  id: string;
  name: string;
  description: string;
  provider: string;
  location: string;
  storage: "S3" | "Minio";
  support: string[];
};

function blankProtocolForm(): ProtocolForm {
  return {
    id: "",
    name: "",
    description: "",
    provider: "",
    location: "",
    storage: "Minio",
    support: [],
  };
}

function supportLabel(type: string, t: (key: string) => string) {
  if (type === "KAFKA") return t("ingest.protocols.kafkaClient");
  if (type === "MQTT_CLIENT" || type === "MQTT_SERVER") return t("ingest.protocols.mqttClient");
  return type;
}

type ProtocolRow = ReturnType<typeof mapProtocolDtoToRow>;

function ProtocolsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: orgNodes = [] } = useDimensionTreeQuery();
  const { page, setPage, pageSize, onPageSizeChange } = useListPagination();

  const [filterDraft, setFilterDraft] = useState({ name: "", orgId: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "", orgId: "" });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<ProtocolForm>(blankProtocolForm());
  const [testing, setTesting] = useState<DeviceProtocolPageDto | null>(null);

  const listQuery = useMemo(() => {
    const terms = [];
    const name = filterApplied.name.trim();
    if (name) terms.push(termLike("t.name", name));
    if (filterApplied.orgId) terms.push(termEq("t.org_id", toDbId(filterApplied.orgId)));
    return { terms, sorts: DEFAULT_SORTS };
  }, [filterApplied]);

  const { rows, total, loading } = useServerPageQuery<DeviceProtocolPageDto, ProtocolRow>({
    queryKey: queryKeys.protocols.list(listQuery),
    page,
    pageSize,
    query: listQuery,
    fetchPage: pageProtocols,
    mapRow: mapProtocolDtoToRow,
    errorMessage: t("ingest.protocols.loadFailed"),
  });

  const invalidateList = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.protocols.root });

  const openAdd = () => {
    setDrawerMode("add");
    setForm(blankProtocolForm());
    setDrawerOpen(true);
  };

  const openEdit = (row: ReturnType<typeof mapProtocolDtoToRow>) => {
    setDrawerMode("edit");
    setForm(mapProtocolDtoToForm(row.raw));
    setDrawerOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: ProtocolForm) => saveProtocol(mapProtocolFormToPo(data)),
    onSuccess: () => {
      showSuccess(t("common.saveSuccess"));
      setDrawerOpen(false);
      invalidateList();
    },
    onError: (err) => {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("common.loadFailed"));
    },
  });

  const reloadMutation = useMutation({
    mutationFn: (id: number | string) => reloadProtocol(id),
    onSuccess: (_data, id) => {
      const row = rows.find((r) => String(r.id) === String(id));
      showSuccess(t("ingest.protocols.reloadDone", { name: row?.name ?? "" }));
      invalidateList();
    },
    onError: (err) => {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("common.loadFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProtocol(id),
    onSuccess: () => {
      showSuccess(t("common.deleteSuccess"));
      invalidateList();
    },
    onError: (err) => {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("common.loadFailed"));
    },
  });

  const handleSave = (data: ProtocolForm) => saveMutation.mutate(data);
  const handleSync = (p: DeviceProtocolPageDto) => {
    if (!p.id) return;
    reloadMutation.mutate(p.id);
  };
  const handleDelete = (row: ProtocolRow) => deleteMutation.mutate(row.id);
  const saving = saveMutation.isPending;

  return (
    <>
      <ListPageTemplate
        actionColumnWidth={320}
        title={t("ingest.protocols.title")}
        loading={loading}
        serverSide
        rows={rows}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
        onSearch={() => {
          setFilterApplied({ ...filterDraft });
          setPage(1);
        }}
        onReset={() => {
          const empty = { name: "", orgId: "" };
          setFilterDraft(empty);
          setFilterApplied(empty);
          setPage(1);
        }}
        filterValues={filterDraft}
        onFilterValuesChange={(draft) =>
          setFilterDraft({ name: draft.name ?? "", orgId: draft.orgId ?? "" })
        }
        filters={[
          { type: "text", key: "name", label: t("common.nameLabel") },
          {
            type: "orgTree",
            key: "orgId",
            label: t("common.orgLabel"),
            nodes: orgNodes,
          },
        ]}
        columns={[
          { key: "name", title: t("ingest.protocols.protocolName") },
          {
            key: "support",
            title: t("ingest.protocols.supportType"),
            render: (r) => (
              <span className="inline-flex flex-wrap gap-1">
                {r.support.map((s) => (
                  <span
                    key={s}
                    className={`rounded px-2 py-0.5 text-[11px] ${
                      s === "KAFKA"
                        ? "bg-status-warning/15 text-status-warning"
                        : "bg-status-online/15 text-status-online"
                    }`}
                  >
                    {supportLabel(s, t)}
                  </span>
                ))}
              </span>
            ),
          },
          {
            key: "gatewayCount",
            title: t("ingest.protocols.gatewayLinked"),
            render: (r) =>
              r.gatewayCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">
                    {t("ingest.protocols.linkedYes")}
                  </span>
                  <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">
                    {t("ingest.protocols.linkedCount", { count: r.gatewayCount })}
                  </span>
                </span>
              ) : (
                <span className="rounded bg-status-warning/15 px-1.5 py-0.5 text-[11px] text-status-warning">
                  {t("ingest.protocols.linkedNo")}
                </span>
              ),
          },
          { key: "org", title: t("common.orgBelong") },
          {
            key: "updateTime",
            title: t("common.updatedAt"),
            render: (r) => <span className="text-text-secondary">{r.updateTime}</span>,
          },
        ]}
        onAdd={openAdd}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => openEdit(r)}>{t("common.edit")}</RowBtn>
            <RowBtn icon={ReloadOutlined} onClick={() => void handleSync(r.raw)}>
              {t("ingest.protocols.reload")}
            </RowBtn>
            <RowBtn icon={PlayCircleOutlined} onClick={() => setTesting(r.raw)}>
              {t("common.test")}
            </RowBtn>
            <RowBtn
              danger
              disabled={r.gatewayCount > 0}
              confirm={{
                title: t("common.confirmDelete"),
                description: t("common.confirmDeleteDesc", {
                  target: t("ingest.protocols.title"),
                  name: r.name,
                }),
                confirmText: t("common.delete"),
              }}
              onClick={() => void handleDelete(r)}
            >
              {t("common.delete")}
            </RowBtn>
          </>
        )}
      />

      {drawerOpen && (
        <ProtocolDrawer
          mode={drawerMode}
          value={form}
          saving={saving}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      )}

      {testing && <ProtocolTestDrawer protocol={testing} onClose={() => setTesting(null)} />}
    </>
  );
}

function ProtocolDrawer({
  mode,
  value,
  saving,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  value: ProtocolForm;
  saving: boolean;
  onClose: () => void;
  onSave: (p: ProtocolForm) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ProtocolForm>(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const set = <K extends keyof ProtocolForm>(k: K, v: ProtocolForm[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!draft.provider.trim()) {
      showError(t("common.requiredHint"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("provider", draft.provider);
      fd.append("bucketType", draft.storage.toLowerCase());
      if (draft.id) fd.append("id", draft.id);
      const res = await uploadProtocol(fd);
      set("location", res.url ?? "");
      set("support", res.support ?? []);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("ingest.protocols.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".jar"
        onChange={(e) => void onUpload(e.target.files?.[0])}
      />
      <Drawer
        open
        onClose={onClose}
        title={mode === "add" ? t("common.addTitle") : t("common.editTitle")}
        width={520}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              type="primary"
              size="small"
              disabled={saving || uploading}
              onClick={() => onSave(draft)}
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        }
      >
        <Form.Item
          label={t("common.nameLabel")}
          required
          layout="horizontal"
          labelCol={{ flex: "72px" }}
          wrapperCol={{ flex: 1 }}
          className="mb-3"
        >
          <Input
            placeholder={t("common.inputPlaceholder")}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Form.Item>

        {mode === "edit" && draft.support.length > 0 && (
          <Form.Item
            label={t("ingest.protocols.supportProtocol")}
            layout="horizontal"
            labelCol={{ flex: "72px" }}
            wrapperCol={{ flex: 1 }}
            className="mb-3"
          >
            <span className="inline-flex flex-wrap gap-1">
              {draft.support.map((s) => (
                <span
                  key={s}
                  className="rounded bg-status-online/15 px-2 py-1 text-xs text-status-online"
                >
                  {supportLabel(s, t)}
                </span>
              ))}
            </span>
          </Form.Item>
        )}

        <Form.Item
          label={t("ingest.protocols.storage")}
          required
          layout="horizontal"
          labelCol={{ flex: "72px" }}
          wrapperCol={{ flex: 1 }}
          className="mb-3"
        >
          <OptionToggle
            value={draft.storage}
            onChange={(v) => set("storage", v)}
            disabled={mode === "edit"}
            options={[
              { label: "S3", value: "S3" },
              { label: "Minio", value: "Minio" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label={t("ingest.protocols.pkg")}
          required
          layout="horizontal"
          labelCol={{ flex: "72px" }}
          wrapperCol={{ flex: 1 }}
          className="mb-3"
        >
          <Input
            placeholder={t("common.inputPlaceholder")}
            value={draft.provider}
            onChange={(e) => set("provider", e.target.value)}
          />
        </Form.Item>

        <Form.Item
          label={t("ingest.protocols.upload")}
          required
          layout="horizontal"
          labelCol={{ flex: "72px" }}
          wrapperCol={{ flex: 1 }}
          className="mb-3"
        >
          <div className="flex gap-2">
            <input
              className="cursor-default"
              readOnly
              placeholder={t("common.selectFile")}
              value={draft.location ? (draft.location.split("/").pop() ?? "") : ""}
            />
            <Button
              icon={uploading ? <LoadingOutlined spin /> : <UploadOutlined />}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title={t("common.selectFile")}
            />
          </div>
        </Form.Item>

        <Form.Item
          label={t("ingest.protocols.description")}
          layout="horizontal"
          labelCol={{ flex: "72px" }}
          wrapperCol={{ flex: 1 }}
          className="mb-3"
        >
          <Input
            placeholder={t("ingest.protocols.descPlaceholder")}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Form.Item>
      </Drawer>
    </>
  );
}

function ProtocolTestDrawer({
  protocol,
  onClose,
}: {
  protocol: DeviceProtocolPageDto;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [topic, setTopic] = useState("");
  const [clientId, setClientId] = useState("");
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const testType = protocolTestType(protocol.support);
  const typeLabel = testType === "kafka" ? "Kafka" : "MQTT";

  const runTest = async () => {
    if (!protocol.id) return;
    setTesting(true);
    try {
      const body: Record<string, unknown> = {
        id: toDbId(protocol.id),
        type: testType,
        topic,
        data: payload,
      };
      if (testType === "mqtt") body.clientId = clientId;
      const data = await testProtocol(body);
      setResult(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("common.loadFailed"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("ingest.protocols.testTitle", { type: typeLabel })}
      width={520}
      destroyOnHidden
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="primary" size="small" disabled={testing} onClick={() => void runTest()}>
            {testing ? t("common.loading") : t("ingest.protocols.testSend")}
          </Button>
        </div>
      }
    >
      <Form.Item
        label={t("common.topic")}
        layout="horizontal"
        labelCol={{ flex: "72px" }}
        wrapperCol={{ flex: 1 }}
        className="mb-3"
      >
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
      </Form.Item>
      {testType === "mqtt" && (
        <Form.Item
          label="clientId"
          layout="horizontal"
          labelCol={{ flex: "72px" }}
          wrapperCol={{ flex: 1 }}
          className="mb-3"
        >
          <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
        </Form.Item>
      )}
      <Form.Item label={t("ingest.protocols.sendPayload")} layout="vertical" className="mb-3">
        <Input.TextArea rows={4} value={payload} onChange={(e) => setPayload(e.target.value)} />
      </Form.Item>
      {result && (
        <div className="rounded-md border border-status-online/40 bg-status-online/10 px-3 py-2 text-xs text-status-online whitespace-pre-wrap break-all">
          {result}
        </div>
      )}
    </Drawer>
  );
}
