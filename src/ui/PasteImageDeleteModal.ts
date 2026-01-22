import {
  Modal,
  TFile,
  TextFileView,
} from "obsidian";

export class PasteImageDeleteModal extends Modal {
  constructor(
    app: any,
    private file: TFile,
    private linkTextOrPath: string,
    private activeView: TextFileView,
    private activeFile: TFile,
    private onDelete: () => Promise<void>
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Image Pasted" });
    contentEl.createEl("p", {
      text: `Image saved to: ${this.file.path}`,
    });
    contentEl.createEl("p", {
      text: "Do you want to delete this image?",
    });

    const buttonContainer = contentEl.createDiv({
      cls: "modal-button-container",
    });

    const deleteButton = buttonContainer.createEl("button", {
      text: "Delete",
      cls: "mod-cta",
    });

    const keepButton = buttonContainer.createEl("button", {
      text: "Keep",
    });

    deleteButton.onclick = async () => {
      await this.onDelete();
      this.close();
    };

    keepButton.onclick = () => {
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
