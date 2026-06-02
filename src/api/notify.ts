import { Request } from "@/lib/request";
import { API } from "@/types";
import type {
  PageQuery,
  PageResult,
  QueryParam,
  SaveResult,
  NotifyConfigPo,
  NotifyConfigPageDto,
  NotifySupportItem,
  NotifyTemplatePo,
  NotifyTemplatePageDto,
  NotifyTemplateSendTestRequest,
} from "@/types";
import { apiPath } from "./paths";
import { unwrapSearchOne } from "./utils";

/** POST /notify-app/notify-config/_page */
export function pageNotifyConfigs(params: PageQuery): Promise<PageResult<NotifyConfigPageDto>> {
  return Request.post<PageResult<NotifyConfigPageDto>>(apiPath(API.notify.configPage), params);
}

/** GET /notify-app/notify-config/support */
export function getNotifySupport(): Promise<NotifySupportItem[]> {
  return Request.get<NotifySupportItem[]>(apiPath(API.notify.configSupport), {});
}

/** POST /notify-app/notify-config/_search_one */
export async function searchNotifyConfigOne(params: QueryParam): Promise<NotifyConfigPo | null> {
  const res = await Request.post<
    NotifyConfigPo | { records?: NotifyConfigPo[]; data?: NotifyConfigPo[] }
  >(apiPath(API.notify.configSearchOne), params);
  return unwrapSearchOne(res);
}

/** POST /notify-app/notify-config/_save_or_update */
export function saveNotifyConfig(data: Partial<NotifyConfigPo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.notify.configSave), data);
}

/** GET /notify-app/notify-config/_delete */
export function deleteNotifyConfig(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.notify.configDelete), { id });
}

/** POST /notify-app/notify-template/_page */
export function pageNotifyTemplates(params: PageQuery): Promise<PageResult<NotifyTemplatePageDto>> {
  return Request.post<PageResult<NotifyTemplatePageDto>>(apiPath(API.notify.templatePage), params);
}

/** POST /notify-app/notify-template/_search_one */
export async function searchNotifyTemplateOne(params: QueryParam): Promise<NotifyTemplatePageDto | null> {
  const res = await Request.post<
    NotifyTemplatePageDto | { records?: NotifyTemplatePageDto[]; data?: NotifyTemplatePageDto[] }
  >(apiPath(API.notify.templateSearchOne), params);
  return unwrapSearchOne(res);
}

/** POST /notify-app/notify-template/_save_or_update */
export function saveNotifyTemplate(data: Partial<NotifyTemplatePo>): Promise<SaveResult> {
  return Request.post<SaveResult>(apiPath(API.notify.templateSave), data);
}

/** GET /notify-app/notify-template/_delete */
export function deleteNotifyTemplate(id: number | string): Promise<SaveResult> {
  return Request.get<SaveResult>(apiPath(API.notify.templateDelete), { id });
}

/** POST /notify-app/notify-template/send_test */
export function sendNotifyTemplateTest(data: NotifyTemplateSendTestRequest): Promise<unknown> {
  return Request.post<unknown>(apiPath(API.notify.templateSendTest), data);
}
