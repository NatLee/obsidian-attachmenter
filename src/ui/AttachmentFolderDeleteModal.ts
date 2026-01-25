import {
    App,
    Modal,
    TFolder,
    Vault,
    Notice
} from "obsidian";
import { t } from "../i18n/index";

/**
 * A confirmation modal for deleting entire attachment folders.
 */
export class AttachmentFolderDeleteModal extends Modal {
    constructor(
        app: App,
        private vault: Vault,
        private folder: TFolder,
        private onConfirm: () => Promise<void>
    ) {
        super(app);
        this.modalEl.addClass("attachmenter-delete-confirm-modal");
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", {
            text: t("attachmentManager.deleteFolderConfirm"),
            cls: "attachmenter-modal-title"
        });

        const warningContainer = contentEl.createDiv({
            cls: "attachmenter-delete-warning"
        });

        // "Are you sure you want to delete the folder '{name}' and all its {count} files?"
        const message = t("attachmentManager.deleteFolderConfirmDesc")
            .replace("{count}", this.folder.children.length.toString())
            .replace("{foldername}", this.folder.name);

        warningContainer.createEl("p", {
            text: message,
            cls: "attachmenter-warning-text"
        });

        // Folder info
        const infoContainer = contentEl.createDiv({
            cls: "attachmenter-modal-info"
        });

        const pathRow = infoContainer.createDiv({ cls: "attachmenter-info-row" });
        pathRow.createEl("strong", { text: t("common.path") + ": " });
        pathRow.createEl("span", { text: this.folder.path });

        // Buttons
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

        cancelButton.onclick = () => this.close();

        deleteButton.onclick = async () => {
            try {
                await this.onConfirm();
                new Notice(t("attachmentManager.deleteFolderSuccess"));
                this.close();
            } catch (error) {
                console.error("Failed to delete folder:", error);
                new Notice(t("attachmentManager.deleteFailed"));
            }
        };

        cancelButton.focus();
    }

    onClose() {
        this.contentEl.empty();
    }
}
