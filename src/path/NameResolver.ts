import { moment, TFile } from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";

export class NameResolver {
  constructor(private settings: AttachmenterSettings) {}

  /**
   * Build a base filename (without extension) for a new attachment related to `note`.
   * Uses simple template with `{notename}` and `{date}` placeholders.
   */
  buildBaseName(note: TFile, time?: moment.Moment): string {
    const fmt = this.settings.defaultNameFormat || "{notename}-{date}";
    const notename = note.basename;
    const ts = (time ?? moment()).format(this.settings.dateFormat || "YYYYMMDDHHmmssSSS");

    return fmt.replace("{notename}", notename).replace("{date}", ts);
  }
}

