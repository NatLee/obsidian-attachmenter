import type { SupportedLanguage } from "../i18n/index";

export interface AttachmenterSettings {
  /** Interface language. */
  language: SupportedLanguage;
  /** Suffix for per-note attachment folder, e.g. `_Attachments`. */
  defaultFolderSuffix: string;
  /** Template for attachment base name, supports `{notename}` and `{date}`. */
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
  /** Show status bar indicator when folders are hidden. */
  showStatusBar: boolean;
  /** Show ribbon icon in the left sidebar. */
  showRibbonIcon: boolean;
  /** Show attachment manager button in file explorer. */
  showAttachmentManagerButton: boolean;
  /** Show file attachment tree in file explorer. */
  showFileAttachmentTree: boolean;
}

export const DEFAULT_SETTINGS: AttachmenterSettings = {
  language: "en",
  defaultFolderSuffix: "_Attachments",
  defaultNameFormat: "{notename}-{date}",
  dateFormat: "YYYYMMDDHHmmssSSS",
  hideFolder: false,
  aeroFolder: true,
  autoRenameFolder: true,
  promptRenameImage: true,
  showStatusBar: true,
  showRibbonIcon: true,
  showAttachmentManagerButton: true,
  showFileAttachmentTree: true,
};

