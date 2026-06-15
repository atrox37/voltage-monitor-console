import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { hydrateAuthSession, isLoggedIn } from "@/lib/auth-session";
import { loadAppMenu } from "@/lib/menu-session";
import { hydrateLocale } from "@/i18n";
import { getRouter } from "@/router";
import "./styles/index.css";

hydrateAuthSession();
hydrateLocale();
if (isLoggedIn()) {
  void loadAppMenu();
}

const router = getRouter();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
