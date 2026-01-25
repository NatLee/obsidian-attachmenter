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
  /** Show attachment manager button in the file explorer. */
  showAttachmentManagerButton: boolean;
  /** Show file attachment tree in the file explorer. */
  showFileAttachmentTree: boolean;
  /** Rename confirmation behavior: 'ask' = always ask, 'always-rename' = rename directly without asking. */
  renameConfirmationBehavior: 'ask' | 'always-rename';
  /** Show remote hint. */
  showRemoteHint: boolean;
  /** Highlight expanded file title. */
  enableHighlight: boolean;
  /** Border accent color for expanded file title. */
  highlightBorderColor: string;
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
  renameConfirmationBehavior: 'ask',
  showRemoteHint: true,
  enableHighlight: false,
  highlightBorderColor: "", // Default to empty (Theme Accent)
};
