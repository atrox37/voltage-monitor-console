import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftOutlined, SaveOutlined, SyncOutlined } from "@ant-design/icons";
import { Button, Spin, Tabs, Tag } from "antd";
import { useProductEdit } from "@/features/products/contexts/product-edit-context";
import { PRODUCT_TYPE_LABEL } from "@/features/products/lib/product-mappers";
import { TabInfo } from "./tabs/info-tab";
import { TabMeta } from "./tabs/meta-tab";
import { TabTree } from "./tabs/tree-tab";
import { TabRule } from "./tabs/rule-tab";
import type { ProductDetailTabKey } from "./types";

type TabKey = ProductDetailTabKey;

export function ProductDetailView() {
  const navigate = useNavigate();
  const { product, loading, saving, syncing, save, syncEdge } = useProductEdit();
  const [tab, setTab] = useState<TabKey>("info");

  if (loading) {
    return (
      <main className="vt-page-content vt-page-fill">
        <div className="vt-glass flex flex-1 items-center justify-center">
          <Spin description="加载中…" />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="vt-page-content vt-page-fill">
        <div className="vt-glass flex flex-1 items-center justify-center text-sm text-text-muted">
          产品不存在或已被删除。
          <Link to="/devices/products" className="ml-2 text-primary hover:underline">
            返回列表
          </Link>
        </div>
      </main>
    );
  }

  const tabs: { key: TabKey; label: string; hidden?: boolean }[] = [
    { key: "info", label: "基础信息" },
    { key: "meta", label: "物模型" },
    { key: "tree", label: "网关分路", hidden: product.type !== "gateway" },
    { key: "rule", label: "告警规则" },
  ];
  const visible = tabs.filter((t) => !t.hidden);

  const typeColor =
    product.type === "gateway" ? "processing" : product.type === "device" ? "success" : "warning";

  return (
    <main className="vt-page-content vt-page-fill flex flex-col gap-2 !overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate({ to: "/devices/products" })}
          >
            返回
          </Button>
          <h2 className="vt-section-title text-base">{product.name}</h2>
          <Tag color={typeColor}>{PRODUCT_TYPE_LABEL[product.type]}</Tag>
          <span className="text-[11px] text-text-muted">ID</span>
          <span className="text-xs text-text-secondary">{product.id}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="small"
            icon={<SyncOutlined spin={syncing} />}
            disabled={syncing}
            onClick={() => void syncEdge()}
          >
            边缘同步
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            disabled={saving}
            loading={saving}
            onClick={() => void save()}
          >
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        size="small"
        className="vt-detail-tabs min-h-0 flex-1"
        items={visible.map((tabItem) => ({
          key: tabItem.key,
          label: tabItem.label,
          children: (
            <div className="vt-glass flex h-full min-h-0 flex-col overflow-hidden p-5">
              {tabItem.key === "info" && <TabInfo />}
              {tabItem.key === "meta" && <TabMeta />}
              {tabItem.key === "tree" && <TabTree />}
              {tabItem.key === "rule" && <TabRule />}
            </div>
          ),
        }))}
      />
    </main>
  );
}
