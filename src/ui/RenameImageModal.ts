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
        // Focus and select all text
        text.inputEl.focus();
        text.inputEl.select();
      });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText(t("common.cancel"))
        .onClick(() => {
          this.cancel();
        });
    });

    new Setting(contentEl).addButton((button) => {
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
    this.actionButtonsContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 8px;
      z-index: 10000;
      background: var(--background-primary);
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 1px solid var(--background-modifier-border);
    `;

    // Delete button (on the left)
    const deleteButton = document.createElement("button");
    deleteButton.textContent = t("common.delete");
    deleteButton.className = "mod-warning";
    deleteButton.style.cssText = `
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    `;
    deleteButton.onclick = async () => {
      if (this.onDelete) {
        await this.onDelete();
      }
      this.close();
    };

    // Keep button (on the right, with different color)
    const keepButton = document.createElement("button");
    keepButton.textContent = t("common.keep");
    keepButton.className = "mod-cta";
    keepButton.style.cssText = `
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      background-color: var(--interactive-success);
      color: var(--text-on-accent);
    `;
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
    const ext = this.imageFile.extension;
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
