import { getMenuTree } from "@/api/sys";
import { isRequestCanceled } from "@/lib/request";
import type { SysMenuPo } from "@/types";

type MenuListener = () => void;

export type MenuSnapshot = {
  tree: SysMenuPo[];
  loaded: boolean;
  loading: boolean;
};

let menuTree: SysMenuPo[] = [];
let loaded = false;
let loading = false;
let inflight: Promise<SysMenuPo[]> | null = null;

/** useSyncExternalStore 要求 getSnapshot 返回稳定引用，仅在数据变更时更新 */
let snapshot: MenuSnapshot = { tree: menuTree, loaded, loading };

const listeners = new Set<MenuListener>();

function syncSnapshot(): void {
  snapshot = { tree: menuTree, loaded, loading };
}

function emit(): void {
  syncSnapshot();
  listeners.forEach((l) => l());
}

export function getMenuSnapshot(): MenuSnapshot {
  return snapshot;
}

export function subscribeMenu(listener: MenuListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearMenuSession(): void {
  menuTree = [];
  loaded = false;
  loading = false;
  inflight = null;
  emit();
}

/** 登录后 / 刷新已登录 — 拉取侧边栏菜单（对齐旧项目 menuApi） */
export async function loadAppMenu(force = false): Promise<SysMenuPo[]> {
  if (inflight && !force) return inflight;
  if (loaded && !force) return menuTree;

  loading = true;
  emit();
  inflight = (async () => {
    try {
      const data = await getMenuTree();
      menuTree = Array.isArray(data) ? data : [];
      loaded = true;
      return menuTree;
    } catch (err) {
      if (!isRequestCanceled(err)) {
        menuTree = [];
        loaded = true;
      }
      return menuTree;
    } finally {
      loading = false;
      inflight = null;
      emit();
    }
  })();

  return inflight;
}
