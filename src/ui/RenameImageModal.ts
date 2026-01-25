import { App, Modal, Setting, TFile } from "obsidian";
import { PathSanitizer } from "../lib/pathSanitizer";
import { t } from "../i18n/index";

export class RenameImageModal extends Modal {
  private newName: string;
  private resolved: boolean = false;
  private actionButtonsContainer: HTMLElement | null = null;

  constructor(
    app: App,
    private imageFile: TFile,
    private defaultName: string,
    private onConfirm: (newName: string) => Promise<void>,
    private onDelete?: () => Promise<void>,
    private onCancel?: () => void
  ) {
    super(app);
    this.newName = defaultName;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: t("renameImage.title") });

    contentEl.createEl("p", {
      text: t("renameImage.renameDesc", { filename: this.imageFile.name }),
    });

    new Setting(contentEl)
      .setName(t("renameImage.newName"))
      .setDesc(t("renameImage.newNameDesc"))
      .addText((text) => {
        text
          .setPlaceholder(this.defaultName)
          .setValue(this.defaultName)
          .onChange((value) => {
            this.newName = value || this.defaultName;
          });

        text.inputEl.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void this.confirm();
          }
        });

        // Focus and select all text
        text.inputEl.focus();
        text.inputEl.select();
      });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(t("common.cancel"))
          .onClick(() => {
            this.cancel();
          });
      })
      .addButton((button) => {
        button
          .setButtonText(t("common.confirm"))
          .setCta()
          .onClick(async () => {
            await this.confirm();
          });
      });

    // Show action buttons outside modal
    this.showActionButtons();
  }

  private showActionButtons() {
    // Create button container outside modal
    this.actionButtonsContainer = document.createElement("div");
    this.actionButtonsContainer.className = "attachmenter-rename-action-buttons";
    this.actionButtonsContainer.className = "attachmenter-rename-action-buttons";


    // Delete button (on the left)
    const deleteButton = document.createElement("button");
    deleteButton.textContent = t("common.delete");
    deleteButton.className = "mod-warning attachmenter-rename-delete-btn";

    deleteButton.onclick = async () => {
      if (this.onDelete) {
        await this.onDelete();
      }
      this.close();
    };

    // Keep button (on the right, with different color)
    const keepButton = document.createElement("button");
    keepButton.textContent = t("common.keep");
    keepButton.className = "mod-cta attachmenter-rename-keep-btn";

    keepButton.onclick = () => {
      this.close();
    };

    this.actionButtonsContainer.appendChild(deleteButton);
    this.actionButtonsContainer.appendChild(keepButton);
    document.body.appendChild(this.actionButtonsContainer);
  }

  private async confirm() {
    if (this.resolved) return;
    this.resolved = true;

    // Sanitize the filename
    const sanitizedName = this.sanitizeFileName(this.newName);
    const finalName = sanitizedName || this.defaultName;

    await this.onConfirm(finalName);
    this.close();
  }

  private cancel() {
    if (this.resolved) return;
    this.resolved = true;

    if (this.onCancel) {
      this.onCancel();
    }
    this.close();
  }

  private sanitizeFileName(name: string): string {
    // Use PathSanitizer to ensure consistency with the rest of the plugin
    return PathSanitizer.sanitizeFileName(name);
  }

  onClose() {
    if (!this.resolved && this.onCancel) {
      this.onCancel();
    }
    if (this.actionButtonsContainer) {
      this.actionButtonsContainer.remove();
      this.actionButtonsContainer = null;
    }
    const { contentEl } = this;
    contentEl.empty();
  }
}
