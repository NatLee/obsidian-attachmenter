import { TFile, TFolder, Vault, normalizePath } from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import { PathSanitizer } from "../lib/pathSanitizer";

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
   * Path format: <note-dir>/<notename><defaultFolderSuffix>
   * 
   * Folder names are sanitized to ensure cross-platform compatibility.
   */
  getAttachmentFolderForNote(note: TFile): string {
    const noteDir = dirname(note.path);
    // Sanitize the note name to handle invalid characters (e.g., #)
    const sanitizedNotename = PathSanitizer.sanitizeFolderName(note.basename);
    // Sanitize the folder suffix as well in case it contains invalid chars
    const sanitizedSuffix = PathSanitizer.sanitizeFolderName(this.settings.defaultFolderSuffix);
    const folderName = `${sanitizedNotename}${sanitizedSuffix}`;
    let folderPath = join(noteDir, folderName);
    // Remove leading ./ if present
    if (folderPath.startsWith("./")) {
      folderPath = folderPath.substring(2);
    }
    return normalizePath(folderPath);
  }

  /**
   * The note that owns an attachment folder: a sibling .md (preferred) or
   * .canvas file whose attachment folder is exactly this folder. Only the
   * folder's own parent directory is searched, since that is the only place
   * the owner can live.
   */
  findNoteForAttachmentFolder(folder: TFolder): TFile | null {
    let canvasOwner: TFile | null = null;
    for (const sibling of folder.parent?.children ?? []) {
      if (!(sibling instanceof TFile)) continue;
      if (sibling.extension !== "md" && sibling.extension !== "canvas") continue;
      if (this.getAttachmentFolderForNote(sibling) !== folder.path) continue;
      if (sibling.extension === "md") return sibling;
      if (!canvasOwner) canvasOwner = sibling;
    }
    return canvasOwner;
  }
}

