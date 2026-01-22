import {
  FileManager,
  FileSystemAdapter,
  Notice,
  TAbstractFile,
  TFile,
  TextFileView,
  Vault,
  Workspace,
  moment,
  normalizePath,
  requestUrl,
} from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import { PathResolver } from "../path/PathResolver";
import { NameResolver } from "../path/NameResolver";

// Simple path utilities for browser environment
function join(...parts: string[]): string {
  return parts
    .filter((p) => p)
    .join("/")
    .replace(/\/+/g, "/");
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  "image/apng": "apng",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/tiff": "tif",
  "image/webp": "webp",
};

export class RemoteImageService {
  private pathResolver: PathResolver;
  private nameResolver: NameResolver;

  constructor(
    private vault: Vault,
    private workspace: Workspace,
    private fileManager: FileManager,
    private adapter: FileSystemAdapter,
    private settings: AttachmenterSettings
  ) {
    this.pathResolver = new PathResolver(vault, settings);
    this.nameResolver = new NameResolver(settings);
  }

  /** Download remote images for the currently active text file (markdown or canvas). */
  async downloadForActiveFile() {
    const activeView = this.workspace.getActiveViewOfType(TextFileView);
    const activeFile = activeView?.file;
    if (!activeFile) {
      new Notice("No active file found");
      return;
    }

    const folderPath = await this.ensureAttachmentFolder(activeFile);

    if (activeFile.extension === "md") {
      const content = activeView.getViewData();
      const { newContent, replacedCount } = await this.processMarkdownContent(
        content,
        activeFile,
        folderPath
      );
      if (content !== newContent) {
        activeView.setViewData(newContent, false);
        new Notice(`Replaced ${replacedCount} remote image(s)`);
      } else if (replacedCount === 0) {
        new Notice("No remote images found to download");
      }
      return;
    }

    if (activeFile.extension === "canvas") {
      const content = activeView.getViewData();
      const { newContent, replacedCount } = await this.processCanvasContent(
        content,
        activeFile,
        folderPath
      );
      if (content !== newContent) {
        activeView.setViewData(newContent, false);
        new Notice(`Replaced ${replacedCount} remote image(s)`);
      } else if (replacedCount === 0) {
        new Notice("No remote images found to download");
      }
    }
  }

  /** Download remote images for a markdown file from the file explorer (no active view required). */
  async downloadForFile(file: TFile) {
    if (file.extension !== "md") return;

    const folderPath = await this.ensureAttachmentFolder(file);
    const content = await this.vault.read(file);
    const { newContent, replacedCount } = await this.processMarkdownContent(
      content,
      file,
      folderPath
    );
    if (content !== newContent) {
      await this.vault.modify(file, newContent);
      new Notice(`Replaced ${replacedCount} remote image(s) in ${file.name}`);
    } else if (replacedCount === 0) {
      new Notice(`No remote images found in ${file.name}`);
    }
  }

  private async ensureAttachmentFolder(note: TFile): Promise<string> {
    const folderPath = this.pathResolver.getAttachmentFolderForNote(note);
    if (!(await this.adapter.exists(folderPath))) {
      await this.vault.createFolder(folderPath);
    }
    return folderPath;
  }

  private async processMarkdownContent(
    content: string,
    note: TFile,
    folderPath: string
  ): Promise<{ newContent: string; replacedCount: number }> {
    // Improved regex to match markdown image syntax: ![alt](url)
    // The URL part can contain various characters including parentheses, so we use a more permissive pattern
    // This regex matches: !\[(alt text)\]\(url\) where alt can be empty and url can contain most characters
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches: Array<{ match: string; alt: string; link: string; index: number }> = [];
    
    // Collect all matches first
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);
    while ((match = regexCopy.exec(content)) !== null) {
      const link = match[2].trim();
      // Only process if it's a URL (not a local path)
      if (this.isUrl(link)) {
        matches.push({
          match: match[0],
          alt: match[1],
          link: link,
          index: match.index,
        });
      }
    }

    if (matches.length === 0) {
      return { newContent: content, replacedCount: 0 };
    }

