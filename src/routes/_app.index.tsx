import { createFileRoute, redirect } from "@tanstack/react-router";
import { getFirstMenuRoute } from "@/lib/app-menu";
import { getMenuSnapshot, loadAppMenu } from "@/lib/menu-session";

export const Route = createFileRoute("/_app/")({
  beforeLoad: async () => {
    const snap = getMenuSnapshot();
    if (!snap.loaded) {
      await loadAppMenu();
    }
    const { tree } = getMenuSnapshot();
    throw redirect({ to: getFirstMenuRoute(tree) });
  },
});
