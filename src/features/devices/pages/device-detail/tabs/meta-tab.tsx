import { useMemo, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";

import { useTranslation } from "@/i18n";
import type { ColumnsType } from "antd/es/table";
import { DetailTable } from "@/components/detail-table";
import { vtActionColumn } from "@/lib/table-utils";
import { RowActionBtn, RowActionGroup } from "@/components/row-action-buttons";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";

import type {
  PropertyTagMetadata,
  SimplePropertyMetadata,
  SimpleFunctionMetadata,
} from "@/types/api/metadata";
import { unitLabel, defaultPropertyValueType, propertyTypeLabel } from "@/lib/data-types";

import { PropertyDrawer } from "../drawers/property-drawer";
import {
  MetadataFunctionDrawer,
  type MetadataFunctionDraft,
} from "@/components/metadata-function-drawer";

export function TabMeta() {
  const { t } = useTranslation();
  const { device, updateMetadata, dataTypes } = useDeviceEdit();
  const propertyList = device?.metadata.properties;
  const functionList = device?.metadata.functions;
  const propertyTagList = device?.metadata.propertyTags;
  const props = useMemo(() => propertyList ?? [], [propertyList]);
  const fns = useMemo(() => functionList ?? [], [functionList]);
  const propertyTags = useMemo<PropertyTagMetadata[]>(
    () => propertyTagList ?? [],
    [propertyTagList],
  );

  const [sub, setSub] = useState<"prop" | "fn">("prop");
  const [filterTag, setFilterTag] = useState<string>("all");

  const [editingProp, setEditingProp] = useState<SimplePropertyMetadata | null>(null);
  const [funcDraft, setFuncDraft] = useState<MetadataFunctionDraft | null>(null);

  const filteredProps = useMemo(
    () => props.filter((p) => filterTag === "all" || !p.tagId || p.tagId === filterTag),
    [props, filterTag],
  );

  const closeMetaDrawers = () => {
    setEditingProp(null);
    setFuncDraft(null);
  };

  const switchSubTab = (key: "prop" | "fn") => {
    if (sub === key) return;
    closeMetaDrawers();
    setSub(key);
  };

  if (!device) return null;

  const saveProp = (p: SimplePropertyMetadata) => {
    updateMetadata((m) => {
      const list = m.properties ?? [];
      const exists = list.some((x) => x.id === p.id);
      return {
        ...m,
        properties: exists ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p],
      };
    });
    setEditingProp(null);
  };

  const saveFn = (draft: MetadataFunctionDraft) => {
    updateMetadata((m) => {
      const fns = [...(m.functions ?? [])];
      if (draft.index < 0) fns.push(draft.data);
      else fns[draft.index] = draft.data;
      return { ...m, functions: fns };
    });
    setFuncDraft(null);
  };

  const propColumns: ColumnsType<SimplePropertyMetadata> = [
    { key: "name", title: t("common.name"), dataIndex: "name" },
    {
      key: "id",
      title: t("common.identifier"),
      dataIndex: "id",
      width: 160,
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "type",
      title: t("common.type"),
      width: 128,
      render: (_, p) => (
        <span className="text-text-secondary">{propertyTypeLabel(t, p.valueType?.type)}</span>
      ),
    },
    {
      key: "unit",
      title: t("common.unit"),
      width: 120,
      render: (_, p) => (
        <span className="whitespace-nowrap text-text-secondary">
          {p.valueType?.unit ? unitLabel(p.valueType.unit) : "—"}
        </span>
      ),
    },
    {
      key: "tag",
      title: t("common.tag"),
      width: 128,
      render: (_, p) => (
        <span className="text-text-secondary">
          {propertyTags.find((tag) => tag.id === p.tagId)?.name ?? t("common.property")}
        </span>
      ),
    },
    vtActionColumn<SimplePropertyMetadata>(
      t("common.actions"),
      (p) => (
        <RowActionGroup>
          <RowActionBtn onClick={() => setEditingProp(p)}>{t("common.edit")}</RowActionBtn>
          <RowActionBtn
            danger
            confirm={{ description: t("devices.detail.meta.confirmDeleteProperty", { name: p.name }) }}
            onClick={() =>
              updateMetadata((m) => ({
                ...m,
                properties: (m.properties ?? []).filter((x) => x.id !== p.id),
              }))
            }
          >
            {t("common.delete")}
          </RowActionBtn>
        </RowActionGroup>
      ),
      160,
    ),
  ];

  const fnColumns: ColumnsType<SimpleFunctionMetadata> = [
    { key: "name", title: t("common.name"), dataIndex: "name" },
    {
      key: "id",
      title: t("common.identifier"),
      dataIndex: "id",
      width: 160,
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "async",
      title: t("common.asyncLabel"),
      width: 96,
      render: (_, f) => (
        <span className="text-text-secondary">{f.async ? t("common.yes") : t("common.no")}</span>
      ),
    },
    {
      key: "io",
      title: t("common.inOutParams"),
      width: 128,
      render: (_, f) => (
        <span className="text-text-secondary">
          {f.inputs?.length ?? 0} / {f.outputs?.length ?? 0}
        </span>
      ),
    },
    vtActionColumn<SimpleFunctionMetadata>(
      t("common.actions"),
      (f) => (
        <RowActionGroup>
          <RowActionBtn
            onClick={() =>
              setFuncDraft({
                data: JSON.parse(JSON.stringify(f)),
                index: fns.findIndex((x) => x.id === f.id),
              })
            }
          >
            {t("common.edit")}
          </RowActionBtn>
          <RowActionBtn
            danger
            confirm={{ description: t("devices.detail.meta.confirmDeleteFunction", { name: f.name }) }}
            onClick={() =>
              updateMetadata((m) => ({
                ...m,
                functions: (m.functions ?? []).filter((x) => x.id !== f.id),
              }))
            }
          >
            {t("common.delete")}
          </RowActionBtn>
        </RowActionGroup>
      ),
      160,
    ),
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center justify-between border-b border-panel-border/60">
        <div className="flex gap-1">
          {(
            [
              ["prop", t("devices.detail.meta.subTabProperty")],
              ["fn", t("devices.detail.meta.subTabFunction")],
            ] as const
          ).map(([k, l]) => {
            const a = sub === k;
            return (
              <button
                key={k}
                onClick={() => switchSubTab(k)}
                className={`relative px-4 py-1.5 text-xs ${a ? "text-primary" : "text-text-secondary"}`}
              >
                {l}
                {a && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />}
              </button>
            );
          })}
        </div>
        <button
          onClick={() =>
            sub === "prop"
              ? setEditingProp({
                  id: "",
                  name: "",
                  rw: "none",
                  create: true,
                  valueType: defaultPropertyValueType("string"),
                })
              : setFuncDraft({
                  data: {
                    id: "",
                    name: "",
                    async: false,
                    inputs: [],
                    outputs: [],
                    create: true,
                  },
                  index: -1,
                })
          }
          className="vt-detail-action-btn mb-1 px-2.5 py-1 text-xs"
        >
          <PlusOutlined />{" "}
          {sub === "prop"
            ? t("devices.detail.meta.addProperty")
            : t("devices.detail.meta.addFunction")}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        {sub === "prop" ? (
          <DetailTable<SimplePropertyMetadata>
            rowKey="id"
            size="small"
            columns={propColumns}
            dataSource={filteredProps}
            locale={{ emptyText: t("common.noData") }}
          />
        ) : (
          <DetailTable<SimpleFunctionMetadata>
            rowKey="id"
            size="small"
            columns={fnColumns}
            dataSource={fns}
            locale={{ emptyText: t("common.noData") }}
          />
        )}
      </div>

      {sub === "prop" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-panel-border/60 pt-3">
          {[{ id: "all", name: t("common.all") }, ...propertyTags].map((tagItem) => {
            const a = filterTag === tagItem.id;
            return (
              <button
                key={tagItem.id}
                onClick={() => setFilterTag(tagItem.id)}
                className={`rounded border px-2 py-0.5 text-xs ${
                  a
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-panel-border text-text-secondary hover:border-primary/40"
                }`}
              >
                {tagItem.name}
              </button>
            );
          })}
        </div>
      )}

      <PropertyDrawer
        open={!!editingProp}
        value={editingProp}
        onClose={() => setEditingProp(null)}
        onSave={saveProp}
        tags={propertyTags}
      />
      <MetadataFunctionDrawer
        open={!!funcDraft}
        draft={funcDraft}
        dataTypes={dataTypes}
        onClose={() => setFuncDraft(null)}
        onSave={saveFn}
      />
    </div>
  );
}
