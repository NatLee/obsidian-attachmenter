import {
    App,
    Modal,
    TFile,
    Vault,
    Notice,
} from "obsidian";
import { t } from "../i18n/index";

/**
 * A confirmation modal for deleting attachment files.
 * Shows a preview of the file (if it's an image) and asks for confirmation.
 */
export class AttachmentDeleteModal extends Modal {
    constructor(
        app: App,
        private vault: Vault,
        private file: TFile,
        private onConfirm: () => Promise<void>
    ) {
        super(app);
        this.modalEl.addClass("attachmenter-delete-confirm-modal");
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Header
        const header = contentEl.createDiv({ cls: "attachmenter-modal-header" });
        const titleRow = header.createDiv({ cls: "attachmenter-title-row" });
        titleRow.createEl("h2", {
            text: t("attachmentManager.deleteConfirm"),
            cls: "attachmenter-modal-title"
        });

        // Check if file is an image to show preview
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
        const isImage = imageExtensions.includes(this.file.extension.toLowerCase());

        if (isImage) {
            // Image preview container
            const previewContainer = contentEl.createDiv({
                cls: "attachmenter-modal-preview"
            });

            // Create image element
            previewContainer.createEl("img", {
                attr: {
                    src: this.vault.getResourcePath(this.file),
                    alt: this.file.name,
                },
                cls: "attachmenter-preview-image",
            });
        }

        // Warning message
        const warningContainer = contentEl.createDiv({
            cls: "attachmenter-delete-warning"
        });

        const warningText = t("attachmentManager.deleteConfirmDesc")
            .replace("{filename}", this.file.name);

        warningContainer.createEl("p", {
            text: warningText,
            cls: "attachmenter-warning-text"
        });

        // File info
        const infoContainer = contentEl.createDiv({
            cls: "attachmenter-modal-info"
        });

        const filePath = infoContainer.createDiv({
            cls: "attachmenter-file-path"
        });
        filePath.createEl("strong", { text: t("common.path") + ": " });
        filePath.createEl("span", { text: this.file.path });

        // Action buttons
        const buttonContainer = contentEl.createDiv({
            cls: "attachmenter-modal-buttons",
        });

        const cancelButton = buttonContainer.createEl("button", {
            text: t("common.cancel"),
        });

        const deleteButton = buttonContainer.createEl("button", {
            text: t("common.delete"),
            cls: "mod-warning",
        });

        cancelButton.onclick = () => {
            this.close();
        };

        deleteButton.onclick = async () => {
            try {
                await this.onConfirm();
                new Notice(t("attachmentManager.deleteSuccess"));
                this.close();
            } catch (error) {
                console.error("Failed to delete attachment:", error);
                new Notice(t("attachmentManager.deleteFailed"));
            }
        };

        // Set focus on Cancel button by default (safer)
        cancelButton.focus();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
