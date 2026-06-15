import { useSyncExternalStore, useMemo, useCallback } from "react";
import {
  buildMenuItemsFromTree,
  collectOpenKeysFromItems,
  getFirstMenuRoute,
  type AppMenuItem,
} from "@/lib/app-menu";
import { getMenuSnapshot, loadAppMenu, subscribeMenu } from "@/lib/menu-session";

export function useAppMenu() {
  const snap = useSyncExternalStore(subscribeMenu, getMenuSnapshot, getMenuSnapshot);

  const menuItems: AppMenuItem[] = useMemo(() => buildMenuItemsFromTree(snap.tree), [snap.tree]);

  const defaultRoute = useMemo(() => getFirstMenuRoute(snap.tree), [snap.tree]);

  const openKeysFor = useCallback(
    (selectedKey: string) => collectOpenKeysFromItems(menuItems, selectedKey),
    [menuItems],
  );

  return {
    tree: snap.tree,
    menuItems,
    defaultRoute,
    loaded: snap.loaded,
    loading: snap.loading,
    reload: () => loadAppMenu(true),
    openKeysFor,
  };
}
