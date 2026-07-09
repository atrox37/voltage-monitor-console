import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { getLocale, translate } from "@/i18n";
import { getApiMessage, showError } from "@/lib/api-message";
import { getAuthToken } from "@/lib/auth-token";
import type { ApiResponse } from "@/types";

const NO_AUTH_URLS = ["/api/sys-app/login", "/api/sys-app/common/captcha64"];
const REFRESH_URL = "/api/sys-app/token/refresh";

class RequestService {
  private instance: AxiosInstance;
  private pendingRequests = new Map<string, AbortController>();
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: "",
      timeout: 30000,
    });
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private getRequestKey(config: AxiosRequestConfig): string {
    return `${config.method?.toUpperCase() ?? "GET"}:${config.url ?? ""}`;
  }

  private addPendingRequest(config: InternalAxiosRequestConfig): void {
    const key = this.getRequestKey(config);
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.get(key)!.abort();
      this.pendingRequests.delete(key);
    }
    const controller = new AbortController();
    config.signal = controller.signal;
    this.pendingRequests.set(key, controller);
  }

  private removePendingRequest(config: AxiosRequestConfig): void {
    this.pendingRequests.delete(this.getRequestKey(config));
  }

  cancelAll(): void {
    this.pendingRequests.forEach((controller) => controller.abort());
    this.pendingRequests.clear();
  }

  private subscribeTokenRefresh(cb: (token: string) => void): void {
    this.refreshSubscribers.push(cb);
  }

  private onTokenRefreshed(token: string): void {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private onRefreshFailed(): void {
    this.refreshSubscribers = [];
  }

  private setupRequestInterceptor(): void {
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        this.addPendingRequest(config);
        config.headers = config.headers ?? {};

        if (config.url && NO_AUTH_URLS.includes(config.url)) {
          config.headers.LOGINTYPE = "PASS";
          return config;
        }

        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = token;
        }

        return config;
      },
      (error: unknown) => Promise.reject(error),
    );
  }

  private setupResponseInterceptor(): void {
    this.instance.interceptors.response.use(
      (response) => {
        this.removePendingRequest(response.config);
        const data = response.data as ApiResponse<unknown>;

        if (data.code !== 200) {
          const errMsg = data.msg || data.message || translate(getLocale(), "common.requestFailed");
          showError(errMsg);
          return Promise.reject(new Error(errMsg));
        }

        return data.data as never;
      },
      async (error: unknown) => {
        if (axios.isCancel(error)) {
          return Promise.reject(error);
        }

        const axiosError = error as {
          config?: AxiosRequestConfig & {
            url?: string;
            headers?: Record<string, string>;
            signal?: AbortSignal;
          };
          response?: { status: number };
          code?: string;
          message?: string;
        };

        if (axiosError.config) {
          this.removePendingRequest(axiosError.config);
        }

        const status = axiosError.response?.status;

        if (axiosError.code === "ECONNABORTED" || axiosError.message?.includes("timeout")) {
          showError(getApiMessage(null, translate(getLocale(), "common.requestTimeout")));
          return Promise.reject(error);
        }

        if (status === 401) {
          const isRefreshEndpoint = axiosError.config?.url === REFRESH_URL;

          if (isRefreshEndpoint) {
            await this.handleAuthFailure();
            return Promise.reject(error);
          }

          if (!this.isRefreshing) {
            this.isRefreshing = true;
            try {
              await this.handleAuthFailure();
              return Promise.reject(error);
            } finally {
              this.isRefreshing = false;
              this.onRefreshFailed();
            }
          }

          return new Promise((resolve, reject) => {
            this.subscribeTokenRefresh((token: string) => {
              resolve(this.retryRequest(axiosError.config, token));
            });
            const prevOnRefreshFailed = this.onRefreshFailed.bind(this);
            this.onRefreshFailed = () => {
              prevOnRefreshFailed();
              reject(error);
              this.onRefreshFailed = prevOnRefreshFailed;
            };
          });
        }

        if (status === 403) showError(translate(getLocale(), "common.forbidden"));
        else if (status === 404) showError(translate(getLocale(), "common.resourceNotFound"));
        else if (status === 500) showError(translate(getLocale(), "common.serverError"));

        return Promise.reject(error);
      },
    );
  }

  private async handleAuthFailure(): Promise<void> {
    const { authActions } = await import("@/lib/auth-session");
    authActions.clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }

  private retryRequest(
    config:
      | (AxiosRequestConfig & {
          url?: string;
          headers?: Record<string, string>;
          signal?: AbortSignal;
        })
      | undefined,
    token: string,
  ): Promise<unknown> {
    if (!config) return Promise.reject(new Error("No config to retry"));
    config.headers = config.headers ?? {};
    config.headers.Authorization = token;
    delete config.signal;
    return this.instance(config);
  }

  request<T>(config: AxiosRequestConfig): Promise<T> {
    return this.instance(config) as unknown as Promise<T>;
  }

  get<T>(url: string, params?: unknown): Promise<T> {
    return this.request<T>({ method: "GET", url, params });
  }

  post<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: "POST", url, data });
  }

  put<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: "PUT", url, data });
  }

  delete<T>(url: string, params?: unknown): Promise<T> {
    return this.request<T>({ method: "DELETE", url, params });
  }

  patch<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: "PATCH", url, data });
  }

  upload<T>(url: string, formData: FormData): Promise<T> {
    return this.request<T>({
      method: "POST",
      url,
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
}

const requestService = new RequestService();

export const cancelAllPendingRequests = (): void => requestService.cancelAll();

export function isRequestCanceled(err: unknown): boolean {
  return axios.isCancel(err);
}

export class Request {
  static get<T>(url: string, params?: unknown): Promise<T> {
    return requestService.get<T>(url, params);
  }

  static post<T>(url: string, data?: unknown): Promise<T> {
    return requestService.post<T>(url, data);
  }

  static put<T>(url: string, data?: unknown): Promise<T> {
    return requestService.put<T>(url, data);
  }

  static delete<T>(url: string, params?: unknown): Promise<T> {
    return requestService.delete<T>(url, params);
  }

  static patch<T>(url: string, data?: unknown): Promise<T> {
    return requestService.patch<T>(url, data);
  }

  static upload<T>(url: string, formData: FormData): Promise<T> {
    return requestService.upload<T>(url, formData);
  }
}
