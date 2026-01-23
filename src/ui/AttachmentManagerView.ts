import { ItemView, WorkspaceLeaf, TFile, TFolder, setIcon, Notice } from "obsidian";
import type AttachmenterPlugin from "../../main";
import { buildFolderRegExp } from "./HideFolderRibbon";
import { t } from "../i18n/index";
import { RenameImageModal } from "./RenameImageModal";
import { AttachmentRenameHandler } from "../handler/AttachmentRenameHandler";
import { PathResolver } from "../path/PathResolver";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { AttachmentDeleteModal } from "./AttachmentDeleteModal";

export const ATTACHMENT_MANAGER_VIEW_TYPE = "attachment-manager";

interface AttachmentItem {
  file: TFile;
  folder: TFolder;
  noteFile: TFile | null; // The note that owns this attachment folder
}

export class AttachmentManagerView extends ItemView {
  private attachmentItems: AttachmentItem[] = [];
  private renameHandler: AttachmentRenameHandler;
  private isRendering: boolean = false;
  private renderTimeout: number | null = null;

  constructor(leaf: WorkspaceLeaf, private plugin: AttachmenterPlugin) {
    super(leaf);
    this.renameHandler = new AttachmentRenameHandler(
      this.plugin.app.vault,
      this.plugin.app.fileManager,
      this.plugin.app.metadataCache
    );
  }

  getViewType(): string {
    return ATTACHMENT_MANAGER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t("attachmentManager.title");
  }

  getIcon(): string {
    return "folder";
  }

  async onOpen() {
    await this.render();

    // Listen for vault changes to refresh the view (with debounce)
    // Note: Manual calls to render() bypass this debounce via isRendering lock
    let renderTimeout: number | null = null;
    const debouncedRender = () => {
      if (this.isRendering) {
        // If already rendering, skip this debounced call
        return;
      }
      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }
      renderTimeout = window.setTimeout(() => {
        if (!this.isRendering) {
          this.render();
        }
      }, 300);
    };

    this.registerEvent(
      this.plugin.app.vault.on("create", debouncedRender)
    );
    this.registerEvent(
      this.plugin.app.vault.on("delete", debouncedRender)
    );
    this.registerEvent(
      this.plugin.app.vault.on("rename", debouncedRender)
    );

