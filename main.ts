import {
  Plugin,
  TFile,
} from "obsidian";

import { AttachmenterSettings, DEFAULT_SETTINGS } from "./src/model/Settings";
import { RemoteImageService } from "./src/core/RemoteImageService";
import { AttachmenterSettingTab } from "./src/ui/SettingTab";
import { HideFolderRibbon } from "./src/ui/HideFolderRibbon";
import { PasteImageHandler } from "./src/handler/PasteImageHandler";

export default class AttachmenterPlugin extends Plugin {
  settings: AttachmenterSettings;
  remoteImageService: RemoteImageService;
  hideFolderRibbon: HideFolderRibbon;
  pasteImageHandler: PasteImageHandler;

  async onload() {
    await this.loadSettings();

    this.remoteImageService = new RemoteImageService(
      this.app.vault,
      this.app.workspace,
      this.app.fileManager,
      this.app.vault.adapter,
      this.settings
    );

    this.pasteImageHandler = new PasteImageHandler(
      this.app.vault,
      this.app.workspace,
      this.app.fileManager,
      this.settings
    );

    this.hideFolderRibbon = new HideFolderRibbon(this);
    this.hideFolderRibbon.load();

    this.addSettingTab(new AttachmenterSettingTab(this.app, this));

    this.addCommand({
      id: "download-remote-images-active",
      name: "Download remote images in active file",
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
            .setTitle("Download remote images")
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
        this.pasteImageHandler.handle(file);
      })
    );
  }

  async onunload() {
    this.hideFolderRibbon.unload();
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

