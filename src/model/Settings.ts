import { moment } from "obsidian";

export interface AttachmenterSettings {
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
}

export const DEFAULT_SETTINGS: AttachmenterSettings = {
  simpleMode: true,
  defaultFolderSuffix: "_Attachments",
  defaultNameFormat: "{notename}-{date}",
  dateFormat: "YYYYMMDDHHmmssSSS",
  hideFolder: false,
  aeroFolder: true,
};

