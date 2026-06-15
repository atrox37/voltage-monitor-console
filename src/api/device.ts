import { Request } from "@/lib/request";
import { API } from "@/types";
import type {
  DeviceInstanceDetailDto,
  DeviceInstancePageDto,
  DeviceInstancePo,
  DeviceRuleDetailDto,
  DeviceRuleParseRequest,
  DeviceRuleUpdateRequest,
  DeviceSyncResult,
  PageQuery,
  PageResult,
  QueryParam,
  SaveResult,
} from "@/types";
import { apiPath } from "./paths";
import { unwrapSearchOne } from "./utils";

/** POST /iot-app/device/_page */
export function pageDevices(params: PageQuery): Promise<PageResult<DeviceInstancePageDto>> {
  return Request.post<PageResult<DeviceInstancePageDto>>(apiPath(API.iot.devicePage), params);
}

/** POST /iot-app/device/_search_one */
export async function searchDeviceOne(params: QueryParam): Promise<DeviceInstanceDetailDto | null> {
  const res = await Request.post<
    | DeviceInstanceDetailDto
    | { records?: DeviceInstanceDetailDto[]; data?: DeviceInstanceDetailDto[] }
  >(apiPath(API.iot.deviceSearchOne), params);
  return unwrapSearchOne(res);
}

/** POST /iot-app/device/_save_or_update */
export function saveDevice(data: Partial<DeviceInstancePo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.iot.deviceSave), data);
}

/** POST /iot-app/device/_save_or_update_batch — 绑定/解绑子设备 */
export function saveDevicesBatch(data: Partial<DeviceInstancePo>[]): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.iot.deviceSaveBatch), data);
}

/** GET /iot-app/device/_delete */
export function deleteDevice(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.iot.deviceDelete), { id });
}

/** GET /iot-app/device/_sync */
export function syncDeviceModel(id: number | string): Promise<DeviceSyncResult> {
  return Request.get<DeviceSyncResult>(apiPath(API.iot.deviceSync), { id });
}

/** POST /iot-app/device/_rule_parse */
export function parseDeviceRule(data: DeviceRuleParseRequest): Promise<DeviceRuleDetailDto> {
  return Request.post<DeviceRuleDetailDto>(apiPath(API.iot.deviceRuleParse), data);
}

/** POST /iot-app/device/_rule_update */
export function updateDeviceRule(data: DeviceRuleUpdateRequest): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.iot.deviceRuleUpdate), data);
}
