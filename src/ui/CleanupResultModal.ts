import { App, Modal, Setting, TFolder, Notice } from "obsidian";
import { t } from "../i18n/index";

export class CleanupResultModal extends Modal {
    constructor(
        app: App,
        private emptyFolders: TFolder[],
        private onConfirm: (folders: TFolder[]) => Promise<void>
    ) {
        super(app);
        this.modalEl.addClass("attachmenter-cleanup-modal");
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", {
            text: t("settings.cleanup.modalTitle"),
            cls: "attachmenter-modal-title",
        });

        if (this.emptyFolders.length === 0) {
            contentEl.createDiv({
                text: t("settings.cleanup.noEmptyFolders"),
                cls: "attachmenter-cleanup-message",
            });

            const buttonContainer = contentEl.createDiv({
                cls: "attachmenter-modal-buttons",
            });
            new Setting(buttonContainer).addButton((btn) =>
                btn.setButtonText(t("common.close")).onClick(() => this.close())
            );
            return;
        }

        contentEl.createDiv({
            text: t("settings.cleanup.foundFolders").replace("{count}", this.emptyFolders.length.toString()),
            cls: "attachmenter-cleanup-message",
        });

        const listContainer = contentEl.createDiv({
            cls: "attachmenter-cleanup-list-container",
        });

        const ul = listContainer.createEl("ul", { cls: "attachmenter-cleanup-list" });
        this.emptyFolders.forEach((folder) => {
            ul.createEl("li", { text: folder.path });
        });

        const buttonContainer = contentEl.createDiv({
            cls: "attachmenter-modal-buttons",
        });

        const cancelButton = buttonContainer.createEl("button", {
            text: t("common.cancel"),
        });

        const deleteAllBtn = buttonContainer.createEl("button", {
            text: t("settings.cleanup.deleteAll"),
            cls: "mod-warning",
        });

        cancelButton.onclick = () => this.close();

        deleteAllBtn.onclick = async () => {
            try {
                await this.onConfirm(this.emptyFolders);
                this.close();
            } catch (error) {
                console.error(error);
                new Notice(t("settings.cleanup.deleteFailed"));
            }
        };
    }

    onClose() {
        this.contentEl.empty();
    }
}
