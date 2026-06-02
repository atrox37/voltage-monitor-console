import { Request } from "@/lib/request";
import { API } from "@/types";
import type {
  PageQuery,
  PageResult,
  SaveResult,
  DeviceProtocolPo,
  DeviceProtocolPageDto,
  ProtocolUploadResponse,
} from "@/types";
import { apiPath } from "./paths";

/** POST /iot-app/protocol/_page */
export function pageProtocols(params: PageQuery): Promise<PageResult<DeviceProtocolPageDto>> {
  return Request.post<PageResult<DeviceProtocolPageDto>>(apiPath(API.iot.protocolPage), params);
}

/** POST /iot-app/protocol/_upload */
export function uploadProtocol(formData: FormData): Promise<ProtocolUploadResponse> {
  return Request.upload<ProtocolUploadResponse>(apiPath(API.iot.protocolUpload), formData);
}

/** POST /iot-app/protocol/_save_or_update */
export function saveProtocol(data: Partial<DeviceProtocolPo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.iot.protocolSave), data);
}

/** GET /iot-app/protocol/_reload */
export function reloadProtocol(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.iot.protocolReload), { id });
}

/** GET /iot-app/protocol/_delete */
export function deleteProtocol(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.iot.protocolDelete), { id });
}

/** POST /iot-app/protocol/_test */
export function testProtocol(data: Record<string, unknown>): Promise<unknown> {
  return Request.post<unknown>(apiPath(API.iot.protocolTest), data);
}
