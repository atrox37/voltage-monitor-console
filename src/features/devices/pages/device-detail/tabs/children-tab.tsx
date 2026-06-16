import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Pagination, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";

import { useTranslation } from "@/i18n";
import { DetailTable } from "@/components/detail-table";
import { RowActionBtn } from "@/components/row-action-buttons";
import { useConfirm } from "@/components/confirm-dialog";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";
import { pageDevices, saveDevicesBatch } from "@/api";
import { mapDeviceDtoToRow, type DeviceListRow } from "@/features/devices/lib/device-mappers";
import { TreeNode as TreeNodeView } from "@/features/products/pages/product-detail/components/tree-node";
import { showApiError, showError, showSuccess } from "@/lib/api-message";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { toDbId } from "@/lib/query-terms";
import { vtActionColumn } from "@/lib/table-utils";
import { isRequestCanceled } from "@/lib/request";
import { useTableHeight } from "@/lib/use-table-height";

import type { DeviceInstancePageDto } from "@/types";
import type { SimpleTreeMetadata } from "@/types/api/metadata";

function newNodeId() {
  return `n${Math.floor(Math.random() * 1e6)}`;
}

function AddChildrenDrawer({
  open,
  parentId,
  treeNodeId,
  onClose,
  onSaved,
}: {
  open: boolean;
  parentId: string;
  treeNodeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DeviceInstancePageDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<DeviceInstancePageDto[]>([]);
  const tableScrollY = Math.max(240, Math.min(640, useTableHeight(420)));

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pageDevices({
        current: page,
        size: pageSize,
        terms: [
          { column: "t2.type", value: "children" },
          { column: "t.parent_id", termType: "isnull" },
        ],
        sorts: [{ column: "t.update_time", order: "desc" }],
      });
      const list = res.records ?? res.data ?? [];
      setRows(list);
      setTotal(res.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    void fetchCandidates();
  }, [open, fetchCandidates]);

  const columns: ColumnsType<DeviceInstancePageDto> = [
    {
      key: "name",
      title: t("common.deviceName"),
      render: (_, r) => r.deviceInstancePo.name ?? "—",
    },
    {
      key: "sn",
      title: t("common.sn"),
      width: 200,
      render: (_, r) => <span className="text-text-secondary">{r.deviceInstancePo.sn ?? "—"}</span>,
    },
    {
      key: "product",
      title: t("common.productName"),
      render: (_, r) => <span className="text-text-secondary">{r.productPo?.name ?? "—"}</span>,
    },
    {
      key: "creator",
      title: t("common.creator"),
      width: 96,
      render: (_, r) => <span className="text-text-secondary">{r.sysUserPo?.username ?? "—"}</span>,
    },
    {
      key: "updateTime",
      title: t("common.updatedAt"),
      width: 176,
      render: (_, r) => (
        <span className="text-text-secondary">{r.deviceInstancePo.updateTime ?? "—"}</span>
      ),
    },
  ];

  const rowSelection: TableRowSelection<DeviceInstancePageDto> = {
    selectedRowKeys: selected.map((r) => String(r.deviceInstancePo.id)),
    onChange: (_keys, records) => setSelected(records),
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      showError(t("devices.detail.children.pickDeviceHint"));
      return;
    }
    setSaving(true);
    try {
      await saveDevicesBatch(
        selected.map((r) => ({
          id: r.deviceInstancePo.id,
          parentId: toDbId(parentId),
          treeNode: treeNodeId,
        })),
      );
      showSuccess(t("common.saveSuccess"));
      onSaved();
      onClose();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.detail.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("devices.detail.children.addDrawerTitle")}
      size={720}
      destroyOnHidden
      classNames={{ body: "vt-drawer-fill-body" }}
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button size="small" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button type="primary" size="small" loading={saving} onClick={() => void handleSubmit()}>
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-panel-border">
        <Table<DeviceInstancePageDto>
          rowKey={(r) => String(r.deviceInstancePo.id)}
          size="small"
          loading={loading}
          tableLayout="fixed"
          pagination={false}
          rowSelection={rowSelection}
          className="vt-ant-data-table"
          columns={columns}
          dataSource={rows}
          scroll={{ x: "max-content", y: tableScrollY }}
          locale={{ emptyText: t("common.noData") }}
        />
        <div className="vt-table-pagination-bar shrink-0 border-t border-panel-border px-4 py-2">
          <Pagination
            className="vt-ant-pagination"
            size="small"
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            pageSizeOptions={[10, 20, 50, 100]}
            hideOnSinglePage={false}
            onChange={(p, s) => {
              if (s !== pageSize) {
                setPageSize(s);
                setPage(1);
              } else {
                setPage(p);
              }
            }}
            onShowSizeChange={(_current, s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      </div>
    </Drawer>
  );
}

export function TabChildren() {
  const { t } = useTranslation();
  const { device, updateMetadata } = useDeviceEdit();
  const { confirm, confirmNode } = useConfirm();
  const [children, setChildren] = useState<DeviceListRow[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [renameOf, setRenameOf] = useState<{ id: string; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const deviceId = device?.id;

  const loadChildren = useCallback(async () => {
    if (!deviceId) {
      setChildren([]);
      return;
    }
    const terms: Array<{ column: string; value?: unknown; termType?: string }> = [
      { column: "t.parent_id", value: Number(deviceId) || deviceId },
    ];
    if (selectedNodeId) {
      terms.push({ column: "t.tree_node", value: selectedNodeId, termType: "eq" });
    }
    try {
      const res = await pageDevices({
        current: 1,
        size: -1,
        terms,
        sorts: [{ column: "t.create_time", order: "desc" }],
      });
      const list = res.records ?? res.data ?? [];
      setChildren(list.map(mapDeviceDtoToRow));
    } catch {
      setChildren([]);
    }
  }, [deviceId, selectedNodeId]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  if (!device) return null;
  const trees = device.metadata.trees ?? [];

  const append = (parentId: string | null) => {
    updateMetadata((m) => {
      const nextTrees = JSON.parse(JSON.stringify(m.trees ?? [])) as SimpleTreeMetadata[];
      const node: SimpleTreeMetadata = { id: newNodeId(), name: "节点", children: [] };
      if (parentId === null) {
        nextTrees.push(node);
        return { ...m, trees: nextTrees };
      }
      const walk = (ns: SimpleTreeMetadata[]): boolean => {
        for (const n of ns) {
          if (n.id === parentId) {
            (n.children ??= []).push(node);
            return true;
          }
          if (n.children && walk(n.children)) return true;
        }
        return false;
      };
      walk(nextTrees);
      return { ...m, trees: nextTrees };
    });
  };

  const remove = (id: string) => {
    updateMetadata((m) => {
      const filter = (ns: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        ns
          .filter((n) => n.id !== id)
          .map((n) => ({ ...n, children: n.children ? filter(n.children) : [] }));
      return { ...m, trees: filter(m.trees ?? []) };
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const rename = () => {
    if (!renameOf?.name.trim()) return;
    updateMetadata((m) => {
      const walk = (ns: SimpleTreeMetadata[]): SimpleTreeMetadata[] =>
        ns.map((n) =>
          n.id === renameOf.id
            ? { ...n, name: renameOf.name.trim() }
            : { ...n, children: n.children ? walk(n.children) : [] },
        );
      return { ...m, trees: walk(m.trees ?? []) };
    });
    setRenameOf(null);
  };

  const unbindChild = async (row: DeviceListRow) => {
    try {
      await saveDevicesBatch([{ id: row.id, parentId: null }]);
      showSuccess(t("common.deleteSuccess"));
      await loadChildren();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.detail.saveFailed"));
    }
  };

  const childColumns: ColumnsType<DeviceListRow> = [
    {
      key: "name",
      title: t("common.deviceName"),
      render: (_, c) => (
        <Link to="/devices/list/$id" params={{ id: c.id }} className="text-primary hover:underline">
          {c.name}
        </Link>
      ),
    },
    {
      key: "sn",
      title: t("common.sn"),
      dataIndex: "sn",
      width: 180,
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "productName",
      title: t("common.productName"),
      dataIndex: "productName",
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "creator",
      title: t("common.creator"),
      width: 96,
      dataIndex: "creator",
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    {
      key: "updateTime",
      title: t("common.updatedAt"),
      width: 176,
      dataIndex: "updateTime",
      render: (v) => <span className="text-text-secondary">{v}</span>,
    },
    vtActionColumn<DeviceListRow>(
      t("common.actions"),
      (c) => (
        <RowActionBtn
          danger
          confirm={{
            description: t("devices.detail.children.confirmUnbind", { name: c.name }),
          }}
          onClick={() => void unbindChild(c)}
        >
          {t("common.delete")}
        </RowActionBtn>
      ),
      96,
    ),
  ];

  return (
    <div className="grid h-full min-h-0 grid-cols-[300px_1fr] gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-col overflow-hidden rounded border border-panel-border">
        <div className="flex shrink-0 items-center justify-between border-b border-panel-border bg-panel/40 px-3 py-2">
          <span className="text-xs font-medium text-foreground">{t("common.structureBranch")}</span>
          <button
            type="button"
            onClick={() => append(null)}
            className="vt-detail-action-btn px-2.5 py-1 text-xs"
          >
            <PlusOutlined /> {t("devices.detail.children.addRoot")}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {trees.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-muted">{t("common.noNodes")}</div>
          ) : (
            <ul className="text-sm">
              {trees.map((n) => (
                <TreeNodeView
                  key={n.id}
                  node={n}
                  selectedId={selectedNodeId}
                  onSelect={(node) => setSelectedNodeId(node.id)}
                  onAppend={(id) => append(id)}
                  onRename={(node) => setRenameOf({ id: node.id, name: node.name })}
                  onDelete={(node) =>
                    confirm({
                      description: t("devices.detail.children.confirmDeleteNode", {
                        name: node.name,
                        children: node.children?.length
                          ? t("devices.detail.children.withChildren")
                          : "",
                      }),
                      onConfirm: () => remove(node.id),
                    })
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded border border-panel-border">
        <div className="flex shrink-0 items-center justify-between border-b border-panel-border bg-panel/40 px-3 py-2">
          <span className="text-xs font-medium text-foreground">{t("common.childDeviceList")}</span>
          <button
            type="button"
            onClick={() => {
              if (!selectedNodeId) {
                showError(t("devices.detail.children.selectNodeHint"));
                return;
              }
              setAddOpen(true);
            }}
            className="vt-detail-action-btn px-2.5 py-1 text-xs"
          >
            <PlusOutlined /> {t("common.addChild")}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DetailTable<DeviceListRow>
            rowKey="id"
            size="small"
            columns={childColumns}
            dataSource={children}
            locale={{ emptyText: t("common.noData") }}
          />
        </div>
      </div>

      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
        open={!!renameOf}
        onClose={() => setRenameOf(null)}
        title={t("devices.detail.children.renameTitle")}
        size={400}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="default" size="small" onClick={() => setRenameOf(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="primary" size="small" onClick={rename}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        {renameOf && (
          <Form.Item
            label={t("devices.detail.children.nodeName")}
            required
            layout="horizontal"
            labelCol={{ flex: "120px" }}
            wrapperCol={{ flex: 1 }}
            className="mb-3"
          >
            <Input
              autoFocus
              value={renameOf.name}
              onChange={(e) => setRenameOf({ ...renameOf, name: e.target.value })}
            />
          </Form.Item>
        )}
      </Drawer>

      {deviceId && selectedNodeId && (
        <AddChildrenDrawer
          open={addOpen}
          parentId={deviceId}
          treeNodeId={selectedNodeId}
          onClose={() => setAddOpen(false)}
          onSaved={() => void loadChildren()}
        />
      )}

      {confirmNode}
    </div>
  );
}
