import { App, Modal, TFile, Vault } from "obsidian";
import { t } from "../i18n/index";

export class AttachmentPreviewModal extends Modal {
  constructor(
    app: App,
    private vault: Vault,
    private file: TFile
  ) {
    super(app);
    this.modalEl.addClass("attachmenter-preview-modal");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: this.file.name });

    // Check if it's an image
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];
    const isImage = imageExtensions.includes(this.file.extension.toLowerCase());

    if (isImage) {
      // Show image preview
      const previewContainer = contentEl.createDiv({ cls: "attachmenter-modal-preview" });
      previewContainer.createEl("img", {
        attr: {
          src: this.vault.getResourcePath(this.file),
          alt: this.file.name,
        },
        cls: "attachmenter-preview-image",
      });
    } else {
      // Show file info for non-image files
      const infoContainer = contentEl.createDiv({ cls: "attachmenter-modal-info" });
      infoContainer.createEl("p", { text: t("attachmentManager.previewNotAvailable") });
    }

    // File info
    const infoContainer = contentEl.createDiv({ cls: "attachmenter-modal-info" });
    const fileName = infoContainer.createDiv({ cls: "attachmenter-file-name" });
    fileName.createEl("strong", { text: t("common.file") + ": " });
    fileName.createEl("span", { text: this.file.name });

    const filePath = infoContainer.createDiv({ cls: "attachmenter-file-path" });
    filePath.createEl("strong", { text: t("common.path") + ": " });
    filePath.createEl("span", { text: this.file.path });

    // Close button
    const buttonContainer = contentEl.createDiv({ cls: "attachmenter-modal-buttons" });
    buttonContainer.createEl("button", {
      text: t("common.close"),
      cls: "mod-cta"
    }).onclick = () => {
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
