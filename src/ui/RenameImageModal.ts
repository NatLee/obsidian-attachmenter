import { App, Modal, Setting, TFile } from "obsidian";
import { PathSanitizer } from "../lib/pathSanitizer";
import { t } from "../i18n/index";

export class RenameImageModal extends Modal {
  private newName: string;
  private resolved: boolean = false;

  constructor(
    app: App,
    private imageFile: TFile,
    private defaultName: string,
    private onConfirm: (newName: string) => Promise<void>
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
    this.close();
  }

  private sanitizeFileName(name: string): string {
    // Use PathSanitizer to ensure consistency with the rest of the plugin
    return PathSanitizer.sanitizeFileName(name);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
