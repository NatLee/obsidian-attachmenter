import {
  App,
  FileManager,
  normalizePath,
  TAbstractFile,
  TFolder,
  TFile,
  TextFileView,
  Vault,
  Workspace,
  moment,
} from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import { PathResolver } from "../path/PathResolver";
import { NameResolver } from "../path/NameResolver";
import { PasteImageManagerModal } from "../ui/PasteImageManagerModal";
import { PathSanitizer } from "../lib/pathSanitizer";

// Simple path utilities for browser environment
function join(...parts: string[]): string {
  return parts
    .filter((p) => p)
    .join("/")
    .replace(/\/+/g, "/");
}

const PASTED_IMAGE_PREFIX = "Pasted image ";

export class PasteImageHandler {
  private pathResolver: PathResolver;
  private nameResolver: NameResolver;

  constructor(
    private app: App,
    private vault: Vault,
    private workspace: Workspace,
    private fileManager: FileManager,
    private settings: AttachmenterSettings
  ) {
    this.pathResolver = new PathResolver(vault, settings);
    this.nameResolver = new NameResolver(settings);
  }

  async handle(file: TAbstractFile) {
    if (!(file instanceof TFile)) {
      return;
    }

    // 非粘贴的图片，返回
    if (!file.name.startsWith(PASTED_IMAGE_PREFIX)) {
      return;
    }

    const activeView = this.workspace.getActiveViewOfType(TextFileView);
    const activeFile = activeView?.file;

    if (!activeFile) {
      return;
    }

    // active text file, `md` or `canvas`
    if (activeFile.extension !== "md" && activeFile.extension !== "canvas") {
      return;
    }

    const folderPath = this.pathResolver.getAttachmentFolderForNote(activeFile);

    // 确保文件夹存在
    if (!(await this.vault.adapter.exists(folderPath))) {
      await this.vault.createFolder(folderPath);
    }

    // 生成新的文件名
    // @ts-ignore
    const time = (window.moment && window.moment()) || moment();
    const baseName = this.nameResolver.buildBaseName(activeFile, time);
    const newPath = normalizePath(
      join(folderPath, `${baseName}.${file.extension}`)
    );

    // 检查文件是否已经在正确的路径（避免重复处理）
    if (normalizePath(file.path) === newPath) {
      return;
    }

    if (activeFile.extension === "md") {
      const result = await this._rename4MD(file, newPath, activeView, activeFile);
      if (result) {
        this._showDeleteModal(result.file, result.linkText, activeView, activeFile, folderPath);
      }
    } else if (activeFile.extension === "canvas") {
      const result = await this._rename4Canvas(file, newPath, activeView, activeFile);
      if (result) {
        this._showDeleteModal(result.file, result.filePath, activeView, activeFile, folderPath);
      }
    }
  }

  async _rename4MD(
    file: TFile,
    newPath: string,
    activeView: TextFileView,
    activeFile: TFile
  ): Promise<{ file: TFile; linkText: string } | null> {
    try {
      // 先原地移动一次文件，否则当 newLinkFormat 设置为 shortest 时，generateMarkdownLink 生成的 oldLinkText 不正确
      // https://github.com/chenfeicqq/obsidian-attachment-manager/issues/4
      await this.fileManager.renameFile(file, file.path);
      const oldLinkText = this.fileManager.generateMarkdownLink(
        file,
        activeFile.path
      );

      // 移动文件到新路径
      await this.fileManager.renameFile(file, newPath);
      const newLinkText = this.fileManager.generateMarkdownLink(
        file,
        activeFile.path
      );

      // 更新markdown内容中的链接
      let content = activeView.getViewData();
      content = content.replace(oldLinkText, newLinkText);
      activeView.setViewData(content, false);

      // 获取重命名后的文件
      const renamedFile = this.vault.getAbstractFileByPath(newPath);
      if (renamedFile instanceof TFile) {
        return { file: renamedFile, linkText: newLinkText };
      }
      return null;
    } catch (error) {
      console.error("Error renaming pasted image for MD:", error);
      return null;
    }
  }

  async _rename4Canvas(
    file: TFile,
    newPath: string,
    activeView: TextFileView,
    _activeFile: TFile
  ): Promise<{ file: TFile; filePath: string } | null> {
    try {
      const oldPath = file.path;
      await this.fileManager.renameFile(file, newPath);

      let content = activeView.getViewData();
      // 更新canvas内容中的文件路径
      // Canvas文件使用JSON格式，需要替换文件路径
      const data = JSON.parse(content) as { nodes?: Array<{ type?: string; file?: string }> };
      if (Array.isArray(data.nodes)) {
        data.nodes.forEach((node) => {
          if (node.type === "file" && node.file === oldPath) {
            node.file = newPath;
          }
        });
        content = JSON.stringify(data, null, "\t");
      } else {
        // 使用正则表达式作为后备方案
        content = content.replace(
          new RegExp(`(file\\s*:\\s*")${oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(")`, "g"),
          `$1${newPath}$2`
        );
      }
      activeView.setViewData(content, false);

      // 获取重命名后的文件
      const renamedFile = this.vault.getAbstractFileByPath(newPath);
      if (renamedFile instanceof TFile) {
        return { file: renamedFile, filePath: newPath };
      }
      return null;
    } catch (error) {
      console.error("Error renaming pasted image for Canvas:", error);
      return null;
    }
  }

