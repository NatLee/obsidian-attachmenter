import { ItemView, WorkspaceLeaf, TFile, TFolder } from "obsidian";
import type AttachmenterPlugin from "../../main";
import { buildFolderRegExp } from "./HideFolderRibbon";
import { t } from "../i18n/index";

export const ATTACHMENT_FOLDER_VIEW_TYPE = "attachment-folder-manager";

export class AttachmentFolderManagerView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: AttachmenterPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return ATTACHMENT_FOLDER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t("attachmentFolderManager.title");
  }

  getIcon(): string {
    return "folder";
  }

  async onOpen() {
    void this.render();

    // Listen for vault changes to refresh the view
    this.registerEvent(
      this.plugin.app.vault.on("create", () => {
        void this.render();
      })
    );
    this.registerEvent(
      this.plugin.app.vault.on("delete", () => {
        void this.render();
      })
    );
    this.registerEvent(
      this.plugin.app.vault.on("rename", () => {
        void this.render();
      })
    );
  }

  async onClose() {
    // Cleanup if needed
  }

  render() {
    const container = this.contentEl;
    container.empty();
    container.addClass("attachment-folder-manager-view");

    // Add header with refresh button (compact for sidebar)
    const header = container.createDiv({ cls: "attachment-folder-manager-header" });
    const refreshButton = header.createEl("button", {
      text: t("attachmentFolderManager.refresh"),
      cls: "mod-cta"
    });
    refreshButton.onclick = () => {
      void this.render();
    };

    // Find all attachment folders
    const folders = this.findAttachmentFolders();

    if (folders.length === 0) {
      container.createDiv({
        text: t("attachmentFolderManager.empty"),
        cls: "attachment-folder-empty"
      });
      return;
    }

    // Create folder list
    const folderList = container.createDiv({ cls: "attachment-folder-list" });
    folders.forEach((folder) => {
      const folderEl = folderList.createDiv({ cls: "attachment-folder-item" });
      folderEl.createDiv({
        text: folder.path,
        cls: "folder-path"
      });

      const fileCount = folder.children?.filter(f => f instanceof TFile).length || 0;
      const fileCountText = fileCount === 1
        ? t("attachmentFolderManager.fileCount", { count: fileCount })
        : t("attachmentFolderManager.fileCount", { count: fileCount }) + "s";
      folderEl.createDiv({
        text: fileCountText,
        cls: "folder-count"
      });

      folderEl.onclick = () => {
        void this.plugin.app.workspace.openLinkText(folder.path, "", true);
      };
    });
  }

  private findAttachmentFolders(): TFolder[] {
    const filter = buildFolderRegExp(this.plugin.settings);
    const folders: TFolder[] = [];

    const walkFolder = (folder: TFolder) => {
      if (filter.test(folder.name)) {
        folders.push(folder);
      }
      folder.children?.forEach((child) => {
        if (child instanceof TFolder) {
          walkFolder(child);
        }
      });
    };

    const root = this.plugin.app.vault.getRoot();
    root.children?.forEach((child) => {
      if (child instanceof TFolder) {
        walkFolder(child);
      }
    });

    return folders;
  }
}
