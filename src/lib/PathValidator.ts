import { App, TFile, TFolder, Vault, normalizePath } from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import { PathResolver } from "../path/PathResolver";
import { PathSanitizer } from "./pathSanitizer";

export interface ImageLink {
  match: string; // 完整的匹配字串，如 ![alt](path)
  linkText: string; // 連結文字部分
  altText: string; // alt 文字
  type: "markdown" | "wiki"; // 連結類型
  resolvedPath?: string; // 解析後的實際檔案路徑
}

export interface ValidationIssue {
  file: TFile;
  expectedFolderPath: string;
  actualFolderPath: string | null;
  issue: "missing" | "name_mismatch" | "invalid_chars";
  invalidChars?: string[];
  imageLinks?: ImageLink[]; // 找到的圖片連結
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
   * Extract image links from markdown or canvas file content.
   * @param content - File content
   * @param file - The file being processed
   * @param app - Obsidian app instance (for metadata cache)
   * @returns Array of image links found
   */
  static extractImageLinks(
    content: string,
    file: TFile,
    app: App
  ): ImageLink[] {
    const imageLinks: ImageLink[] = [];

    if (file.extension === "md") {
      // Markdown image format: ![alt](path) or ![alt](url)
      const markdownRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      while ((match = markdownRegex.exec(content)) !== null) {
        const altText = match[1] || "";
        const linkText = match[2].trim();

        // Skip remote URLs
        if (linkText.startsWith("http://") || linkText.startsWith("https://")) {
          continue;
        }

        // Resolve the path
        let resolvedPath: string | undefined;
        try {
          // Try to resolve as relative path first
          const resolvedFile = app.metadataCache.getFirstLinkpathDest(
            linkText,
            file.path
          );
          if (resolvedFile) {
            resolvedPath = resolvedFile.path;
          } else {
            // Try absolute path
            const absoluteFile = app.vault.getAbstractFileByPath(linkText);
            if (absoluteFile instanceof TFile) {
              resolvedPath = absoluteFile.path;
            }
          }
        } catch (error) {
          console.warn(`Failed to resolve image path: ${linkText}`, error);
        }

        imageLinks.push({
          match: match[0],
          linkText,
          altText,
          type: "markdown",
          resolvedPath,
        });
      }

      // Wiki image format: ![[path]] or ![[path|alt]]
      const wikiRegex = /!\[\[([^\]]+)\]\]/g;
      while ((match = wikiRegex.exec(content)) !== null) {
        const linkText = match[1];
        // Handle pipe separator for alt text: path|alt
        const parts = linkText.split("|");
        const pathPart = parts[0].trim();
        const altText = parts.length > 1 ? parts.slice(1).join("|") : "";

        // Resolve the path
        let resolvedPath: string | undefined;
        try {
          const resolvedFile = app.metadataCache.getFirstLinkpathDest(
            pathPart,
            file.path
          );
          if (resolvedFile) {
            resolvedPath = resolvedFile.path;
          }
        } catch (error) {
          console.warn(`Failed to resolve wiki image path: ${pathPart}`, error);
        }

        imageLinks.push({
          match: match[0],
          linkText: pathPart,
          altText,
          type: "wiki",
          resolvedPath,
        });
      }
    } else if (file.extension === "canvas") {
      // Canvas files are JSON format
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data.nodes)) {
          for (const node of data.nodes) {
            if (node.type === "file" && node.file) {
              // Canvas file node
              const linkText = node.file;
              let resolvedPath: string | undefined;
              try {
                const resolvedFile = app.metadataCache.getFirstLinkpathDest(
                  linkText,
                  file.path
                );
                if (resolvedFile) {
                  resolvedPath = resolvedFile.path;
                  // Check if it's an image file
                  const imageExtensions = [
                    "png",
                    "jpg",
                    "jpeg",
                    "gif",
                    "webp",
                    "svg",
                    "bmp",
                    "apng",
                    "avif",
                    "ico",
                    "tif",
                    "tiff",
                  ];
                  if (
                    resolvedFile.extension &&
                    imageExtensions.includes(
                      resolvedFile.extension.toLowerCase()
                    )
                  ) {
                    imageLinks.push({
                      match: JSON.stringify(node),
                      linkText,
                      altText: node.text || "",
                      type: "markdown",
                      resolvedPath,
                    });
                  }
                }
              } catch (error) {
                console.warn(
                  `Failed to resolve canvas image path: ${linkText}`,
                  error
                );
              }
            } else if (node.type === "link" && node.url) {
              // Canvas link node (could be remote image)
              const url = node.url;
              // Skip remote URLs
              if (!url.startsWith("http://") && !url.startsWith("https://")) {
                // Local path
                let resolvedPath: string | undefined;
                try {
                  const resolvedFile = app.metadataCache.getFirstLinkpathDest(
                    url,
                    file.path
                  );
                  if (resolvedFile) {
                    resolvedPath = resolvedFile.path;
                    const imageExtensions = [
                      "png",
                      "jpg",
                      "jpeg",
                      "gif",
                      "webp",
                      "svg",
                      "bmp",
                      "apng",
                      "avif",
                      "ico",
                      "tif",
                      "tiff",
                    ];
                    if (
                      resolvedFile.extension &&
                      imageExtensions.includes(
                        resolvedFile.extension.toLowerCase()
                      )
                    ) {
                      imageLinks.push({
                        match: JSON.stringify(node),
                        linkText: url,
                        altText: node.text || "",
                        type: "markdown",
                        resolvedPath,
                      });
                    }
                  }
                } catch (error) {
                  console.warn(
                    `Failed to resolve canvas link path: ${url}`,
                    error
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to parse canvas file: ${file.path}`, error);
      }
    }

    return imageLinks;
  }

  /**
   * Validate all attachment folder paths for markdown and canvas files.
   * @param vault - The Obsidian vault
   * @param settings - Plugin settings
   * @param app - Obsidian app instance (for metadata cache)
   * @returns Validation result with all issues found
   */
  static async validateAttachmentFolders(
    vault: Vault,
    settings: AttachmenterSettings,
    app: App
  ): Promise<ValidationResult> {
    const pathResolver = new PathResolver(vault, settings);
    const issues: ValidationIssue[] = [];

    // Get all markdown and canvas files
    const allFiles = vault.getFiles();
    const relevantFiles = allFiles.filter(
      (file) => file.extension === "md" || file.extension === "canvas"
    );

    for (const file of relevantFiles) {
      // Read file content and extract image links
      let content: string;
      try {
        content = await vault.read(file);
      } catch (error) {
        console.warn(`Failed to read file: ${file.path}`, error);
        continue;
      }

      const imageLinks = this.extractImageLinks(content, file, app);

      // Only check folder if file has image links
      if (imageLinks.length === 0) {
        continue;
      }

      const expectedFolderPath = pathResolver.getAttachmentFolderForNote(file);

      // Check if folder exists
      const folder = vault.getAbstractFileByPath(expectedFolderPath);
      const actualFolderPath = folder instanceof TFolder ? folder.path : null;

      if (!actualFolderPath) {
        // Folder doesn't exist, but file has image links
        issues.push({
          file,
          expectedFolderPath,
          actualFolderPath: null,
          issue: "missing",
          imageLinks,
        });
        continue;
      }

      // Folder exists, check if name matches expected (considering sanitization)
      
      // Check for invalid characters in the original note name
      const invalidChars = PathSanitizer.findInvalidCharacters(file.basename);
      if (invalidChars.length > 0) {
        issues.push({
          file,
          expectedFolderPath,
          actualFolderPath,
          issue: "invalid_chars",
          invalidChars,
          imageLinks,
        });
      }

      // Check if folder name matches expected (after sanitization)
      if (normalizePath(actualFolderPath) !== normalizePath(expectedFolderPath)) {
        issues.push({
          file,
          expectedFolderPath,
          actualFolderPath,
          issue: "name_mismatch",
          imageLinks,
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
