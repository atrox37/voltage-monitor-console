import type {
  DeviceProductDetailDto,
  DeviceProductPageDto,
  DeviceProductPo,
  ProductType,
  SimpleMetadata,
} from "@/types";
import { toDbId } from "@/lib/query-terms";

export type { ProductType };

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  gateway: "网关设备",
  device: "直连设备",
  children: "子设备",
};

export const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "gateway", label: PRODUCT_TYPE_LABEL.gateway },
  { value: "device", label: PRODUCT_TYPE_LABEL.device },
  { value: "children", label: PRODUCT_TYPE_LABEL.children },
];

export type ProductListRow = {
  id: string;
  name: string;
  type: ProductType;
  creator: string;
  org: string;
  orgId: string;
  updateTime: string;
  raw: DeviceProductPageDto;
};

/** 详情页编辑模型 — 对齐旧项目 editData (productPo + 展示字段) */
export type ProductEditModel = {
  id: string;
  name: string;
  sn: string;
  type: ProductType;
  orgId: string;
  creator: string;
  org: string;
  updateTime: string;
  metadata: SimpleMetadata;
};

export type ProductCreateForm = {
  name: string;
  sn: string;
  type: ProductType;
};

export function blankProductMetadata(): SimpleMetadata {
  return {
    properties: [],
    functions: [],
    propertyTags: [],
    trees: [],
    rules: [],
    tags: [],
  };
}

export function mapProductDtoToRow(dto: DeviceProductPageDto): ProductListRow {
  const po = dto.productPo;
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    type: (po.type ?? "device") as ProductType,
    creator: dto.sysUserPo?.username ?? "—",
    org: dto.sysDimensionPo?.name ?? "—",
    orgId: String(po.orgId ?? ""),
    updateTime: po.updateTime ?? "—",
    raw: dto,
  };
}

export function mapDetailToEditModel(dto: DeviceProductDetailDto): ProductEditModel {
  const po = dto.productPo;
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    sn: po.sn ?? "",
    type: (po.type ?? "device") as ProductType,
    orgId: String(po.orgId ?? ""),
    creator: dto.sysUserPo?.username ?? "—",
    org: dto.sysDimensionPo?.name ?? "—",
    updateTime: po.updateTime ?? "—",
    metadata: {
      ...blankProductMetadata(),
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

export function mapCreateFormToPo(form: ProductCreateForm): Partial<DeviceProductPo> {
  return {
    name: form.name.trim(),
    sn: form.sn.trim(),
    type: form.type,
    metadata: blankProductMetadata(),
  };
}

export function mapEditToSavePayload(model: ProductEditModel): Partial<DeviceProductPo> {
  return {
    id: toDbId(model.id),
    name: model.name,
    sn: model.sn,
    orgId: model.orgId ? toDbId(model.orgId) : undefined,
    metadata: model.metadata,
  };
}
