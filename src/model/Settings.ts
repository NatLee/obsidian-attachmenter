import type { SupportedLanguage } from "../i18n/index";

export interface AttachmenterSettings {
  /** Interface language. */
  language: SupportedLanguage;
  /** Use simple per-note folder mode or advanced templated mode. */
  simpleMode: boolean;
  /** Suffix for per-note attachment folder in simple mode, e.g. `_Attachments`. */
  defaultFolderSuffix: string;
  /** Template for attachment base name in simple mode, supports `{notename}` and `{date}`. */
  defaultNameFormat: string;
  /** Moment.js-compatible date format used for `{date}`. */
  dateFormat: string;
  /** Hide attachment folders in the file explorer. */
  hideFolder: boolean;
  /** Apply AERO style to attachment folders. */
  aeroFolder: boolean;
  /** Automatically rename attachment folder when note is renamed. */
  autoRenameFolder: boolean;
  /** Prompt user to rename images when moving them during path check. */
  promptRenameImage: boolean;
}

export const DEFAULT_SETTINGS: AttachmenterSettings = {
  language: "en",
  simpleMode: true,
  defaultFolderSuffix: "_Attachments",
  defaultNameFormat: "{notename}-{date}",
  dateFormat: "YYYYMMDDHHmmssSSS",
  hideFolder: false,
  aeroFolder: true,
  autoRenameFolder: true,
  promptRenameImage: true,
};

