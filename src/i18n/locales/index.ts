import type { Locale, TranslationDict } from "../types";
import zhCN from "./zh-CN";
import enUS from "./en-US";

export const messages: Record<Locale, TranslationDict> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};
