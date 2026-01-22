import {
  App,
  FileManager,
  Modal,
  Notice,
  normalizePath,
  Setting,
  TFile,
  TextFileView,
  Vault,
  Workspace,
} from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import { PathResolver } from "../path/PathResolver";

// Simple path utilities for browser environment
function join(...parts: string[]): string {
  return parts
    .filter((p) => p)
    .join("/")
    .replace(/\/+/g, "/");
}

export class PasteImageManagerModal extends Modal {
  private currentPath: string;
  private originalPath: string;
  private pathResolver: PathResolver;
  private isDeleting: boolean = false;
  private actionsPanelContainer: HTMLElement | null = null;

  constructor(
    app: App,
    private vault: Vault,
    private fileManager: FileManager,
    private workspace: Workspace,
    private file: TFile,
    private linkTextOrPath: string,
    private activeView: TextFileView,
    private activeFile: TFile,
    private folderPath: string,
    private settings: AttachmenterSettings,
    private onDelete: (folderPath: string) => Promise<void>,
    private onRename: (newPath: string) => Promise<void>
  ) {
    super(app);
    this.modalEl.addClass("attachmenter-paste-manager-modal");
    this.pathResolver = new PathResolver(vault, settings);
    this.originalPath = file.path;
    this.currentPath = file.path;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Header
    const header = contentEl.createDiv({ cls: "attachmenter-modal-header" });
    const titleRow = header.createDiv({ cls: "attachmenter-title-row" });
    titleRow.createEl("h2", {
      text: "Manage Pasted Image",
      cls: "attachmenter-modal-title",
    });

    // Single page layout container
    const layoutContainer = contentEl.createDiv({
      cls: "attachmenter-single-page-layout",
    });
    this._renderSinglePageLayout(layoutContainer);

    // Footer buttons
    const footer = contentEl.createDiv({ cls: "attachmenter-modal-footer" });
    const keepButton = footer.createEl("button", {
      text: "Keep",
      cls: "mod-cta",
    });
    keepButton.onclick = () => {
      this.close();
    };

    // Set focus on Keep button by default
    keepButton.focus();

    // Add ESC key support for canceling delete confirmation
    this.scope.register(["Escape"], (evt) => {
      if (this.isDeleting) {
        this.isDeleting = false;
        if (this.actionsPanelContainer) {
          this._renderActionsPanel(this.actionsPanelContainer);
        }
        return false; // Prevent default behavior (closing modal)
      }
      // Let default ESC behavior work for closing modal when not in delete confirmation
      return true;
    });
  }

  private _renderSinglePageLayout(container: HTMLElement) {
    // Top section: Preview and Info (two columns)
    const topSection = container.createDiv({
      cls: "attachmenter-top-section",
    });

    // Preview section (left)
    const previewSection = topSection.createDiv({
      cls: "attachmenter-preview-section",
    });
    const previewContainer = previewSection.createDiv({
      cls: "attachmenter-modal-preview",
    });
    const img = previewContainer.createEl("img", {
      attr: {
        src: this.vault.getResourcePath(this.file),
        alt: "Pasted image preview",
      },
      cls: "attachmenter-preview-image",
    });

    // Info section (right)
    const infoSection = topSection.createDiv({
      cls: "attachmenter-info-section",
    });
    const infoContainer = infoSection.createDiv({
      cls: "attachmenter-modal-info",
    });
    const fileName = infoContainer.createDiv({
      cls: "attachmenter-file-name",
    });
    fileName.createEl("strong", { text: "File: " });
    fileName.createEl("span", { text: this.file.name });

    const filePath = infoContainer.createDiv({
      cls: "attachmenter-file-path",
    });
    filePath.createEl("strong", { text: "Path: " });
    filePath.createEl("span", { text: this.file.path });

    // Path section (full width)
    const pathSection = container.createDiv({
      cls: "attachmenter-path-section",
    });
    this._renderPathPanel(pathSection);

    // Actions section (full width)
    const actionsSection = container.createDiv({
      cls: "attachmenter-actions-section",
    });
    this.actionsPanelContainer = actionsSection;
    this._renderActionsPanel(actionsSection);
  }

