import { Request } from "@/lib/request";
import { API } from "@/types";
import type {
  DeviceProductDetailDto,
  DeviceProductPageDto,
  DeviceProductPo,
  DeviceSyncResult,
  PageQuery,
  PageResult,
  ProductRuleSerializeRequest,
  QueryParam,
  RuleModel,
  SaveResult,
  JSqlColumn,
} from "@/types";
import { apiPath } from "./paths";
import { unwrapSearchOne } from "./utils";

/** POST /iot-app/product/_page */
export function pageProducts(params: PageQuery): Promise<PageResult<DeviceProductPageDto>> {
  return Request.post<PageResult<DeviceProductPageDto>>(apiPath(API.iot.productPage), params);
}

/** POST /iot-app/product/_search_one */
export async function searchProductOne(params: QueryParam): Promise<DeviceProductDetailDto | null> {
  const res = await Request.post<
    DeviceProductDetailDto | { records?: DeviceProductDetailDto[]; data?: DeviceProductDetailDto[] }
  >(apiPath(API.iot.productSearchOne), params);
  return unwrapSearchOne(res);
}

/** POST /iot-app/product/_save_or_update */
export function saveProduct(data: Partial<DeviceProductPo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.iot.productSave), data);
}

/** GET /iot-app/product/_delete */
export function deleteProduct(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.iot.productDelete), { id });
}

/** POST /iot-app/product/_parse */
export function parseProductRule(data: {
  sql?: string;
  param?: Record<string, unknown[]>;
}): Promise<JSqlColumn[][]> {
  return Request.post<JSqlColumn[][]>(apiPath(API.iot.productParse), data);
}

/** GET /iot-app/configuration/unit */
export function getConfigurationUnits(): Promise<unknown> {
  return Request.get<unknown>(apiPath(API.iot.unit), {});
}

/** POST /iot-app/product/_serialize */
export function serializeProductRule(data: ProductRuleSerializeRequest): Promise<RuleModel> {
  return Request.post<RuleModel>(apiPath(API.iot.productSerialize), data);
}

/** GET /user-app/product/_synchronous */
export function syncProductEdge(id: number | string): Promise<DeviceSyncResult> {
  return Request.get<DeviceSyncResult>(apiPath(API.user.productSync), { id });
}
