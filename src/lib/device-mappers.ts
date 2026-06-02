import type {
  DeviceInstanceDetailDto,
  DeviceInstancePageDto,
  DeviceInstancePo,
  ProductType,
} from "@/types";
import { blankProductMetadata } from "@/lib/product-mappers";
import { toDbId } from "@/lib/query-terms";
import type { SimpleMetadata, TagModel } from "@/types/api/metadata";

export type DeviceStatus = "online" | "offline" | "disabled";

export type DeviceListRow = {
  id: string;
  name: string;
  sn: string;
  productId: string;
  productName: string;
  productType: ProductType;
  gatewayId?: string;
  gatewayName?: string;
  org: string;
  orgId: string;
  creator: string;
  status: DeviceStatus;
  statusTime: string;
  createTime: string;
  updateTime: string;
  raw: DeviceInstancePageDto;
};

export type DeviceEditModel = {
  id: string;
  name: string;
  sn: string;
  orgId: string;
  org: string;
  creator: string;
  productId: string;
  productName: string;
  productType: ProductType;
  gatewayId?: string;
  gatewayName?: string;
  parentId?: string;
  networkType?: string;
  status: DeviceStatus;
  statusTime: string;
  createTime: string;
  updateTime: string;
  metadata: SimpleMetadata;
};

export type DeviceCreateForm = {
  name: string;
  sn: string;
  productId: string;
  gatewayId: string;
};

function mapDeviceStatus(raw: string | undefined): DeviceStatus {
  if (raw === "online") return "online";
  if (raw === "disabled") return "disabled";
  return "offline";
}

function blankDeviceMetadata(): SimpleMetadata {
  return blankProductMetadata();
}

export function mapDeviceDtoToRow(dto: DeviceInstancePageDto): DeviceListRow {
  const po = dto.deviceInstancePo;
  const product = dto.productPo;
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    sn: po.sn ?? "",
    productId: String(po.productId ?? product?.id ?? ""),
    productName: product?.name ?? "—",
    productType: (product?.type ?? "device") as ProductType,
    gatewayId: po.gatewayId != null ? String(po.gatewayId) : undefined,
    gatewayName: dto.gatewayPo?.name,
    org: dto.sysDimensionPo?.name ?? "—",
    orgId: String(po.orgId ?? ""),
    creator: dto.sysUserPo?.username ?? "—",
    status: mapDeviceStatus(po.status),
    statusTime: po.statusTime ?? "—",
    createTime: po.createTime ?? "—",
    updateTime: po.updateTime ?? "—",
    raw: dto,
  };
}

export function mapDetailToDeviceEditModel(dto: DeviceInstanceDetailDto): DeviceEditModel {
  const po = dto.deviceInstancePo;
  const product = dto.productPo;
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    sn: po.sn ?? "",
    orgId: String(po.orgId ?? ""),
    org: dto.sysDimensionPo?.name ?? "—",
    creator: dto.sysUserPo?.username ?? "—",
    productId: String(po.productId ?? product?.id ?? ""),
    productName: product?.name ?? "—",
    productType: (product?.type ?? "device") as ProductType,
    gatewayId: po.gatewayId != null ? String(po.gatewayId) : undefined,
    gatewayName: dto.gatewayPo?.name,
    parentId: po.parentId != null ? String(po.parentId) : undefined,
    networkType: dto.networkConfigPo?.type,
    status: mapDeviceStatus(po.status),
    statusTime: po.statusTime ?? "—",
    createTime: po.createTime ?? "—",
    updateTime: po.updateTime ?? "—",
    metadata: {
      ...blankDeviceMetadata(),
      ...(po.metadata ?? {}),
      properties: po.metadata?.properties ?? [],
      functions: po.metadata?.functions ?? [],
      propertyTags: po.metadata?.propertyTags ?? [],
      trees: po.metadata?.trees ?? [],
      rules: po.metadata?.rules ?? [],
      tags: po.metadata?.tags ?? [],
    },
  };
}

export function mapCreateFormToDevicePo(form: DeviceCreateForm): Partial<DeviceInstancePo> {
  return {
    name: form.name.trim(),
    sn: form.sn.trim(),
    productId: toDbId(form.productId),
    gatewayId: form.gatewayId ? toDbId(form.gatewayId) : undefined,
    metadata: blankDeviceMetadata(),
  };
}

export function mapDeviceEditToSavePayload(model: DeviceEditModel): Partial<DeviceInstancePo> {
  return {
    id: toDbId(model.id),
    name: model.name,
    sn: model.sn,
    orgId: model.orgId ? toDbId(model.orgId) : undefined,
    gatewayId: model.gatewayId ? toDbId(model.gatewayId) : undefined,
    parentId: model.parentId ? toDbId(model.parentId) : undefined,
    metadata: model.metadata,
  };
}

/** 设备标签 — 从 metadata.tags 读取 */
export function deviceTags(metadata: SimpleMetadata): TagModel[] {
  return metadata.tags ?? [];
}
