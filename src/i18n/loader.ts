import { registerTranslations, SupportedLanguage } from "./index";
import { en } from "./locales/en";
import { zhHant } from "./locales/zh-Hant";
import { zhHans } from "./locales/zh-Hans";
import { ja } from "./locales/ja";

/**
 * 加载所有语言包
 */
export function loadAllTranslations() {
  // 注册英文语言包
  registerTranslations("en", en);

  // 注册繁体中文语言包
  registerTranslations("zh-Hant", zhHant);

  // 注册简体中文语言包
  registerTranslations("zh-Hans", zhHans);

  // 注册日文语言包
  registerTranslations("ja", ja);
}

/**
 * 获取支持的语言列表
 * @returns 支持的语言列表，包含代码和显示名称
 */
export function getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string; nativeName: string }> {
  return [
    {
      code: "en",
      name: "English",
      nativeName: "English"
    },
    {
      code: "zh-Hant",
      name: "Chinese (Traditional)",
      nativeName: "繁體中文"
    },
    {
      code: "zh-Hans",
      name: "Chinese (Simplified)",
      nativeName: "简体中文"
    },
    {
      code: "ja",
      name: "Japanese",
      nativeName: "日本語"
    }
  ];
}

/**
 * 根据语言代码获取语言显示名称
 * @param code 语言代码
 * @returns 语言显示名称
 */
export function getLanguageName(code: SupportedLanguage): string {
  const languages = getSupportedLanguages();
  const language = languages.find(lang => lang.code === code);
  return language ? language.nativeName : code;
}
