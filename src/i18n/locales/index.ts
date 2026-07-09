import type { Locale, TranslationDict } from "../types";
import zhCN from "./zh-CN";

const localeMessages: Partial<Record<Locale, TranslationDict>> = {
  "zh-CN": zhCN,
};

const localeLoaders: Record<Locale, () => Promise<TranslationDict>> = {
  "zh-CN": async () => zhCN,
  "en-US": async () => (await import("./en-US")).default,
};

export function getMessages(locale: Locale): TranslationDict | undefined {
  return localeMessages[locale];
}

export async function ensureMessages(locale: Locale): Promise<TranslationDict> {
  const cached = localeMessages[locale];
  if (cached) return cached;

  const loaded = await localeLoaders[locale]();
  localeMessages[locale] = loaded;
  return loaded;
}