    // Also listen for workspace layout changes
    this.registerEvent(
      this.plugin.app.workspace.on("layout-change", debouncedRender)
    );
  }

  async onClose() {
    // Cleanup if needed
  }

  async render() {
    // Prevent concurrent rendering
    if (this.isRendering) {
      console.log("AttachmentManagerView: Render already in progress, skipping...");
      return;
    }

    this.isRendering = true;

    try {
      const container = this.contentEl;

      // Clear previous content
      if (container.hasClass("attachmenter-manager-view")) {
        container.empty();
      } else {
        container.empty();
        container.addClass("attachmenter-manager-view");
      }

      // Find all attachments BEFORE clearing to ensure we have data
      // Use latest settings from plugin
      this.attachmentItems = this.findAllAttachments();

      // Header
      const header = container.createDiv({ cls: "attachmenter-manager-header" });
      const title = header.createEl("h2", { text: t("attachmentManager.title") });
      const refreshButton = header.createEl("button", {
        text: t("attachmentManager.refresh"),
        cls: "mod-cta"
      });
      refreshButton.onclick = () => {
        this.render();
      };

      // Show count in header
      const countSpan = header.createEl("span", {
        text: ` (${this.attachmentItems.length})`,
        cls: "attachmenter-manager-count"
      });
      countSpan.style.marginLeft = "0.5em";
      countSpan.style.color = "var(--text-muted)";
      countSpan.style.fontSize = "0.9em";

      if (this.attachmentItems.length === 0) {
        container.createDiv({
          text: t("attachmentManager.empty"),
          cls: "attachmenter-manager-empty"
        });
        return;
      }

      // Group by folder
      const groupedByFolder = this.groupByFolder(this.attachmentItems);

      // Render grouped list
      const listContainer = container.createDiv({ cls: "attachmenter-manager-list" });

      Object.entries(groupedByFolder).forEach(([folderPath, items]) => {
        const folderSection = listContainer.createDiv({ cls: "attachmenter-manager-folder-section" });

        // Folder header
        const folderHeader = folderSection.createDiv({ cls: "attachmenter-manager-folder-header" });
        folderHeader.createEl("h3", { text: folderPath });
        const noteLink = items[0].noteFile;
        if (noteLink) {
          const noteButton = folderHeader.createEl("button", {
            text: t("attachmentManager.openNote"),
            cls: "mod-cta"
          });
          noteButton.style.marginLeft = "1em";
          noteButton.onclick = () => {
            this.plugin.app.workspace.openLinkText(noteLink.path, "", true);
          };
        }

        // Attachments list
        const attachmentsList = folderSection.createDiv({ cls: "attachmenter-manager-attachments" });
        items.forEach((item) => {
          this.renderAttachmentItem(item, attachmentsList);
        });
      });
    } catch (error) {
      console.error("Error rendering attachment manager:", error);
      const container = this.contentEl;
      container.createDiv({
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        cls: "attachmenter-manager-error"
      });
    } finally {
      // Reset rendering flag after a short delay to allow DOM to settle
      setTimeout(() => {
        this.isRendering = false;
      }, 100);
    }
  }

  private findAllAttachments(): AttachmentItem[] {
    // Ensure we use the latest settings from plugin
    const currentSettings = this.plugin.settings;
    const filter = buildFolderRegExp(currentSettings);
    const items: AttachmentItem[] = [];
    const pathResolver = new PathResolver(
      this.plugin.app.vault,
      currentSettings
    );

    // Debug log to verify settings are correct
    console.log("AttachmentManagerView: Finding attachments with folder suffix:", currentSettings.defaultFolderSuffix);

    // Find all attachment folders
    const root = this.plugin.app.vault.getRoot();
    const walkFolder = (folder: TFolder) => {
      if (filter.test(folder.name)) {
        // This is an attachment folder, find the note that owns it
        const noteFile = this.findNoteForAttachmentFolder(folder, pathResolver);

        // Get all files in this folder
        folder.children?.forEach((child) => {
          if (child instanceof TFile) {
            items.push({
              file: child,
              folder: folder,
              noteFile: noteFile
            });
          }
        });
      }
      folder.children?.forEach((child) => {
        if (child instanceof TFolder) {
          walkFolder(child);
        }
      });
    };

    root.children?.forEach((child) => {
      if (child instanceof TFolder) {
        walkFolder(child);
      }
    });

    console.log(`AttachmentManagerView: Found ${items.length} attachments`);
    return items;
  }

  private findNoteForAttachmentFolder(
    attachmentFolder: TFolder,
    pathResolver: any
  ): TFile | null {
    // Try to find the note by matching folder name pattern
    // Use latest settings
    const folderName = attachmentFolder.name;
    const folderSuffix = this.plugin.settings.defaultFolderSuffix || "_Attachments";

    // Extract note name from folder name (remove suffix)
    if (folderName.endsWith(folderSuffix)) {
      const noteName = folderName.substring(0, folderName.length - folderSuffix.length);

      // Search for the note file
      const allNotes = this.plugin.app.vault.getMarkdownFiles();
      const folderDir = attachmentFolder.parent?.path || "";

      // Try exact match first
      let noteFile = allNotes.find(n =>
        n.basename === noteName &&
        (folderDir === "" || n.path.startsWith(folderDir))
      );

      if (!noteFile) {
        // Try sanitized name match
        noteFile = allNotes.find(n => {
          const sanitized = n.basename.replace(/[#<>:"|?*]/g, " ");
          return sanitized === noteName || sanitized.trim() === noteName.trim();
        });
      }

      return noteFile || null;
    }

    return null;
  }

  private groupByFolder(items: AttachmentItem[]): Record<string, AttachmentItem[]> {
    const grouped: Record<string, AttachmentItem[]> = {};
    items.forEach((item) => {
      const folderPath = item.folder.path;
      if (!grouped[folderPath]) {
        grouped[folderPath] = [];
      }
      grouped[folderPath].push(item);
    });
    return grouped;
  }

  private renderAttachmentItem(item: AttachmentItem, container: HTMLElement) {
    const itemEl = container.createDiv({ cls: "attachmenter-manager-item" });

    // Left side: file info
    const fileInfo = itemEl.createDiv({ cls: "attachmenter-manager-item-info" });

    const fileIcon = fileInfo.createSpan({ cls: "attachmenter-manager-item-icon" });
    setIcon(fileIcon, this.getFileIcon(item.file.extension));

    const fileName = fileInfo.createSpan({ cls: "attachmenter-manager-item-name" });
    fileName.textContent = item.file.name;

    // Right side: actions
    const actions = itemEl.createDiv({ cls: "attachmenter-manager-item-actions" });

    // Preview button
    const previewButton = actions.createEl("button", {
      text: t("attachmentManager.preview"),
      cls: "mod-cta"
    });
    previewButton.onclick = () => {
      this.showPreview(item.file);
    };

    // Rename button
    const renameButton = actions.createEl("button", {
      text: t("attachmentManager.rename")
    });
    renameButton.onclick = () => {
      this.showRenameDialog(item);
    };

    // Delete button
    const deleteButton = actions.createEl("button", {
      text: t("attachmentManager.delete"),
      cls: "mod-warning"
    });
    deleteButton.onclick = () => {
      this.showDeleteConfirmation(item);
    };

    // Open note button (if available)
    if (item.noteFile) {
      const openNoteButton = actions.createEl("button", {
        text: t("attachmentManager.openNote")
      });
      openNoteButton.onclick = () => {
        this.plugin.app.workspace.openLinkText(item.noteFile!.path, "", true);
      };
    }
  }

  private getFileIcon(extension: string): string {
    const iconMap: Record<string, string> = {
      'png': 'file-image',
      'jpg': 'file-image',
      'jpeg': 'file-image',
      'gif': 'file-image',
      'svg': 'file-image',
      'webp': 'file-image',
      'pdf': 'file-text',
      'mp4': 'video',
      'mp3': 'headphones',
      'zip': 'archive',
    };
    return iconMap[extension.toLowerCase()] || 'file';
  }

  private showPreview(file: TFile) {
    const modal = new AttachmentPreviewModal(
      this.plugin.app,
      this.plugin.app.vault,
      file
    );
    modal.open();
  }

  private async showRenameDialog(item: AttachmentItem) {
    const defaultName = item.file.basename;
    const modal = new RenameImageModal(
      this.plugin.app,
      item.file,
      defaultName,
      async (newName: string) => {
        await this.renameHandler.renameAttachment(
          item.file,
          newName,
          item.noteFile
        );
        // Refresh the view
        await this.render();
        // Refresh file attachment trees
        this.plugin.fileAttachmentTree.refreshAllFiles();
      }
    );
    modal.open();
  }

  private showDeleteConfirmation(item: AttachmentItem) {
    const modal = new AttachmentDeleteModal(
      this.plugin.app,
      this.plugin.app.vault,
      item.file,
      async () => {
        // Delete the file
        await this.plugin.app.vault.trash(item.file, true);
        // Refresh the view
        await this.render();
        // Refresh file attachment trees
        this.plugin.fileAttachmentTree.refreshAllFiles();
      }
    );
    modal.open();
  }
}