    // Download all images
    let time = (moment() as any);
    const replacements: Promise<string>[] = matches.map((m) => {
      time = time.add(1, "m");
      const baseName = this.nameResolver.buildBaseName(note, time);
      const imagePath = join(folderPath, baseName);
      // [修改] 加入 m.alt 參數
      return this.downloadForMarkdown(note, m.match, m.link, m.alt, imagePath);
    });

    const replacementTexts = await Promise.all(replacements);

    // Debug: log all replacements
    console.log(`Found ${matches.length} remote images`);
    replacementTexts.forEach((replacement, i) => {
      const changed = replacement !== matches[i].match;
      console.log(`Replacement ${i + 1}: "${matches[i].match}" -> "${replacement}" ${changed ? "✓" : "✗"}`);
    });

    // Count successful replacements
    let replacedCount = 0;
    for (let i = 0; i < replacementTexts.length; i++) {
      if (replacementTexts[i] !== matches[i].match) {
        replacedCount++;
      }
    }

    console.log(`Successfully replaced ${replacedCount} out of ${matches.length} images`);

    // Use simple replace approach like obsidian-attachment-management
    // Create a copy of replacementTexts array for shift()
    const replacementsArray = [...replacementTexts];
    const regexForReplace = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const newContent = content.replace(regexForReplace, (match: string) => {
      // Find the corresponding replacement
      const matchIndex = matches.findIndex((m) => m.match === match);
      if (matchIndex >= 0 && matchIndex < replacementsArray.length) {
        const replacement = replacementsArray[matchIndex];
        if (replacement !== match) {
          console.log(`Replacing: "${match.substring(0, 50)}..." -> "${replacement.substring(0, 50)}..."`);
        }
        return replacement;
      }
      return match;
    });

