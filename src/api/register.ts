import { Request } from "@/lib/request";
import { API } from "@/types";
import type { PageQuery, PageResult, BoardLogRecord } from "@/types";
import { apiPath } from "./paths";

/** POST /register-app/timeseries/board/_page */
export function pageBoardLogs(params: PageQuery): Promise<PageResult<BoardLogRecord>> {
  return Request.post<PageResult<BoardLogRecord>>(apiPath(API.register.boardPage), params);
}
