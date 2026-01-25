import {
  App,
  MomentFormatComponent,
  PluginSettingTab,
  Setting,
  SliderComponent,
} from "obsidian";
import type AttachmenterPlugin from "../../main";
import { PathCheckModal } from "./PathCheckModal";
import { CleanupHandler } from "../handler/CleanupHandler";
import { t, setLanguage } from "../i18n/index";
import { getSupportedLanguages } from "../i18n/loader";
import { DEFAULT_SETTINGS } from "../model/Settings";

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

    // =========================================================================
    // 0. General Settings
    // =========================================================================
    new Setting(containerEl).setName(t("settings.group.general")).setHeading();

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

    // =========================================================================
    // 1. Management Rules
    // =========================================================================
    new Setting(containerEl).setName(t("settings.group.management")).setHeading();

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

    // =========================================================================
    // 2. Interface Integration
    // =========================================================================
    new Setting(containerEl).setName(t("settings.group.appearance")).setHeading();

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

    // =========================================================================
    // 3. Attachment Tree View
    // =========================================================================
    new Setting(containerEl).setName(t("settings.group.view")).setHeading();

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
      .setName(t("settings.showRemoteHint.name"))
      .setDesc(t("settings.showRemoteHint.desc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRemoteHint)
          .onChange(async (value) => {
            this.plugin.settings.showRemoteHint = value;
            await this.plugin.saveSettings();
            // Refresh tree to show/hide icons
            if (this.plugin.settings.showFileAttachmentTree) {
              this.plugin.fileAttachmentTree.refreshAllFiles();
            }
          })
      );

    new Setting(containerEl)
      .setName(t("settings.highlight.enable"))
      .setDesc(t("settings.highlight.enableDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableHighlight)
          .onChange(async (value) => {
            this.plugin.settings.enableHighlight = value;
            await this.plugin.saveSettings();
            // Refresh tree to apply styles
            this.plugin.fileAttachmentTree.refreshHighlightStyles();
          })
      );

    this.addColorSetting(
      containerEl,
      t("settings.highlight.borderColor"),
      t("settings.highlight.borderColorDesc"),
      this.plugin.settings.highlightBorderColor,
      DEFAULT_SETTINGS.highlightBorderColor,
      async (value) => {
        this.plugin.settings.highlightBorderColor = value;
        await this.plugin.saveSettings();
        this.plugin.fileAttachmentTree.refreshHighlightStyles();
      }
    );

    // =========================================================================
    // 4. Tools & Maintenance
    // =========================================================================
    new Setting(containerEl).setName(t("settings.group.tools")).setHeading();

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

    new Setting(containerEl)
      .setName(t("settings.cleanup.name"))
      .setDesc(t("settings.cleanup.desc"))
      .addButton((button) =>
        button
          .setButtonText(t("settings.cleanup.button"))
          .onClick(async () => {
            const handler = new CleanupHandler(this.app, this.plugin);
            await handler.checkEmptyFolders();
          })
      );
  }

  /**
   * Helper to add a color setting with a text input and color picker
   */
  private addColorSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    initialValue: string,
    defaultValue: string,
    onSave: (value: string) => Promise<void>
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let textComponent: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pickerComponent: any;

    const setting = new Setting(containerEl)
      .setName(name)
      .setDesc(desc);

    // Create a container for the preview that will act as the anchor
    const previewContainer = setting.controlEl.createDiv({ cls: 'attachmenter-color-preview-container' });
    Object.assign(previewContainer.style, {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      marginRight: '8px'
    });

    // Create a clickable color preview box
    const previewEl = previewContainer.createDiv({ cls: 'attachmenter-color-preview' });

    const getPreviewColor = (val: string) => val ? val : 'var(--interactive-accent)';

    Object.assign(previewEl.style, {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: getPreviewColor(initialValue),
      border: '1px solid var(--background-modifier-border)',
      flexShrink: '0',
      cursor: 'pointer'
    });
    previewEl.setAttribute('title', t("common.restoreDefault") || "Click to pick color");

    // Add Opacity Slider
    const sliderContainer = setting.controlEl.createDiv({ cls: 'attachmenter-opacity-slider-container' });
    Object.assign(sliderContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginLeft: '12px',
      marginRight: '12px',
      width: '140px'
    });

    const alphaLabel = sliderContainer.createDiv({ text: '100%' });
    alphaLabel.addClass('attachmenter-alpha-label');
    // alphaLabel.style.fontSize = '0.8 em';
    // alphaLabel.style.minWidth = '35px';
    // alphaLabel.style.textAlign = 'right';

    // We need to define updateSliderFromColor before creating the slider so we can use it, 
    // but the slider needs to be created first.
    // So we define the variable first.
    let slider: SliderComponent;

    // Helper to update slider UI from color string
    const updateSliderFromColor = (colorVal: string) => {
      if (!slider) return;
      const opacity = this.getOpacity(colorVal);
      if (opacity !== null) {
        const pct = Math.round(opacity * 100);
        slider.setValue(pct);
        alphaLabel.setText(`${pct}%`);
        slider.setDisabled(false);
      } else {
        // If we can't parse (e.g. var()), disable slider
        slider.setValue(100);
        // Set text to "N/a" and disable slider
        alphaLabel.setText('N/a');
        slider.setDisabled(true);
      }
    };

    slider = new SliderComponent(sliderContainer)
      .setLimits(0, 100, 1)
      .setValue(100)
      .onChange(async (val) => {
        alphaLabel.setText(`${val}%`);

        // We need to get current text value
        if (textComponent) {
          const currentColor = textComponent.getValue().trim();
          const newColor = this.applyOpacity(currentColor, val / 100);

          if (newColor && newColor !== currentColor) {
            textComponent.setValue(newColor);
            textComponent.inputEl.removeClass("attachmenter-input-error");
            previewEl.style.backgroundColor = getPreviewColor(newColor);
            await onSave(newColor);
          }
        }
      });

    setting
      .addText((text) => {
        textComponent = text;
        text
          .setPlaceholder("Default (theme accent)")
          .setValue(initialValue)
          .onChange(async (value) => {
            // Validate CSS color
            const isValid = value === "" || CSS.supports("color", value);
            text.inputEl.toggleClass("attachmenter-input-error", !isValid);

            if (isValid) {
              previewEl.style.backgroundColor = getPreviewColor(value);
              updateSliderFromColor(value);
              await onSave(value);

              // Try to update picker if possible (only simple hex)
              if (
                value.startsWith("#") &&
                (value.length === 4 || value.length === 7)
              ) {
                pickerComponent?.setValue(value);
              }
            }
          });
      })
      .addColorPicker((picker) => {
        pickerComponent = picker;
        picker
          .setValue(initialValue.startsWith("#") ? initialValue : "#000000")
          .onChange(async (value) => {
            // Update text field
            textComponent.setValue(value);
            textComponent.inputEl.removeClass("attachmenter-input-error"); // clear error
            previewEl.style.backgroundColor = value;
            updateSliderFromColor(value); // Sync slider
            await onSave(value);
          });
      })
      .addExtraButton((btn) =>
        btn
          .setIcon("rotate-ccw")
          .setTooltip(t("common.restoreDefault"))
          .onClick(async () => {
            // Restore to default
            textComponent.setValue(defaultValue);
            textComponent.inputEl.removeClass("attachmenter-input-error");
            previewEl.style.backgroundColor = getPreviewColor(defaultValue);
            updateSliderFromColor(defaultValue);

            await onSave(defaultValue);

            // Only update picker if it's a valid hex. 
            // If it's empty (theme default), we DO NOT touch the picker.
            // Touching the picker when it doesn't match the new value might trigger onChange 
            // and overwrite our just-set default value.
            if (defaultValue.startsWith("#")) {
              pickerComponent.setValue(defaultValue);
            }
          })
      );

    // Initial sync
    updateSliderFromColor(initialValue);

    // Move the default color picker input INSIDE the preview element to anchor the popup correctly
    const colorInput = setting.controlEl.querySelector('input[type="color"]') as HTMLElement;
    if (colorInput) {
      // Move input to be a child of previewEl (or container)
      previewEl.appendChild(colorInput);

      Object.assign(colorInput.style, {
        opacity: '0',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '0',
        left: '0',
        padding: '0',
        margin: '0',
        border: 'none',
        cursor: 'pointer',
        visibility: 'visible'
      });

      previewEl.addClass('attachmenter-color-preview-wrapper');
      // previewEl.style.position = 'relative';
    }

    if (setting.controlEl.firstChild !== previewContainer) {
      setting.controlEl.insertBefore(previewContainer, setting.controlEl.firstChild);
    }
  }

  // Parse color to get alpha (0-1)
  private getOpacity(color: string): number | null {
    if (!color) return null; // Default/Empty
    color = color.trim().toLowerCase();

    if (color.startsWith('rgba')) {
      const match = color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
      return match ? parseFloat(match[1]) : 1;
    }
    if (color.startsWith('rgb')) {
      return 1;
    }
    if (color.startsWith('#')) {
      if (color.length === 5) { // #RGBA
        const alphaHex = color.substring(4, 5);
        return parseInt(alphaHex + alphaHex, 16) / 255;
      }
      if (color.length === 9) { // #RRGGBBAA
        const alphaHex = color.substring(7, 9);
        return parseInt(alphaHex, 16) / 255;
      }
      return 1;
    }
    // Named colors, hsl, etc. technically supported by browser but harder to parse simply.
    // var(...) not supported
    if (color.startsWith('var(')) return null;

    // Attempt to use DOM to compute? Too heavy. 
    // Assume basic names like "red" are 100%.
    if (color.match(/^[a-z]+$/i)) return 1;

    return null;
  }

  // Apply new alpha to color
  private applyOpacity(color: string, alpha: number): string | null {
    if (!color) return `rgba(0, 0, 0, ${alpha})`; // Fallback? 
    color = color.trim().toLowerCase();

    // Normalize alpha to max 2 decimals?
    alpha = Math.round(alpha * 100) / 100;

    if (color.startsWith('rgba')) {
      return color.replace(/,(\s*[\d.]+)\s*\)/, `, ${alpha})`);
    }
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    if (color.startsWith('#')) {
      // Convert Hex to RGBA
      let r = 0, g = 0, b = 0;
      if (color.length === 4) {
        r = parseInt(color[1] + color[1], 16);
        g = parseInt(color[2] + color[2], 16);
        b = parseInt(color[3] + color[3], 16);
      } else if (color.length === 7) {
        r = parseInt(color.substring(1, 3), 16);
        g = parseInt(color.substring(3, 5), 16);
        b = parseInt(color.substring(5, 7), 16);
      } else if (color.length === 9) { // #RRGGBBAA -> ignore existing alpha and use new
        r = parseInt(color.substring(1, 3), 16);
        g = parseInt(color.substring(3, 5), 16);
        b = parseInt(color.substring(5, 7), 16);
      } else {
        return null; // Invalid hex?
      }
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Handle named colors by creating a temp element?
    // Or just map common ones? 
    // Safe fallback: don't modify if we can't parse.
    return null;
  }
}
