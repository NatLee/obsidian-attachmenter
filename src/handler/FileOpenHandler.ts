import { TFile } from "obsidian";

import { VaultAttachmentConfiguration } from "../components/VaultAttachmentConfiguration";
import { PathResolver } from "../path/PathResolver";

export class FileOpenHandler {
  private vaultAttachmentConfiguration: VaultAttachmentConfiguration;
  private pathResolver: PathResolver;

  constructor(
    vaultAttachmentConfiguration: VaultAttachmentConfiguration,
    pathResolver: PathResolver
  ) {
    this.vaultAttachmentConfiguration = vaultAttachmentConfiguration;
    this.pathResolver = pathResolver;
  }

  handle(file: TFile | null) {
    if (file == null) {
      return;
    }

    // Only update attachment path for markdown and canvas files
    if (file.extension !== "md" && file.extension !== "canvas") {
      return;
    }

    // Get the correct attachment folder path for this note
    const folderPath = this.pathResolver.getAttachmentFolderForNote(file);

    // Update the vault's attachment folder path configuration
    // This will make the paste image dialog show the correct path
    this.vaultAttachmentConfiguration.update(folderPath);
  }
}
