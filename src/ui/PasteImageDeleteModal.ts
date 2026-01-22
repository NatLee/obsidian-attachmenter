import {
  App,
  Modal,
  TFile,
  TextFileView,
  Vault,
} from "obsidian";
import { t } from "../i18n/index";

export class PasteImageDeleteModal extends Modal {
  constructor(
    app: App,
    private vault: Vault,
    private file: TFile,
    private linkTextOrPath: string,
    private activeView: TextFileView,
    private activeFile: TFile,
    private onDelete: () => Promise<void>
  ) {
    super(app);
    this.modalEl.addClass("attachmenter-paste-modal");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Header
    const header = contentEl.createDiv({ cls: "attachmenter-modal-header" });
    header.createEl("h2", { 
      text: t("pasteImage.pastedTitle"),
      cls: "attachmenter-modal-title"
    });

    // Image preview container
    const previewContainer = contentEl.createDiv({ 
      cls: "attachmenter-modal-preview" 
    });
    
    // Create image element
    previewContainer.createEl("img", {
      attr: {
        src: this.vault.getResourcePath(this.file),
        alt: t("pasteImage.previewAlt"),
      },
      cls: "attachmenter-preview-image",
    });

    // Image info
    const infoContainer = contentEl.createDiv({ 
      cls: "attachmenter-modal-info" 
    });
    
    const fileName = infoContainer.createDiv({ 
      cls: "attachmenter-file-name" 
    });
    fileName.createEl("strong", { text: t("common.file") + ": " });
    fileName.createEl("span", { text: this.file.name });

    const filePath = infoContainer.createDiv({ 
      cls: "attachmenter-file-path" 
    });
    filePath.createEl("strong", { text: t("common.path") + ": " });
    filePath.createEl("span", { text: this.file.path });

    // Action buttons
    const buttonContainer = contentEl.createDiv({
      cls: "attachmenter-modal-buttons",
    });

    const keepButton = buttonContainer.createEl("button", {
      text: t("pasteImage.keepImage"),
      cls: "mod-cta",
    });

    const deleteButton = buttonContainer.createEl("button", {
      text: t("common.delete"),
      cls: "mod-warning",
    });

    keepButton.onclick = () => {
      this.close();
    };

    deleteButton.onclick = async () => {
      await this.onDelete();
      this.close();
    };

    // Set focus on Keep button by default
    keepButton.focus();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
