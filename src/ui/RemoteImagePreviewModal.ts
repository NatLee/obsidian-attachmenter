import { App, Modal, TFile } from "obsidian";
import { t } from "../i18n/index";

/**
 * Modal for previewing remote images in Obsidian.
 * Shows the remote image in an Obsidian modal instead of opening a browser.
 * Includes a button to open in external browser if needed.
 */
export class RemoteImagePreviewModal extends Modal {
    constructor(
        app: App,
        private imageUrl: string,
        private imageAlt: string,
        private noteFile: TFile | null = null,
        private onCloseCallback?: () => void
    ) {
        super(app);
        this.modalEl.addClass("attachmenter-preview-modal");
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Title
        const displayName = this.imageAlt || this.imageUrl.split('/').pop() || t("fileAttachmentTree.remoteImages");
        contentEl.createEl("h2", { text: displayName });

        // Show image preview
        const previewContainer = contentEl.createDiv({ cls: "attachmenter-modal-preview" });
        const img = previewContainer.createEl("img", {
            attr: {
                src: this.imageUrl,
                alt: this.imageAlt || "Remote Image",
            },
            cls: "attachmenter-preview-image",
        });

        // Handle image loading error
        img.onerror = () => {
            previewContainer.empty();
            previewContainer.createEl("p", {
                text: t("fileAttachmentTree.remoteLoadError"),
                cls: "attachmenter-error-message"
            });
        };

        // URL info
        const infoContainer = contentEl.createDiv({ cls: "attachmenter-modal-info" });
        const urlRow = infoContainer.createDiv({ cls: "attachmenter-file-path" });
        urlRow.createEl("strong", { text: "URL: " });
        const urlSpan = urlRow.createEl("span", { text: this.imageUrl });
        urlSpan.style.wordBreak = "break-all";

        // Note file info if available
        if (this.noteFile) {
            const noteRow = infoContainer.createDiv({ cls: "attachmenter-file-name" });
            noteRow.createEl("strong", { text: t("common.file") + ": " });
            noteRow.createEl("span", { text: this.noteFile.name });
        }

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: "attachmenter-modal-buttons" });

        // Open in browser button
        buttonContainer.createEl("button", {
            text: t("fileAttachmentTree.openInBrowser"),
        }).onclick = () => {
            window.open(this.imageUrl, '_blank');
        };

        // Close button
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
        if (this.onCloseCallback) {
            this.onCloseCallback();
        }
    }
}
