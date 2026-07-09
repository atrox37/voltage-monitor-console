import { useSyncExternalStore } from "react";
import { login as loginApi, logout as logoutApi } from "@/api/auth";
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

async function disconnectRealtime() {
  const stompManager = (await import("@/lib/stomp")).default;
  await stompManager.disconnect();
}

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
    displayName: state.userInfo?.username ?? state.userInfo?.account ?? "",
  };
}

export const authActions = {
  async login(params: LoginParams): Promise<void> {
    const CryptoJS = (await import("crypto-js")).default;
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
      // Ignore logout API failures and still clear local session state.
    } finally {
      const { cancelAllPendingRequests } = await import("@/lib/request");
      cancelAllPendingRequests();
      await disconnectRealtime();
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
      // Some backend versions do not expose this endpoint.
    }
  },

  clearSession(): void {
    persistAuth({ token: "", userInfo: null });
    void (async () => {
      const { cancelAllPendingRequests } = await import("@/lib/request");
      cancelAllPendingRequests();
      await disconnectRealtime();
    })();
  },
};
