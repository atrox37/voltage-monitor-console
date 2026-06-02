import { Request } from "@/lib/request";
import { API } from "@/types";
import type {
  PageQuery,
  PageResult,
  SaveResult,
  NetworkConfigPo,
  NetworkVO,
  NetworkFileUploadResponse,
} from "@/types";
import { apiPath } from "./paths";

/** POST /iot-app/network/_page */
export function pageNetworks(params: PageQuery): Promise<PageResult<NetworkVO>> {
  return Request.post<PageResult<NetworkVO>>(apiPath(API.iot.networkPage), params);
}

/** POST /iot-app/network/_save_or_update */
export function saveNetwork(data: Partial<NetworkConfigPo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.iot.networkSave), data);
}

/** GET /iot-app/network/_delete */
export function deleteNetwork(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.iot.networkDelete), { id });
}

/** POST /iot-app/network/_upload */
export function uploadNetworkFile(formData: FormData): Promise<NetworkFileUploadResponse> {
  return Request.upload<NetworkFileUploadResponse>(apiPath(API.iot.networkUpload), formData);
}
