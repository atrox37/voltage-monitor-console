import type { UserInfo } from "@/types";

const STORAGE_KEY = "voltage-auth";

export interface AuthSnapshot {
  token: string;
  userInfo: UserInfo | null;
}

function readStorage(): AuthSnapshot {
  if (typeof window === "undefined") {
    return { token: "", userInfo: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: "", userInfo: null };
    const parsed = JSON.parse(raw) as Partial<AuthSnapshot>;
    return {
      token: parsed.token ?? "",
      userInfo: parsed.userInfo ?? null,
    };
  } catch {
    return { token: "", userInfo: null };
  }
}

let snapshot: AuthSnapshot = readStorage();
const listeners = new Set<() => void>();

/** SSR / hydration 固定快照（必须缓存同一引用，避免 useSyncExternalStore 死循环） */
const SERVER_AUTH_SNAPSHOT: AuthSnapshot = { token: "", userInfo: null };

function emit() {
  listeners.forEach((listener) => listener());
}

export function persistAuth(next: AuthSnapshot): void {
  snapshot = next;
  if (typeof window !== "undefined") {
    if (next.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  emit();
}

export const subscribeAuth = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAuthSnapshot = (): AuthSnapshot => snapshot;

/** SSR / hydration 初始快照，避免服务端与客户端 localStorage 不一致 */
export const getServerAuthSnapshot = (): AuthSnapshot => SERVER_AUTH_SNAPSHOT;

export function getAuthToken(): string {
  return snapshot.token;
}

export function isLoggedIn(): boolean {
  return !!snapshot.token;
}

export function hydrateAuthSession(): void {
  snapshot = readStorage();
}

export function getDisplayName(): string {
  return snapshot.userInfo?.username ?? snapshot.userInfo?.account ?? "admin";
}
