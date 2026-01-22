import {
  FileManager,
  normalizePath,
  TAbstractFile,
  TFile,
  TextFileView,
  Vault,
  Workspace,
  moment,
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

const PASTED_IMAGE_PREFIX = "Pasted image ";

export class PasteImageHandler {
  private pathResolver: PathResolver;
  private nameResolver: NameResolver;

  constructor(
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
    const time = moment();
    const baseName = this.nameResolver.buildBaseName(activeFile, time);
    const newPath = normalizePath(
      join(folderPath, `${baseName}.${file.extension}`)
    );

    // 检查文件是否已经在正确的路径（避免重复处理）
    if (normalizePath(file.path) === newPath) {
      return;
    }

    if (activeFile.extension === "md") {
      await this._rename4MD(file, newPath, activeView, activeFile);
    } else if (activeFile.extension === "canvas") {
      await this._rename4Canvas(file, newPath, activeView, activeFile);
    }
  }

  async _rename4MD(
    file: TFile,
    newPath: string,
    activeView: TextFileView,
    activeFile: TFile
  ) {
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
    } catch (error) {
      console.error("Error renaming pasted image for MD:", error);
    }
  }

  async _rename4Canvas(
    file: TFile,
    newPath: string,
    activeView: TextFileView,
    activeFile: TFile
  ) {
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
    } catch (error) {
      console.error("Error renaming pasted image for Canvas:", error);
    }
  }
}
