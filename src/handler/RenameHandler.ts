import {
  FileManager,
  normalizePath,
  TAbstractFile,
  TFolder,
  TFile,
  Vault,
} from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import { PathResolver } from "../path/PathResolver";
import { PathSanitizer } from "../lib/pathSanitizer";

// Simple path utilities for browser environment
function dirname(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}

function join(...parts: string[]): string {
  return parts
    .filter((p) => p)
    .join("/")
    .replace(/\/+/g, "/");
}

export class RenameHandler {
  private pathResolver: PathResolver;

  constructor(
    private vault: Vault,
    private fileManager: FileManager,
    private getSettings: () => AttachmenterSettings
  ) {
    // PathResolver will be created dynamically to get latest settings
  }

  async handle(file: TAbstractFile, oldPath: string) {
    // Only handle markdown and canvas files
    if (!(file instanceof TFile)) {
      return;
    }

    if (file.extension !== "md" && file.extension !== "canvas") {
      return;
    }

    // Get latest settings
    const settings = this.getSettings();

    // Check if auto rename folder is enabled
    if (!settings.autoRenameFolder) {
      return;
    }

    // Create path resolver with latest settings
    const pathResolver = new PathResolver(this.vault, settings);

    // Calculate old and new attachment folder paths
    // Note: Old path calculation should also use sanitization for consistency
    const oldFileDir = dirname(oldPath);
    const oldFileBasename = basename(oldPath).replace(/\.[^/.]+$/, ""); // Remove extension
    // Sanitize the old basename and suffix to match how folders were created
    const sanitizedOldBasename = PathSanitizer.sanitizeFolderName(oldFileBasename);
    const sanitizedOldSuffix = PathSanitizer.sanitizeFolderName(settings.defaultFolderSuffix);
    const oldFolderName = `${sanitizedOldBasename}${sanitizedOldSuffix}`;
    const oldFolderPath = normalizePath(join(oldFileDir, oldFolderName));

    // New folder path is already sanitized by PathResolver
    const newFolderPath = pathResolver.getAttachmentFolderForNote(file);

    // If the paths are the same, no need to rename
    if (normalizePath(oldFolderPath) === normalizePath(newFolderPath)) {
      return;
    }

    // Check if old folder exists
    if (!(await this.vault.adapter.exists(oldFolderPath))) {
      return;
    }

    // Get the old folder
    const oldFolder = this.vault.getAbstractFileByPath(oldFolderPath);
    if (!oldFolder || !(oldFolder instanceof TFolder)) {
      return;
    }

    // Check if new folder parent exists, create if not
    const newFolderParent = dirname(newFolderPath);
    if (!(await this.vault.adapter.exists(newFolderParent))) {
      await this.vault.createFolder(newFolderParent);
    }

    // Rename the folder
    try {
      await this.fileManager.renameFile(oldFolder, newFolderPath);
    } catch (error) {
      console.error("Error renaming attachment folder:", error);
    }
  }
}
