import { Request } from "@/lib/request";
import { API } from "@/types";
import type { PageQuery, PageResult, SaveResult, DeviceGatewayPo, GatewayDto } from "@/types";
import { apiPath } from "./paths";

/** POST /iot-app/gateway/_page */
export function pageGateways(params: PageQuery): Promise<PageResult<GatewayDto>> {
  return Request.post<PageResult<GatewayDto>>(apiPath(API.iot.gatewayPage), params);
}

/** POST /iot-app/gateway/_save_or_update */
export function saveGateway(data: Partial<DeviceGatewayPo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.iot.gatewaySave), data);
}

/** GET /iot-app/gateway/_delete */
export function deleteGateway(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.iot.gatewayDelete), { id });
}
