/**
 * 国际化使用说明
 *
 * 1. 在 `locales/zh-CN.ts` 与 `locales/en-US.ts` 中同步添加文案 key
 * 2. 页面/组件内：`const { t, locale, setLocale } = useTranslation()`
 * 3. 导航菜单：在 `nav-config.ts` 使用 labelKey，通过 `useNavGroups()` 获取翻译后的 label
 * 4. 带参数：`t("common.total", { count: 10 })`
 */

import { useCallback, useSyncExternalStore } from "react";
import { messages } from "./locales";
import type { Locale, TranslationDict } from "./types";

export type { Locale, NavSearchItem, TranslationDict } from "./types";

const STORAGE_KEY = "voltage-locale";
const DEFAULT_LOCALE: Locale = "zh-CN";
const SERVER_LOCALE: Locale = DEFAULT_LOCALE;

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "en-US" || raw === "zh-CN" ? raw : DEFAULT_LOCALE;
}

let locale: Locale = readStoredLocale();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getLocale(): Locale {
  return locale;
}

export function getServerLocale(): Locale {
  return SERVER_LOCALE;
}

export function hydrateLocale(): void {
  locale = readStoredLocale();
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale === "zh-CN" ? "zh-CN" : "en";
  }
}

export function setLocale(next: Locale): void {
  if (locale === next) return;
  locale = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "zh-CN" ? "zh-CN" : "en";
  }
  emit();
}

const subscribeLocale = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function resolvePath(dict: TranslationDict, path: string): string | undefined {
  const parts = path.split(".");
  let cur: string | TranslationDict = dict;
  for (const p of parts) {
    if (typeof cur !== "object" || cur === null || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(
  loc: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw = resolvePath(messages[loc], key) ?? resolvePath(messages[DEFAULT_LOCALE], key) ?? key;
  if (!params) return raw;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    raw,
  );
}

export function useTranslation() {
  const loc = useSyncExternalStore(subscribeLocale, getLocale, getServerLocale);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(loc, key, params),
    [loc],
  );

  return { t, locale: loc, setLocale };
}
