import { useCallback, useEffect, useState } from "react";
import { Drawer, Pagination, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { createCredential, deleteCredentialBatch, pageCredentials } from "@/api/sys";
import { drawerFooter } from "@/components/drawer-form";
import { VtButton } from "@/components/vt-button";
import { showError, showSuccess } from "@/lib/api-message";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { termEq, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { useTranslation } from "@/i18n";
import { useConfirm } from "@/components/confirm-dialog";
import { DateTimeText } from "@/components/datetime-text";
import type { SysCredentialPo } from "@/types";

type CredentialDrawerProps = {
  open: boolean;
  userId: string | number | null;
  onClose: () => void;
};

export function CredentialDrawer({ open, userId, onClose }: CredentialDrawerProps) {
  const { t } = useTranslation();
  const { confirm, confirmNode } = useConfirm();
  const [rows, setRows] = useState<SysCredentialPo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);
  const [creating, setCreating] = useState(false);
  const pageSize = DEFAULT_PAGE_SIZE;

  const fetchCredentials = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await pageCredentials({
        current: page,
        size: pageSize,
        terms: [termEq("creator_id", toDbId(userId))],
      });
      const list = result.records ?? result.data ?? [];
      setRows(list);
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      showError(err instanceof Error ? err.message : t("credential.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, t, userId]);

  useEffect(() => {
    if (open && userId) {
      setPage(1);
      setSelectedIds([]);
    }
  }, [open, userId]);

  useEffect(() => {
    if (open && userId) void fetchCredentials();
  }, [fetchCredentials, open, userId]);

  const handleCreate = async () => {
    if (!userId) return;
    setCreating(true);
    try {
      await createCredential({ creatorId: toDbId(userId) });
      showSuccess(t("common.createSuccess"));
      setPage(1);
      await fetchCredentials();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("credential.createFailed"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    confirm({
      title: t("common.warning"),
      description: t("credential.deleteConfirm"),
      confirmText: t("common.delete"),
      danger: true,
      onConfirm: () => {
        void (async () => {
          try {
            await deleteCredentialBatch(selectedIds);
            showSuccess(t("common.deleteSuccess"));
            setSelectedIds([]);
            await fetchCredentials();
          } catch (err) {
            if (isRequestCanceled(err)) return;
            showError(err instanceof Error ? err.message : t("credential.deleteFailed"));
          }
        })();
      },
    });
  };

  const columns: ColumnsType<SysCredentialPo> = [
    {
      key: "accessKeyId",
      title: t("credential.accessKeyId"),
      dataIndex: "accessKeyId",
      ellipsis: true,
    },
    {
      key: "secretKey",
      title: t("credential.secretKey"),
      dataIndex: "secretKey",
      ellipsis: true,
    },
    {
      key: "createTime",
      title: t("credential.createTime"),
      dataIndex: "createTime",
      width: 180,
      render: (val) => <DateTimeText value={val} />,
    },
  ];

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={t("credential.title")}
        size="45%"
        destroyOnHidden
        styles={{ body: { paddingTop: 8, display: "flex", flexDirection: "column", gap: 12 } }}
        footer={drawerFooter([{ key: "close", label: t("common.close"), onClick: onClose }])}
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <VtButton
            type="primary"
            icon={<PlusOutlined />}
            loading={creating}
            onClick={() => void handleCreate()}
          >
            {t("credential.add")}
          </VtButton>
          <VtButton
            danger
            icon={<DeleteOutlined />}
            disabled={selectedIds.length === 0}
            onClick={handleDelete}
          >
            {t("common.delete")}
          </VtButton>
        </div>

        <div className="min-h-0 flex-1">
          <Table<SysCredentialPo>
            rowKey="id"
            size="middle"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as (number | string)[]),
            }}
            locale={{ emptyText: t("common.noData") }}
            scroll={{ x: "max-content" }}
          />
        </div>

        <div className="vt-table-pagination-bar shrink-0 border-t border-[var(--panel-border)] pt-2">
          <Pagination
            className="vt-ant-pagination"
            size="small"
            current={page}
            pageSize={pageSize}
            total={total}
            hideOnSinglePage={false}
            onChange={setPage}
          />
        </div>
      </Drawer>
      {confirmNode}
    </>
  );
}
