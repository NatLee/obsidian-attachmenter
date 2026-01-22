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
import { t } from "../i18n/index";

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
  private footerContainer: HTMLElement | null = null;
  private warningContainer: HTMLElement | null = null;

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
      text: t("pasteImage.manageTitle"),
      cls: "attachmenter-modal-title",
    });

    // Single page layout container
    const layoutContainer = contentEl.createDiv({
      cls: "attachmenter-single-page-layout",
    });
    this._renderSinglePageLayout(layoutContainer);

    // Footer
    this.footerContainer = contentEl.createDiv({ cls: "attachmenter-modal-footer" });
    this.updateUi();

    // Add ESC key support for canceling delete confirmation
    this.scope.register([], "Escape", (evt) => {
      if (this.isDeleting) {
        this.isDeleting = false;
        this.updateUi();
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
        alt: t("pasteImage.previewAlt"),
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
    fileName.createEl("strong", { text: t("common.file") + ": " });
    fileName.createEl("span", { text: this.file.name });

    const filePath = infoContainer.createDiv({
      cls: "attachmenter-file-path",
    });
    filePath.createEl("strong", { text: t("common.path") + ": " });
    filePath.createEl("span", { text: this.file.path });

    // Path section (full width) - Manual path editing remains
    const pathSection = container.createDiv({
      cls: "attachmenter-path-section",
    });
    this._renderPathPanel(pathSection);

    // Warning section (placeholder for delete warning)
    this.warningContainer = container.createDiv({
      cls: "attachmenter-delete-warning-container",
    });
    this.updateWarning();
  }

  private _renderPathPanel(container: HTMLElement) {
    container.createEl("p", {
      text: t("pasteImage.changeLocation"),
      cls: "attachmenter-description",
    });

    // Current path display
    const currentPathSetting = new Setting(container)
      .setName(t("pasteImage.currentPath"))
      .setDesc(this.currentPath)
      .setDisabled(true);

    // New path input
    const newPathSetting = new Setting(container)
      .setName(t("pasteImage.newPath"))
      .setDesc(t("pasteImage.newPathDesc"))
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
      text: t("pasteImage.suggestedPaths"),
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
    
    // "Use" button just fills the input, it does not execute a move (Quick Move removed)
    const useSuggestedBtn = suggestedItem.createEl("button", {
      text: t("pasteImage.use"),
      cls: "mod-small",
    });
    useSuggestedBtn.onclick = () => {
      const input = newPathSetting.settingEl.querySelector("input");
      if (input) {
        input.value = suggestedFullPath;
        // Trigger generic update since onchange might not fire
        this.currentPath = suggestedFullPath;
      }
    };

    // Apply button
    const applyButton = container.createEl("button", {
      text: t("pasteImage.applyPathChange"),
      cls: "mod-cta",
    });
    applyButton.onclick = async () => {
      if (this.currentPath !== this.originalPath) {
        try {
          await this.onRename(this.currentPath);
          this.originalPath = this.currentPath;
          new Notice(t("notices.pathUpdated"));
          // Update display
          currentPathSetting.setDesc(this.currentPath);
        } catch (error) {
          console.error("Error changing path:", error);
          new Notice(t("notices.pathUpdateFailed"));
        }
      }
    };
  }

  private updateUi() {
    this.updateFooter();
    this.updateWarning();
  }

  private updateFooter() {
    if (!this.footerContainer) return;
    this.footerContainer.empty();

    if (this.isDeleting) {
      // Delete Confirmation State: [Confirm Delete] [Cancel]
      const confirmBtn = this.footerContainer.createEl("button", {
        text: t("pasteImage.confirmDelete"),
        cls: "mod-warning",
      });
      confirmBtn.onclick = async () => {
        try {
          await this.onDelete(this.folderPath);
          this.close();
        } catch (error) {
          console.error("Error deleting image:", error);
          new Notice(t("notices.imageDeleteFailed"));
          this.isDeleting = false;
          this.updateUi();
        }
      };

      const cancelBtn = this.footerContainer.createEl("button", {
        text: t("common.cancel"),
        cls: "mod-cta",
      });
      cancelBtn.onclick = () => {
        this.isDeleting = false;
        this.updateUi();
      };

      cancelBtn.focus();

    } else {
      // Normal State: [Delete] [Keep]
      // Delete is placed first (left)
      const deleteBtn = this.footerContainer.createEl("button", {
        text: t("pasteImage.delete"),
        cls: "mod-warning",
      });
      deleteBtn.onclick = () => {
        this.isDeleting = true;
        this.updateUi();
      };

      const keepBtn = this.footerContainer.createEl("button", {
        text: t("common.keep"),
        cls: "mod-cta",
      });
      keepBtn.onclick = () => {
        this.close();
      };

      keepBtn.focus();
    }
  }

  private updateWarning() {
    if (!this.warningContainer) return;
    this.warningContainer.empty();

    // Only show warning text if in deleting state
    if (this.isDeleting) {
      const warningBox = this.warningContainer.createDiv({
        cls: "attachmenter-delete-warning",
      });
      warningBox.createEl("p", {
        text: t("pasteImage.deleteConfirm"),
        cls: "attachmenter-warning-text",
      });
      warningBox.createEl("p", {
        text: t("pasteImage.deleteConfirmDesc"),
        cls: "attachmenter-warning-detail",
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}