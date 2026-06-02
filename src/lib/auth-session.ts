import { useSyncExternalStore } from "react";
import CryptoJS from "crypto-js";
import { login as loginApi, logout as logoutApi } from "@/api/auth";
import stompManager from "@/lib/stomp";
import {
  getAuthSnapshot,
  getServerAuthSnapshot,
  hydrateAuthSession,
  isLoggedIn,
  persistAuth,
  subscribeAuth,
} from "@/lib/auth-token";
import type { LoginParams, UserInfo } from "@/types";

export {
  getAuthToken,
  hydrateAuthSession,
  isLoggedIn,
  getDisplayName,
} from "@/lib/auth-token";

export function useAuth() {
  const state = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  return {
    token: state.token,
    userInfo: state.userInfo,
    isLoggedIn: !!state.token,
    displayName: state.userInfo?.username ?? state.userInfo?.account ?? "—",
  };
}

export const authActions = {
  async login(params: LoginParams): Promise<void> {
    const encryptedPassword = CryptoJS.MD5(params.password).toString();
    const res = await loginApi({
      account: params.account,
      password: encryptedPassword,
      captcha: params.captcha,
    });

    const userInfo: UserInfo = res.user
      ? {
          ...(res.user as UserInfo),
          username: res.user.username ?? params.account,
          account: params.account,
        }
      : { username: params.account, account: params.account };

    persistAuth({ token: res.token, userInfo });
  },

  async logout(): Promise<void> {
    try {
      await logoutApi();
    } catch {
      // 忽略登出接口错误，仍清理本地状态
    } finally {
      const { cancelAllPendingRequests } = await import("@/lib/request");
      cancelAllPendingRequests();
      await stompManager.disconnect();
      persistAuth({ token: "", userInfo: null });
    }
  },

  async getUserInfo(): Promise<void> {
    try {
      const { Request } = await import("@/lib/request");
      const res = await Request.get<UserInfo>("/api/sys-app/user/info");
      const current = getAuthSnapshot();
      persistAuth({
        token: current.token,
        userInfo: { ...current.userInfo, ...res },
      });
    } catch {
      // 部分后端版本无此接口
    }
  },

  clearSession(): void {
    void (async () => {
      const { cancelAllPendingRequests } = await import("@/lib/request");
      cancelAllPendingRequests();
      await stompManager.disconnect();
      persistAuth({ token: "", userInfo: null });
    })();
  },
};
