import {
  Plugin,
  TFile,
} from "obsidian";

import { AttachmenterSettings, DEFAULT_SETTINGS } from "./src/model/Settings";
import { RemoteImageService } from "./src/core/RemoteImageService";
import { AttachmenterSettingTab } from "./src/ui/SettingTab";
import { HideFolderRibbon } from "./src/ui/HideFolderRibbon";
import { PasteImageHandler } from "./src/handler/PasteImageHandler";
import { VaultAttachmentConfiguration } from "./src/components/VaultAttachmentConfiguration";
import { FileOpenHandler } from "./src/handler/FileOpenHandler";
import { RenameHandler } from "./src/handler/RenameHandler";
import { PathResolver } from "./src/path/PathResolver";
import { initI18n, setLanguage, t } from "./src/i18n/index";

export default class AttachmenterPlugin extends Plugin {
  settings: AttachmenterSettings;
  remoteImageService: RemoteImageService;
  hideFolderRibbon: HideFolderRibbon;
  pasteImageHandler: PasteImageHandler;
  vaultAttachmentConfiguration: VaultAttachmentConfiguration;
  fileOpenHandler: FileOpenHandler;
  renameHandler: RenameHandler;

  async onload() {
    await this.loadSettings();

    // Initialize i18n with settings language
    initI18n(this.settings.language);

    // Initialize vault attachment configuration to manage Obsidian's attachment path
    this.vaultAttachmentConfiguration = new VaultAttachmentConfiguration(
      this.app.vault
    );
    this.vaultAttachmentConfiguration.backup();

    const pathResolver = new PathResolver(this.app.vault, this.settings);

    this.remoteImageService = new RemoteImageService(
      this.app.vault,
      this.app.workspace,
      this.app.fileManager,
      this.app.vault.adapter,
      this.settings
    );

    this.pasteImageHandler = new PasteImageHandler(
      this.app,
      this.app.vault,
      this.app.workspace,
      this.app.fileManager,
      this.settings
    );

    this.fileOpenHandler = new FileOpenHandler(
      this.vaultAttachmentConfiguration,
      pathResolver
    );

    this.renameHandler = new RenameHandler(
      this.app.vault,
      this.app.fileManager,
      () => this.settings
    );

    this.hideFolderRibbon = new HideFolderRibbon(this);
    this.hideFolderRibbon.load();

    this.addSettingTab(new AttachmenterSettingTab(this.app, this));

    this.addCommand({
      id: "download-remote-images-active",
      name: t("commands.downloadRemoteImagesActive"),
      callback: async () => {
        await this.remoteImageService.downloadForActiveFile();
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile)) return;
        if (file.extension !== "md") return;

        menu.addItem((item) => {
          item
            .setTitle(t("menu.downloadRemoteImages"))
            .setIcon("download")
            .onClick(async () => {
              await this.remoteImageService.downloadForFile(file);
            });
        });
      })
    );

    // Register file creation event to handle pasted images
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        void this.pasteImageHandler.handle(file);
      })
    );

    // Register file open event to update attachment path configuration
    // This ensures the paste image dialog shows the correct path
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        this.fileOpenHandler.handle(file);
      })
    );

    // Register file rename event to update attachment path configuration and rename folder
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        // Handle attachment folder renaming
        void this.renameHandler.handle(file, oldPath);
        
        // Check if the renamed file is the currently active file
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
          this.fileOpenHandler.handle(activeFile);
        }
      })
    );

    // Update attachment path for the currently active file if any
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      this.fileOpenHandler.handle(activeFile);
    }
  }

  onunload() {
    this.hideFolderRibbon.unload();
    // Restore the original vault attachment configuration
    this.vaultAttachmentConfiguration.restore();
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
    // Update i18n language if settings changed
    if (this.settings.language) {
      setLanguage(this.settings.language);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

