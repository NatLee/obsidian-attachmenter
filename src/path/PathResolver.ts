import { TFile, Vault, normalizePath } from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";

// Simple path utilities for browser environment
function dirname(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

function join(...parts: string[]): string {
  return parts
    .filter((p) => p)
    .join("/")
    .replace(/\/+/g, "/");
}

export class PathResolver {
  constructor(private vault: Vault, private settings: AttachmenterSettings) {}

  /**
   * Returns the folder path where attachments for a given note should be stored.
   * For now we only implement the simple mode:
   *   <note-dir>/<notename><defaultFolderSuffix>
   */
  getAttachmentFolderForNote(note: TFile): string {
    const noteDir = dirname(note.path);
    const notename = note.basename;
    const folderName = `${notename}${this.settings.defaultFolderSuffix}`;
    let folderPath = join(noteDir, folderName);
    // Remove leading ./ if present
    if (folderPath.startsWith("./")) {
      folderPath = folderPath.substring(2);
    }
    return normalizePath(folderPath);
  }
}

