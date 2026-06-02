export type Locale = "zh-CN" | "en-US";

export interface TranslationDict {
  [key: string]: string | TranslationDict;
}

export type NavSearchItem = {
  to: string;
  label: string;
  group: string;
  keywords: string;
};