  private _showDeleteModal(
    file: TFile,
    linkTextOrPath: string,
    activeView: TextFileView,
    activeFile: TFile,
    folderPath: string
  ) {
    const modal = new PasteImageManagerModal(
      this.app,
      this.vault,
      this.fileManager,
      this.workspace,
      file,
      linkTextOrPath,
      activeView,
      activeFile,
      folderPath,
      this.settings,
      async (folderPath) => {
        await this._deleteImage(file, linkTextOrPath, activeView, activeFile, folderPath);
      },
      async (newPath) => {
        await this._renameImage(file, newPath, activeView, activeFile);
      }
    );
    modal.open();
  }

  private async _renameImage(
    file: TFile,
    newPath: string,
    activeView: TextFileView,
    activeFile: TFile
  ) {
    try {
      const oldPath = file.path;

      // Sanitize the new path to ensure it's valid
      const pathParts = newPath.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const fileNameParts = fileName.split(".");
      const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop() : "";
      const fileBaseName = fileNameParts.join(".");

      // Sanitize the base name and reconstruct the path
      const sanitizedBaseName = PathSanitizer.sanitizeFileName(fileBaseName);
      const sanitizedFileName = fileExtension
        ? `${sanitizedBaseName}.${fileExtension}`
        : sanitizedBaseName;
      pathParts[pathParts.length - 1] = sanitizedFileName;
      const sanitizedNewPath = normalizePath(pathParts.join("/"));

      // Ensure parent directory exists
      const newPathDir = sanitizedNewPath.substring(0, sanitizedNewPath.lastIndexOf("/"));
      if (!(await this.vault.adapter.exists(newPathDir))) {
        await this.vault.createFolder(newPathDir);
      }

      // For markdown, we need to get the old link text first
      let oldLinkText = "";
      if (activeFile.extension === "md") {
        // Re-rename to same path to ensure correct link generation
        await this.fileManager.renameFile(file, file.path);
        oldLinkText = this.fileManager.generateMarkdownLink(
          file,
          activeFile.path
        );
      }

      // Rename the file using sanitized path
      await this.fileManager.renameFile(file, sanitizedNewPath);

      // Get the renamed file using sanitized path
      const renamedFile = this.vault.getAbstractFileByPath(sanitizedNewPath);
      if (!(renamedFile instanceof TFile)) {
        throw new Error("Failed to get renamed file");
      }

      // Update content
      let content = activeView.getViewData();
      if (activeFile.extension === "md") {
        const newLinkText = this.fileManager.generateMarkdownLink(
          renamedFile,
          activeFile.path
        );
        content = content.replace(oldLinkText, newLinkText);
      } else if (activeFile.extension === "canvas") {
        const data = JSON.parse(content) as {
          nodes?: Array<{ type?: string; file?: string }>;
        };
        if (Array.isArray(data.nodes)) {
          data.nodes.forEach((node) => {
            if (node.type === "file" && node.file === oldPath) {
              node.file = sanitizedNewPath;
            }
          });
          content = JSON.stringify(data, null, "\t");
        }
      }
      activeView.setViewData(content, false);
    } catch (error) {
      console.error("Error renaming image:", error);
      throw error;
    }
  }

  private async _deleteImage(
    file: TFile,
    linkTextOrPath: string,
    activeView: TextFileView,
    activeFile: TFile,
    folderPath: string
  ) {
    try {
      // Remove the link from the document first
      let content = activeView.getViewData();

      if (activeFile.extension === "md") {
        // For markdown, remove the image link
        // Handle both single-line and multi-line cases
        const lines = content.split("\n");
        const newLines = lines.filter((line) => !line.includes(linkTextOrPath));
        content = newLines.join("\n");
      } else if (activeFile.extension === "canvas") {
        // For canvas, remove the node with this file
        const data = JSON.parse(content) as { nodes?: Array<{ type?: string; file?: string; id?: string }> };
        if (Array.isArray(data.nodes)) {
          data.nodes = data.nodes.filter((node) => {
            return !(node.type === "file" && node.file === linkTextOrPath);
          });
          content = JSON.stringify(data, null, "\t");
        }
      }

      activeView.setViewData(content, false);

      // Delete the file
      await this.fileManager.trashFile(file);

      // Check if the attachment folder is empty and delete it if so
      await this._deleteEmptyFolder(folderPath);
    } catch (error) {
      console.error("Error deleting pasted image:", error);
      throw error;
    }
  }

  private async _deleteEmptyFolder(folderPath: string) {
    try {
      // Check if folder exists
      if (!(await this.vault.adapter.exists(folderPath))) {
        return;
      }

      // Get the folder
      const folder = this.vault.getAbstractFileByPath(folderPath);
      if (!folder || !(folder instanceof TFolder)) {
        return;
      }

      // Check if folder is empty
      if (folder.children.length === 0) {
        // Folder is empty, delete it
        await this.fileManager.trashFile(folder);
      }
    } catch (error) {
      console.error("Error checking/deleting empty folder:", error);
      // Don't throw error, just log it
    }
  }
}
