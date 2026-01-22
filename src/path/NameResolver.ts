import { moment, TFile } from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import { PathSanitizer } from "../lib/pathSanitizer";

export class NameResolver {
  constructor(private settings: AttachmenterSettings) {}

  /**
   * Build a base filename (without extension) for a new attachment related to `note`.
   * Uses simple template with `{notename}` and `{date}` placeholders.
   * 
   * File names are sanitized to ensure cross-platform compatibility.
   */
  buildBaseName(note: TFile, time?: moment.Moment): string {
    const fmt = this.settings.defaultNameFormat || "{notename}-{date}";
    // Sanitize the note name to handle invalid characters (e.g., #)
    const sanitizedNotename = PathSanitizer.sanitizeFileName(note.basename);
    const ts = (time ?? moment()).format(this.settings.dateFormat || "YYYYMMDDHHmmssSSS");

    const baseName = fmt.replace("{notename}", sanitizedNotename).replace("{date}", ts);
    
    // Ensure the final filename is also sanitized (in case format contains invalid chars)
    return PathSanitizer.sanitizeFileName(baseName);
  }
}

