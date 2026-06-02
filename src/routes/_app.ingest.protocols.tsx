import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import {
  deleteProtocol,
  getDimensionTree,
  pageProtocols,
  reloadProtocol,
  saveProtocol,
  testProtocol,
  uploadProtocol,
} from "@/api";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import { VtDrawer, VtField, vtInputCls, VtBtn, VtSegmented, VtFilePickButton } from "@/components/vt-drawer";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import {
  mapProtocolDtoToForm,
  mapProtocolDtoToRow,
  mapProtocolFormToPo,
  protocolTestType,
} from "@/lib/ingest-mappers";
import { termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import type { DeviceProtocolPageDto, PageQuery } from "@/types";
import type { OrgNode } from "@/components/org-tree-select";

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

function ProtocolsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReturnType<typeof mapProtocolDtoToRow>[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [filterDraft, setFilterDraft] = useState({ name: "", orgId: "" });
  const [filterApplied, setFilterApplied] = useState({ name: "", orgId: "" });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<ProtocolForm>(blankProtocolForm());
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<DeviceProtocolPageDto | null>(null);
  const [syncTarget, setSyncTarget] = useState<DeviceProtocolPageDto | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const terms = [];
      const name = filterApplied.name.trim();
      if (name) terms.push(termLike("t.name", name));
      if (filterApplied.orgId) terms.push(termEq("t.org_id", toDbId(filterApplied.orgId)));

      const result = await pageProtocols({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapProtocolDtoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      toast.error(err instanceof Error ? err.message : t("ingest.protocols.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterApplied.name, filterApplied.orgId, page, t]);

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

  const handleSave = async (data: ProtocolForm) => {
    setSaving(true);
    try {
      await saveProtocol(mapProtocolFormToPo(data));
      toast.success(t("common.saveSuccess"));
      setDrawerOpen(false);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("common.loadFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (p: DeviceProtocolPageDto) => {
    if (!p.id) return;
    try {
      await reloadProtocol(p.id);
      toast.success(t("ingest.protocols.syncDone", { name: p.name ?? "" }));
      setSyncTarget(null);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("common.loadFailed"));
    }
  };

  const handleDelete = async (row: ReturnType<typeof mapProtocolDtoToRow>) => {
    try {
      await deleteProtocol(row.id);
      toast.success(t("common.deleteSuccess"));
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : t("common.loadFailed"));
    }
  };

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
          { type: "text", key: "name", label: t("common.nameLabel"), placeholder: t("common.inputPlaceholder") },
          {
            type: "orgTree",
            key: "orgId",
            label: t("common.orgLabel"),
            nodes: orgNodes,
            allowAll: true,
            placeholder: t("common.select"),
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
                      s === "KAFKA" ? "bg-status-warning/15 text-status-warning" : "bg-status-online/15 text-status-online"
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
            render: (r) => (
              r.gatewayCount > 0
                ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">{t("ingest.protocols.linkedYes")}</span>
                    <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online">{t("ingest.protocols.linkedCount", { count: r.gatewayCount })}</span>
                  </span>
                )
                : <span className="rounded bg-status-warning/15 px-1.5 py-0.5 text-[11px] text-status-warning">{t("ingest.protocols.linkedNo")}</span>
            ),
          },
          { key: "org", title: t("common.orgBelong") },
          { key: "updateTime", title: t("common.updatedAt"), render: (r) => <span className="text-text-secondary">{r.updateTime}</span> },
        ]}
        onAdd={openAdd}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => openEdit(r)}>{t("common.edit")}</RowBtn>
            <RowBtn icon={RefreshCw} onClick={() => setSyncTarget(r.raw)}>{t("common.sync")}</RowBtn>
            <RowBtn icon={PlayCircle} onClick={() => setTesting(r.raw)}>{t("common.test")}</RowBtn>
            <RowBtn
              danger
              disabled={r.gatewayCount > 0}
              confirm={{
                title: t("common.confirmDelete"),
                description: t("common.confirmDeleteDesc", { target: t("ingest.protocols.title"), name: r.name }),
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

      <ConfirmDialog
        open={!!syncTarget}
        title={t("ingest.protocols.syncTitle")}
        icon={RefreshCw}
        danger={false}
        description={t("ingest.protocols.syncDesc", { name: syncTarget?.name ?? "" })}
        confirmText={t("common.sync")}
        onConfirm={() => syncTarget && void handleSync(syncTarget)}
        onClose={() => setSyncTarget(null)}
      />
    </>
  );
}

function ProtocolDrawer({
  mode, value, saving, onClose, onSave,
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
      toast.error(t("common.requiredHint"));
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
      toast.error(err instanceof Error ? err.message : t("ingest.protocols.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" className="hidden" accept=".jar" onChange={(e) => void onUpload(e.target.files?.[0])} />
      <VtDrawer
        open
        onClose={onClose}
        title={mode === "add" ? t("common.addTitle") : t("common.editTitle")}
        width={520}
        footer={
          <>
            <VtBtn variant="ghost" onClick={onClose}>{t("common.cancel")}</VtBtn>
            <VtBtn disabled={saving || uploading} onClick={() => onSave(draft)}>
              {saving ? t("common.saving") : t("common.save")}
            </VtBtn>
          </>
        }
      >
        <VtField label={t("common.nameLabel")} required>
          <input className={vtInputCls} placeholder={t("common.inputPlaceholder")} value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </VtField>

        {mode === "edit" && draft.support.length > 0 && (
          <VtField label={t("ingest.protocols.supportProtocol")}>
            <span className="inline-flex flex-wrap gap-1">
              {draft.support.map((s) => (
                <span key={s} className="rounded bg-status-online/15 px-2 py-1 text-xs text-status-online">{supportLabel(s, t)}</span>
              ))}
            </span>
          </VtField>
        )}

        <VtField label={t("ingest.protocols.storage")} required>
          <VtSegmented
            value={draft.storage}
            onChange={(v) => set("storage", v as "S3" | "Minio")}
            options={[{ label: "S3", value: "S3" }, { label: "Minio", value: "Minio" }]}
          />
        </VtField>

        <VtField label={t("ingest.protocols.pkg")} required>
          <input className={vtInputCls} placeholder={t("common.inputPlaceholder")} value={draft.provider} onChange={(e) => set("provider", e.target.value)} />
        </VtField>

        <VtField label={t("ingest.protocols.upload")} required>
          <div className="flex gap-2">
            <input
              className={`${vtInputCls} cursor-default`}
              readOnly
              placeholder={t("common.selectFile")}
              value={draft.location ? draft.location.split("/").pop() ?? "" : ""}
            />
            <VtFilePickButton
              loading={uploading}
              onClick={() => fileRef.current?.click()}
              title={t("common.selectFile")}
            />
          </div>
        </VtField>

        <VtField label={t("ingest.protocols.description")}>
          <input className={vtInputCls} placeholder={t("ingest.protocols.descPlaceholder")} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </VtField>
      </VtDrawer>
    </>
  );
}

function ProtocolTestDrawer({ protocol, onClose }: { protocol: DeviceProtocolPageDto; onClose: () => void }) {
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
      toast.error(err instanceof Error ? err.message : t("common.loadFailed"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <VtDrawer
      open
      onClose={onClose}
      title={t("ingest.protocols.testTitle", { type: typeLabel })}
      width={520}
      footer={
        <VtBtn disabled={testing} onClick={() => void runTest()}>
          {testing ? t("common.loading") : t("ingest.protocols.testSend")}
        </VtBtn>
      }
    >
      <VtField label={t("common.topic")}>
        <input className={vtInputCls} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </VtField>
      {testType === "mqtt" && (
        <VtField label="clientId">
          <input className={vtInputCls} value={clientId} onChange={(e) => setClientId(e.target.value)} />
        </VtField>
      )}
      <VtField label={t("ingest.protocols.sendPayload")} full>
        <textarea className={`${vtInputCls} h-28 py-2`} value={payload} onChange={(e) => setPayload(e.target.value)} />
      </VtField>
      {result && (
        <div className="rounded-md border border-status-online/40 bg-status-online/10 px-3 py-2 text-xs text-status-online whitespace-pre-wrap break-all">
          {result}
        </div>
      )}
    </VtDrawer>
  );
}
