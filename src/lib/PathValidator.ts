import { TFile, TFolder, Vault, normalizePath } from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import { PathResolver } from "../path/PathResolver";
import { PathSanitizer } from "./pathSanitizer";

// Simple path utilities
function dirname(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

export interface ValidationIssue {
  file: TFile;
  expectedFolderPath: string;
  actualFolderPath: string | null;
  issue: "missing" | "name_mismatch" | "invalid_chars";
  invalidChars?: string[];
}

export interface ValidationResult {
  totalFiles: number;
  issues: ValidationIssue[];
  summary: {
    missing: number;
    nameMismatch: number;
    invalidChars: number;
  };
}

export class PathValidator {
  /**
   * Validate all attachment folder paths for markdown and canvas files.
   * @param vault - The Obsidian vault
   * @param settings - Plugin settings
   * @returns Validation result with all issues found
   */
  static async validateAttachmentFolders(
    vault: Vault,
    settings: AttachmenterSettings
  ): Promise<ValidationResult> {
    const pathResolver = new PathResolver(vault, settings);
    const issues: ValidationIssue[] = [];

    // Get all markdown and canvas files
    const allFiles = vault.getFiles();
    const relevantFiles = allFiles.filter(
      (file) => file.extension === "md" || file.extension === "canvas"
    );

    for (const file of relevantFiles) {
      const expectedFolderPath = pathResolver.getAttachmentFolderForNote(file);
      const expectedFolderName = expectedFolderPath.split("/").pop() || "";

      // Check if folder exists
      const folder = vault.getAbstractFileByPath(expectedFolderPath);
      const actualFolderPath = folder instanceof TFolder ? folder.path : null;

      if (!actualFolderPath) {
        // Folder doesn't exist
        issues.push({
          file,
          expectedFolderPath,
          actualFolderPath: null,
          issue: "missing",
        });
        continue;
      }

      // Folder exists, check if name matches expected (considering sanitization)
      const actualFolderName = actualFolderPath.split("/").pop() || "";
      
      // Check for invalid characters in the original note name
      const invalidChars = PathSanitizer.findInvalidCharacters(file.basename);
      if (invalidChars.length > 0) {
        issues.push({
          file,
          expectedFolderPath,
          actualFolderPath,
          issue: "invalid_chars",
          invalidChars,
        });
      }

      // Check if folder name matches expected (after sanitization)
      if (normalizePath(actualFolderPath) !== normalizePath(expectedFolderPath)) {
        issues.push({
          file,
          expectedFolderPath,
          actualFolderPath,
          issue: "name_mismatch",
        });
      }
    }

    // Calculate summary
    const summary = {
      missing: issues.filter((i) => i.issue === "missing").length,
      nameMismatch: issues.filter((i) => i.issue === "name_mismatch").length,
      invalidChars: issues.filter((i) => i.issue === "invalid_chars").length,
    };

    return {
      totalFiles: relevantFiles.length,
      issues,
      summary,
    };
  }

  /**
   * Get the expected folder path for a file (for display purposes).
   * @param file - The file to check
   * @param settings - Plugin settings
   * @param vault - The Obsidian vault
   * @returns Expected folder path
   */
  static getExpectedFolderPath(
    file: TFile,
    settings: AttachmenterSettings,
    vault: Vault
  ): string {
    const pathResolver = new PathResolver(vault, settings);
    return pathResolver.getAttachmentFolderForNote(file);
  }
}
