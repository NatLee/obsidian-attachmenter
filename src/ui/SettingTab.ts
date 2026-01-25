import {
  App,
  MomentFormatComponent,
  PluginSettingTab,
  Setting,
} from "obsidian";
import type AttachmenterPlugin from "../../main";
import { PathCheckModal } from "./PathCheckModal";
import { t, setLanguage } from "../i18n/index";
import { getSupportedLanguages } from "../i18n/loader";

// Default date format for moment.js (not UI text)
const DEFAULT_DATE_FORMAT = "YYYYMMDDHHmmssSSS";

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
      .setName(t("settings.title"))
      .setHeading();

    // Language selector
    new Setting(containerEl)
      .setName(t("settings.language.name"))
      .setDesc(t("settings.language.desc"))
      .addDropdown((dropdown) => {
        const languages = getSupportedLanguages();
        languages.forEach((lang) => {
          dropdown.addOption(lang.code, lang.nativeName);
        });
        dropdown.setValue(this.plugin.settings.language);
        dropdown.onChange(async (value) => {
          this.plugin.settings.language = value as typeof this.plugin.settings.language;
          setLanguage(value as typeof this.plugin.settings.language);
          await this.plugin.saveSettings();
          this.display(); // Re-render to update all text
        });
      });

    new Setting(containerEl)
      .setName(t("settings.folderSuffix.name"))
      .setDesc(t("settings.folderSuffix.desc"))
      .addText((text) =>
        text
          .setPlaceholder("_attachments")
          .setValue(this.plugin.settings.defaultFolderSuffix)
          .onChange(async (value) => {
            this.plugin.settings.defaultFolderSuffix = value || "_attachments";
            await this.plugin.saveSettings();
            // Refresh attachment manager views since folder suffix affects attachment finding
            this.plugin.refreshAttachmentManagerViews();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.attachmentNameFormat.name"))
      .setDesc(t("settings.attachmentNameFormat.desc"))
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

    new Setting(containerEl)
      .setName(t("settings.dateFormat.name"))
      .setDesc(t("settings.dateFormat.desc"))
      .addMomentFormat((component: MomentFormatComponent) => {
        component
          .setPlaceholder(DEFAULT_DATE_FORMAT)
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat =
              value || DEFAULT_DATE_FORMAT;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.folderDisplay.name"))
      .setHeading();

    new Setting(containerEl)
      .setName(t("settings.hideFolder.name"))
      .setDesc(t("settings.hideFolder.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.hideFolder)
          .onChange(async (value) => {
            this.plugin.settings.hideFolder = value;
            await this.plugin.saveSettings();
            // Refresh with folder refresh to update visibility
            this.plugin.hideFolderRibbon.refresh(true);
          })
      );

    new Setting(containerEl)
      .setName(t("settings.aeroFolder.name"))
      .setDesc(t("settings.aeroFolder.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.aeroFolder)
          .onChange(async (value) => {
            this.plugin.settings.aeroFolder = value;
            await this.plugin.saveSettings();
            // Refresh with folder refresh to update styling
            this.plugin.hideFolderRibbon.refresh(true);
          })
      );

    new Setting(containerEl)
      .setName(t("settings.showStatusBar.name"))
      .setDesc(t("settings.showStatusBar.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showStatusBar)
          .onChange(async (value) => {
            this.plugin.settings.showStatusBar = value;
            await this.plugin.saveSettings();
            // Refresh to update status bar visibility and sync with hideFolder state
            this.plugin.hideFolderRibbon.refresh(false);
          })
      );

    new Setting(containerEl)
      .setName(t("settings.showRibbonIcon.name"))
      .setDesc(t("settings.showRibbonIcon.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            this.plugin.settings.showRibbonIcon = value;
            await this.plugin.saveSettings();
            // Refresh to update ribbon icon visibility and sync with hideFolder state
            this.plugin.hideFolderRibbon.refresh(false);
          })
      );

    new Setting(containerEl)
      .setName(t("settings.showAttachmentManagerButton.name"))
      .setDesc(t("settings.showAttachmentManagerButton.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showAttachmentManagerButton)
          .onChange(async (value) => {
            this.plugin.settings.showAttachmentManagerButton = value;
            await this.plugin.saveSettings();
            // Refresh to update attachment manager button visibility
            this.plugin.hideFolderRibbon.refresh(false);
          })
      );

    new Setting(containerEl)
      .setName(t("settings.showFileAttachmentTree.name"))
      .setDesc(t("settings.showFileAttachmentTree.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showFileAttachmentTree)
          .onChange(async (value) => {
            this.plugin.settings.showFileAttachmentTree = value;
            await this.plugin.saveSettings();
            if (value) {
              this.plugin.fileAttachmentTree.load();
              // Force refresh after loading to show attachment trees immediately
              setTimeout(() => {
                this.plugin.fileAttachmentTree.refreshAllFiles();
              }, 100);
            } else {
              this.plugin.fileAttachmentTree.unload();
            }
          })
      );

    new Setting(containerEl)
      .setName(t("settings.autoRenameFolder.name"))
      .setHeading();

    new Setting(containerEl)
      .setName(t("settings.autoRenameAttachmentFolder.name"))
      .setDesc(t("settings.autoRenameAttachmentFolder.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoRenameFolder)
          .onChange(async (value) => {
            this.plugin.settings.autoRenameFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.pathValidation.name"))
      .setHeading();

    new Setting(containerEl)
      .setName(t("settings.promptRenameImage.name"))
      .setDesc(t("settings.promptRenameImage.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.promptRenameImage)
          .onChange(async (value) => {
            this.plugin.settings.promptRenameImage = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.renameConfirmation.name"))
      .setDesc(t("settings.renameConfirmation.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ask", t("settings.renameConfirmation.ask"))
          .addOption("always-rename", t("settings.renameConfirmation.alwaysRename"))
          .setValue(this.plugin.settings.renameConfirmationBehavior)
          .onChange(async (value) => {
            this.plugin.settings.renameConfirmationBehavior = value as 'ask' | 'always-rename';
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.checkPaths.name"))
      .setDesc(t("settings.checkPaths.desc"))
      .addButton((button) =>
        button
          .setButtonText(t("settings.checkPaths.button"))
          .setCta()
          .onClick(() => {
            const modal = new PathCheckModal(
              this.app,
              this.app.vault,
              this.app.fileManager,
              this.plugin.settings
            );
            modal.open();
          })
      );
  }
}

