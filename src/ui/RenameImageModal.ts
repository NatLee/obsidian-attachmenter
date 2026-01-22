import { App, Modal, Setting, TFile } from "obsidian";
import { PathSanitizer } from "../lib/pathSanitizer";

export class RenameImageModal extends Modal {
  private newName: string;
  private resolved: boolean = false;

  constructor(
    app: App,
    private imageFile: TFile,
    private defaultName: string,
    private onConfirm: (newName: string) => Promise<void>,
    private onCancel?: () => void
  ) {
    super(app);
    this.newName = defaultName;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Rename Image" });

    contentEl.createEl("p", {
      text: `Rename image: ${this.imageFile.name}`,
    });

    new Setting(contentEl)
      .setName("New name")
      .setDesc("Enter the new name for the image (without extension)")
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
        .setButtonText("Use Default Name")
        .setCta()
        .onClick(async () => {
          this.newName = this.defaultName;
          await this.confirm();
        });
    });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText("Cancel")
        .onClick(() => {
          this.cancel();
        });
    });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText("Confirm")
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
    const { contentEl } = this;
    contentEl.empty();
  }
}
