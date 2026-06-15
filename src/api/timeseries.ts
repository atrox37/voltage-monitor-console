import { Request } from "@/lib/request";
import { API } from "@/types";
import type {
  DeviceAlarmLogRecord,
  DeviceFunctionLogRecord,
  DeviceLogRecord,
  DevicePropertyHistoryMap,
  DevicePropertyRecord,
  PageQuery,
  PageResult,
} from "@/types";
import { apiPath } from "./paths";

/** POST /register-app/timeseries/property/_page */
export function pageDevicePropertyData(
  params: PageQuery,
): Promise<PageResult<DevicePropertyRecord>> {
  return Request.post<PageResult<DevicePropertyRecord>>(apiPath(API.register.propertyPage), params);
}

/** GET /register-app/timeseries/property/history?id= */
export function getDevicePropertyHistory(
  deviceId: string | number,
): Promise<DevicePropertyHistoryMap> {
  return Request.get<DevicePropertyHistoryMap>(apiPath(API.register.propertyHistory), {
    id: deviceId,
  });
}

/** POST /register-app/timeseries/log/_page */
export function pageDeviceLogs(params: PageQuery): Promise<PageResult<DeviceLogRecord>> {
  return Request.post<PageResult<DeviceLogRecord>>(apiPath(API.register.logPage), params);
}

/** POST /register-app/timeseries/function/_page */
export function pageDeviceFunctionLogs(
  params: PageQuery,
): Promise<PageResult<DeviceFunctionLogRecord>> {
  return Request.post<PageResult<DeviceFunctionLogRecord>>(
    apiPath(API.register.functionPage),
    params,
  );
}

/** POST /register-app/timeseries/alarm/_page */
export function pageDeviceAlarmLogs(params: PageQuery): Promise<PageResult<DeviceAlarmLogRecord>> {
  return Request.post<PageResult<DeviceAlarmLogRecord>>(apiPath(API.register.alarmPage), params);
}
