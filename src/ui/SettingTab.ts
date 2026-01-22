import {
  App,
  MomentFormatComponent,
  PluginSettingTab,
  Setting,
} from "obsidian";
import type AttachmenterPlugin from "../../main";

export class AttachmenterSettingTab extends PluginSettingTab {
  plugin: AttachmenterPlugin;

  constructor(app: App, plugin: AttachmenterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Attachmenter settings")
      .setHeading();

    new Setting(containerEl)
      .setName("Simple mode")
      .setDesc("Use per-note attachment folders with a simple naming pattern.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.simpleMode)
          .onChange(async (value) => {
            this.plugin.settings.simpleMode = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.simpleMode) {
      new Setting(containerEl)
        .setName("Folder suffix")
        .setDesc("Suffix for the per-note attachment folder, e.g. `_Attachments`.")
        .addText((text) =>
          text
            .setPlaceholder("_Attachments")
            .setValue(this.plugin.settings.defaultFolderSuffix)
            .onChange(async (value) => {
              this.plugin.settings.defaultFolderSuffix = value || "_Attachments";
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Attachment name format")
        .setDesc("Use {notename} and {date}, e.g. `{notename}-{date}`.")
        .addText((text) =>
          text
            .setPlaceholder("{notename}-{date}")
            .setValue(this.plugin.settings.defaultNameFormat)
            .onChange(async (value) => {
              this.plugin.settings.defaultNameFormat =
                value || "{notename}-{date}";
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Date format")
      .setDesc("Moment.js date format used for {date}.")
      .addMomentFormat((component: MomentFormatComponent) => {
        component
          .setPlaceholder("YYYYMMDDHHmmssSSS")
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat =
              value || "YYYYMMDDHHmmssSSS";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Folder display")
      .setHeading();

    new Setting(containerEl)
      .setName("Hide attachment folders")
      .setDesc("Hide attachment folders in the file explorer. You can toggle this from the ribbon icon.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.hideFolder)
          .onChange(async (value) => {
            this.plugin.settings.hideFolder = value;
            await this.plugin.saveSettings();
            this.plugin.hideFolderRibbon.refresh();
          })
      );

    new Setting(containerEl)
      .setName("Aero folder style")
      .setDesc("Apply AERO (semi-transparent) style to attachment folders.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.aeroFolder)
          .onChange(async (value) => {
            this.plugin.settings.aeroFolder = value;
            await this.plugin.saveSettings();
            this.plugin.hideFolderRibbon.refresh();
          })
      );

    new Setting(containerEl)
      .setName("Auto rename folder")
      .setHeading();

    new Setting(containerEl)
      .setName("Auto rename attachment folder")
      .setDesc("Automatically rename the attachment folder when the note is renamed.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoRenameFolder)
          .onChange(async (value) => {
            this.plugin.settings.autoRenameFolder = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