  private _renderPathPanel(container: HTMLElement) {
    container.createEl("p", {
      text: "Change the save location for this image:",
      cls: "attachmenter-description",
    });

    // Current path display
    const currentPathSetting = new Setting(container)
      .setName("Current path")
      .setDesc(this.currentPath)
      .setDisabled(true);

    // New path input
    const newPathSetting = new Setting(container)
      .setName("New path")
      .setDesc("Enter the new path for this image")
      .addText((text) => {
        text.setValue(this.currentPath);
        text.inputEl.onchange = () => {
          this.currentPath = text.getValue();
        };
      });

    // Suggested paths
    const suggestedContainer = container.createDiv({
      cls: "attachmenter-suggested-paths",
    });
    suggestedContainer.createEl("p", {
      text: "Suggested paths:",
      cls: "attachmenter-suggested-title",
    });

    // Get suggested path (current attachment folder)
    const suggestedPath = this.pathResolver.getAttachmentFolderForNote(
      this.activeFile
    );
    const suggestedFullPath = normalizePath(
      join(suggestedPath, this.file.name)
    );

    const suggestedItem = suggestedContainer.createDiv({
      cls: "attachmenter-suggested-item",
    });
    suggestedItem.createEl("code", { text: suggestedFullPath });
    const useSuggestedBtn = suggestedItem.createEl("button", {
      text: "Use",
      cls: "mod-small",
    });
    useSuggestedBtn.onclick = () => {
      newPathSetting.settingEl.querySelector("input")?.setValue(
        suggestedFullPath
      );
      this.currentPath = suggestedFullPath;
    };

    // Apply button
    const applyButton = container.createEl("button", {
      text: "Apply Path Change",
      cls: "mod-cta",
    });
    applyButton.onclick = async () => {
      if (this.currentPath !== this.originalPath) {
        try {
          await this.onRename(this.currentPath);
          this.originalPath = this.currentPath;
          new Notice("Path updated successfully");
          // Update display
          currentPathSetting.setDesc(this.currentPath);
        } catch (error) {
          console.error("Error changing path:", error);
          new Notice("Failed to change path");
        }
      }
    };
  }

  private _renderActionsPanel(container: HTMLElement) {
    // Clear container first
    container.empty();
    
    if (this.isDeleting) {
      this._renderDeleteConfirmation(container);
    } else {
      this._renderNormalActions(container);
    }
  }

  private _renderNormalActions(container: HTMLElement) {
    container.createEl("p", {
      text: "Available actions for this image:",
      cls: "attachmenter-description",
    });

    // Delete button
    const deleteContainer = container.createDiv({
      cls: "attachmenter-action-item",
    });
    deleteContainer.createEl("div", {
      cls: "attachmenter-action-info",
    }).createEl("strong", { text: "Delete Image" });
    deleteContainer
      .createEl("div", {
        cls: "attachmenter-action-desc",
      })
      .createEl("p", {
        text: "Remove this image from your vault and the note",
      });

    const deleteButton = deleteContainer.createEl("button", {
      text: "Delete",
      cls: "mod-warning",
    });
    deleteButton.onclick = () => {
      this.isDeleting = true;
      if (this.actionsPanelContainer) {
        this._renderActionsPanel(this.actionsPanelContainer);
      }
    };

    // Move to attachment folder button
    const moveContainer = container.createDiv({
      cls: "attachmenter-action-item",
    });
    moveContainer
      .createEl("div", { cls: "attachmenter-action-info" })
      .createEl("strong", { text: "Move to Attachment Folder" });
    moveContainer
      .createEl("div", { cls: "attachmenter-action-desc" })
      .createEl("p", {
        text: "Move this image to the note's attachment folder",
      });

    const moveButton = moveContainer.createEl("button", {
      text: "Move",
      cls: "mod-cta",
    });
    moveButton.onclick = async () => {
      const suggestedPath = this.pathResolver.getAttachmentFolderForNote(
        this.activeFile
      );
      const newPath = normalizePath(join(suggestedPath, this.file.name));
      try {
        await this.onRename(newPath);
        this.currentPath = newPath;
        this.originalPath = newPath;
        new Notice("Image moved successfully");
      } catch (error) {
        console.error("Error moving image:", error);
        new Notice("Failed to move image");
      }
    };
  }

  private _renderDeleteConfirmation(container: HTMLElement) {
    // Warning message
    const warningContainer = container.createDiv({
      cls: "attachmenter-delete-warning",
    });
    warningContainer.createEl("p", {
      text: "⚠️ Are you sure you want to delete this image?",
      cls: "attachmenter-warning-text",
    });
    warningContainer.createEl("p", {
      text: "This action cannot be undone.",
      cls: "attachmenter-warning-detail",
    });

    // Button container
    const buttonContainer = container.createDiv({
      cls: "attachmenter-delete-buttons",
    });

    const cancelButton = buttonContainer.createEl("button", {
      text: "Cancel",
      cls: "mod-cta",
    });
    cancelButton.onclick = () => {
      this.isDeleting = false;
      if (this.actionsPanelContainer) {
        this._renderActionsPanel(this.actionsPanelContainer);
      }
    };

    const confirmButton = buttonContainer.createEl("button", {
      text: "Confirm Delete",
      cls: "mod-warning",
    });
    confirmButton.onclick = async () => {
      try {
        await this.onDelete(this.folderPath);
        this.close();
      } catch (error) {
        console.error("Error deleting image:", error);
        new Notice("Failed to delete image");
        // Reset to normal state on error
        this.isDeleting = false;
        if (this.actionsPanelContainer) {
          this._renderActionsPanel(this.actionsPanelContainer);
        }
      }
    };

    // Set focus on cancel button by default for safety
    cancelButton.focus();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
