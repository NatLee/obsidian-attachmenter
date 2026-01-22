import {
  Plugin,
  TAbstractFile,
  TFile,
  WorkspaceLeaf,
} from "obsidian";

import { AttachmenterSettings, DEFAULT_SETTINGS } from "./src/model/Settings";
import { RemoteImageService } from "./src/core/RemoteImageService";
import { AttachmenterSettingTab } from "./src/ui/SettingTab";
import { HideFolderRibbon } from "./src/ui/HideFolderRibbon";

export default class AttachmenterPlugin extends Plugin {
  settings: AttachmenterSettings;
  remoteImageService: RemoteImageService;
  hideFolderRibbon: HideFolderRibbon;

  async onload() {
    await this.loadSettings();

    this.remoteImageService = new RemoteImageService(
      this.app.vault,
      this.app.workspace,
      this.app.fileManager,
      this.app.vault.adapter,
      this.settings
    );

    this.hideFolderRibbon = new HideFolderRibbon(this);
    this.hideFolderRibbon.load();

    this.addSettingTab(new AttachmenterSettingTab(this.app, this));

    this.addCommand({
      id: "attachmenter-download-remote-images-active",
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