    return { newContent, replacedCount };
  }

  private async processCanvasContent(
    content: string,
    note: TFile,
    folderPath: string
  ): Promise<{ newContent: string; replacedCount: number }> {
    try {
      const data = JSON.parse(content);
      if (!Array.isArray(data.nodes)) {
        return { newContent: content, replacedCount: 0 };
      }

      let time = moment();
      const tasks: Promise<boolean>[] = [];

      data.nodes.forEach((node: any) => {
        time = time.add(1, "m");
        const baseName = this.nameResolver.buildBaseName(note, time);
        const imagePath = join(folderPath, baseName);
        tasks.push(this.downloadForCanvas(node, imagePath));
      });

      const results = await Promise.all(tasks);
      const replacedCount = results.filter((r) => r).length;

      return { newContent: JSON.stringify(data, null, "\t"), replacedCount };
    } catch {
      return { newContent: content, replacedCount: 0 };
    }
  }

  private async downloadForMarkdown(
    note: TFile,
    match: string,
    link: string,
    alt: string, // [新增] 加入 alt 參數
    imagePath: string
  ): Promise<string> {
    // Link should already be validated as URL in processMarkdownContent, but double-check
    if (!this.isUrl(link)) {
      console.warn(`Skipping non-URL link: ${link}`);
      return match;
    }

    console.log(`Downloading image from: ${link}, alt: "${alt}"`);
    const downloaded = await this.download(link, imagePath);
    if (!(downloaded instanceof TFile)) {
      console.warn(`Failed to download: ${link} (result: ${downloaded})`);
      return match;
    }

    console.log(`Downloaded to: ${downloaded.path}`);

    // Generate markdown link - ensure it's an image link with !
    // generateMarkdownLink(file, sourcePath, subpath?, displayText?)
    let linkText = this.fileManager.generateMarkdownLink(downloaded, note.path, undefined, alt);
    console.log(`Generated link text: "${linkText}"`);
    
    // If it's already an image link, return as is
    if (linkText.startsWith("!")) {
      console.log(`Link already has ! prefix, using as is: "${linkText}"`);
      return linkText;
    }
    
    // If it's a regular link, convert to image link
    // Handle both [text](path) and [[path]] formats
    if (linkText.startsWith("[[")) {
      // Convert [[path]] to ![[path]]
      const result = "!" + linkText;
      console.log(`Converted [[link]] to image: "${result}"`);
      return result;
    } else if (linkText.startsWith("[")) {
      // Convert [text](path) to ![text](path)
      const result = "!" + linkText;
      console.log(`Converted [link] to image: "${result}"`);
      return result;
    } else {
      // Fallback: wrap in image syntax
      const result = `![${alt || ""}](${linkText})`;
      console.log(`Wrapped in image syntax: "${result}"`);
      return result;
    }
  }

  private async downloadForCanvas(node: any, imagePath: string): Promise<boolean> {
    if (node.type !== "link" || !node.url) return false;
    const downloaded = await this.download(node.url, imagePath);
    if (!(downloaded instanceof TFile)) return false;

    node.type = "file";
    delete node.url;
    node.file = downloaded.path;
    return true;
  }

  private isUrl(url: string): boolean {
    if (!url || url.trim() === "") return false;
    
    // Check if it starts with http:// or https://
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        // eslint-disable-next-line no-new
        new URL(trimmed);
        return true;
      } catch {
        return false;
      }
    }
    
    // Also check for data: URLs and other protocols
    if (trimmed.includes("://")) {
      try {
        // eslint-disable-next-line no-new
        new URL(trimmed);
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  }

  private async download(url: string, imagePath: string) {
    try {
      console.log(`Requesting URL: ${url}`);
      const response = await requestUrl(url);
      console.log(`Response status: ${response.status}`);
      
      if (response.status !== 200) {
        console.error(`Failed to download ${url}: status ${response.status}`);
        return false;
      }

      const rawType = response.headers["content-type"] ?? "";
      const contentType = rawType.split(";")[0].trim();
      console.log(`Content type: ${contentType}`);
      
      // 如果 Header 沒給出正確的圖片類型，嘗試從 URL 結尾抓取
      let extension = IMAGE_CONTENT_TYPES[contentType];
      if (!extension) {
        const urlPath = new URL(url).pathname;
        const extMatch = urlPath.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i);
        if (extMatch) {
            extension = extMatch[1].toLowerCase();
            // 修正 jpeg 為 jpg 以保持一致 (視需求)
            if (extension === 'jpeg') extension = 'jpg';
        }
      }

      if (!extension) {
        console.error(`Unsupported content type: ${contentType} for ${url}`);
        console.log(`Available types: ${Object.keys(IMAGE_CONTENT_TYPES).join(", ")}`);
        return false;
      }

      // Ensure path doesn't start with ./
      let fullPath = imagePath + "." + extension;
      if (fullPath.startsWith("./")) {
        fullPath = fullPath.substring(2);
      }
      fullPath = normalizePath(fullPath);
      console.log(`Creating file at: ${fullPath}`);
      
      // Check if file already exists and delete it first
      const existingFile = this.vault.getAbstractFileByPath(fullPath);
      if (existingFile instanceof TFile) {
        console.log(`File already exists, deleting: ${fullPath}`);
        await this.vault.delete(existingFile);
        // Wait a bit after deletion
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      
      // Use arrayBuffer directly, not response.arrayBuffer (which might be a getter)
      const arrayBuffer = await response.arrayBuffer;
      console.log(`ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
      
      const file = await this.vault.createBinary(fullPath, arrayBuffer);
      
      if (!file) {
        console.warn(`createBinary returned null for ${fullPath}, waiting and retrying...`);
        // Wait longer and retry getting the file - Obsidian may need time to sync
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const createdFile = this.vault.getAbstractFileByPath(fullPath);
          if (createdFile instanceof TFile) {
            console.log(`File found after retry ${i + 1}: ${createdFile.path}`);
            return createdFile;
          }
          // Also try with ./ prefix
          const altPath = "./" + fullPath;
          const altFile = this.vault.getAbstractFileByPath(altPath);
          if (altFile instanceof TFile) {
            console.log(`File found with ./ prefix after retry ${i + 1}: ${altFile.path}`);
            return altFile;
          }
        }
        console.error(`File not found in vault after createBinary: ${fullPath}`);
        // List files in the directory to debug
        const folderPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
        const folder = this.vault.getAbstractFileByPath(folderPath);
        if (folder) {
          console.log(`Folder exists: ${folderPath}`);
        } else {
          console.log(`Folder does not exist: ${folderPath}`);
        }
        return false;
      }
      console.log(`File created successfully: ${file.path}`);
      return file;
    } catch (error) {
      console.error(`Error downloading ${url}:`, error);
      return false;
    }
  }
}

