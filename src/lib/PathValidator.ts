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

export interface DetailedStatistics {
  // 檔案統計
  files: {
    total: number;                    // 總檔案數（md + canvas）
    withImageLinks: number;           // 有圖片連結的檔案數
    withoutImageLinks: number;         // 沒有圖片連結的檔案數
    withAttachments: number;           // 有附件資料夾的檔案數
    withoutAttachments: number;        // 沒有附件資料夾的檔案數
  };
  
  // 圖片連結統計
  imageLinks: {
    total: number;                    // 總圖片連結數
    resolved: number;                  // 已解析的連結數
    unresolved: number;               // 未解析的連結數
    markdown: number;                  // Markdown 格式連結數
    wiki: number;                     // Wiki 格式連結數
  };
  
  // 附件資料夾統計
  attachmentFolders: {
    totalExpected: number;            // 預期應存在的資料夾數
    existing: number;                  // 實際存在的資料夾數
    missing: number;                   // 缺失的資料夾數
    correctlyNamed: number;            // 正確命名的資料夾數
    incorrectlyNamed: number;          // 錯誤命名的資料夾數
  };
  
  // 問題統計（保留現有）
  issues: {
    total: number;
    missing: number;
    nameMismatch: number;
    invalidChars: number;
  };
}

export interface ValidationResult {
  totalFiles: number;
  issues: ValidationIssue[];
  summary: {
    missing: number;
    nameMismatch: number;
    invalidChars: number;
  };
  statistics: DetailedStatistics;  // 新增
}

export interface ChangePlan {
  folderCreations: Array<{
    path: string;
    noteFile: TFile;
  }>;
  folderRenames: Array<{
    from: string;
    to: string;
    noteFile: TFile;
  }>;
  imageMoves: Array<{
    imageFile: TFile;
    fromPath: string;
    toPath: string;
    noteFile: TFile;
    oldLinkMatch: string; // The original link match string
    altText?: string; // Alt text for the link
    linkType: "markdown" | "wiki";
  }>;
  linkUpdates: Array<{
    noteFile: TFile;
    oldLink: string;
    newLink: string;
    linkType: "markdown" | "wiki";
  }>;
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

    // Initialize statistics
    const statistics: DetailedStatistics = {
      files: {
        total: relevantFiles.length,
        withImageLinks: 0,
        withoutImageLinks: 0,
        withAttachments: 0,
        withoutAttachments: 0,
      },
      imageLinks: {
        total: 0,
        resolved: 0,
        unresolved: 0,
        markdown: 0,
        wiki: 0,
      },
      attachmentFolders: {
        totalExpected: 0,
        existing: 0,
        missing: 0,
        correctlyNamed: 0,
        incorrectlyNamed: 0,
      },
      issues: {
        total: 0,
        missing: 0,
        nameMismatch: 0,
        invalidChars: 0,
      },
    };

    // Track files with attachments for statistics
    const filesWithAttachments = new Set<string>();

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

      // Update file statistics
      if (imageLinks.length > 0) {
        statistics.files.withImageLinks++;
      } else {
        statistics.files.withoutImageLinks++;
      }

      // Update image link statistics
      statistics.imageLinks.total += imageLinks.length;
      for (const link of imageLinks) {
        if (link.resolvedPath) {
          statistics.imageLinks.resolved++;
        } else {
          statistics.imageLinks.unresolved++;
        }
        if (link.type === "markdown") {
          statistics.imageLinks.markdown++;
        } else if (link.type === "wiki") {
          statistics.imageLinks.wiki++;
        }
      }

      // Get expected folder path
      const expectedFolderPath = pathResolver.getAttachmentFolderForNote(file);

      // Check if folder exists
      const folder = vault.getAbstractFileByPath(expectedFolderPath);
      const actualFolderPath = folder instanceof TFolder ? folder.path : null;

      // Update attachment folder statistics
      if (imageLinks.length > 0) {
        statistics.attachmentFolders.totalExpected++;
        if (actualFolderPath) {
          statistics.attachmentFolders.existing++;
          filesWithAttachments.add(file.path);
          
          // Check if folder name matches expected (after sanitization)
          const isCorrectlyNamed = normalizePath(actualFolderPath) === normalizePath(expectedFolderPath);
          if (isCorrectlyNamed) {
            statistics.attachmentFolders.correctlyNamed++;
          } else {
            statistics.attachmentFolders.incorrectlyNamed++;
          }
        } else {
          statistics.attachmentFolders.missing++;
        }
      }

      // Only check folder if file has image links
      if (imageLinks.length === 0) {
        continue;
      }

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

    // Update files with/without attachments statistics
    statistics.files.withAttachments = filesWithAttachments.size;
    statistics.files.withoutAttachments = statistics.files.withImageLinks - filesWithAttachments.size;

    // Calculate summary and issue statistics
    const summary = {
      missing: issues.filter((i) => i.issue === "missing").length,
      nameMismatch: issues.filter((i) => i.issue === "name_mismatch").length,
      invalidChars: issues.filter((i) => i.issue === "invalid_chars").length,
    };

    statistics.issues.total = issues.length;
    statistics.issues.missing = summary.missing;
    statistics.issues.nameMismatch = summary.nameMismatch;
    statistics.issues.invalidChars = summary.invalidChars;

    return {
      totalFiles: relevantFiles.length,
      issues,
      summary,
      statistics,
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
