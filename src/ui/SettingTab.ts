import {
  App,
  MomentFormatComponent,
  PluginSettingTab,
  Setting,
  SliderComponent,
  TextComponent,
  ColorComponent,
  requireApiVersion,
  type SettingDefinitionItem,
} from "obsidian";
import type AttachmenterPlugin from "../../main";
import { PathCheckModal } from "./PathCheckModal";
import { CleanupHandler } from "../handler/CleanupHandler";
import { t, setLanguage } from "../i18n/index";
import { getSupportedLanguages } from "../i18n/loader";
import { DEFAULT_SETTINGS } from "../model/Settings";

// Default date format for moment.js (not UI text)
const DEFAULT_DATE_FORMAT = "YYYYMMDDHHmmssSSS";

/** One settings row: its label and a builder that adds the controls. */
interface SettingRow {
  name: string;
  desc: string;
  build: (setting: Setting) => void;
}

/** A headed group of rows. */
interface SettingSection {
  heading: string;
  rows: SettingRow[];
}

export class AttachmenterSettingTab extends PluginSettingTab {
  plugin: AttachmenterPlugin;

  constructor(app: App, plugin: AttachmenterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Obsidian 1.13+ renders the tab from these definitions (which also makes
   * every setting show up in the settings search). Each row reuses the same
   * builder as display(), so both paths stay identical.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return this.getSections().map((section) => ({
      type: "group" as const,
      heading: section.heading,
      items: section.rows.map((row) => ({
        name: row.name,
        desc: row.desc,
        render: (setting: Setting) => {
          setting.setName(row.name).setDesc(row.desc);
          row.build(setting);
        },
      })),
    }));
  }

  /** Fallback renderer for Obsidian versions before 1.13. */
  display(): void {
    this.renderLegacy();
  }

  /** Redraw the tab, e.g. after the UI language changed. */
  private rerender() {
    if (requireApiVersion("1.13.0")) {
      this.update();
    } else {
      this.renderLegacy();
    }
  }

  /** Imperative rendering used before Obsidian 1.13. */
  private renderLegacy() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(t("settings.title")).setHeading();

    for (const section of this.getSections()) {
      new Setting(containerEl).setName(section.heading).setHeading();
      for (const row of section.rows) {
        row.build(new Setting(containerEl).setName(row.name).setDesc(row.desc));
      }
    }
  }

  private getSections(): SettingSection[] {
    const { settings } = this.plugin;

    return [
      // =====================================================================
      // 0. General Settings
      // =====================================================================
      {
        heading: t("settings.group.general"),
        rows: [
          {
            name: t("settings.language.name"),
            desc: t("settings.language.desc"),
            build: (setting) => {
              setting.addDropdown((dropdown) => {
                getSupportedLanguages().forEach((lang) => {
                  dropdown.addOption(lang.code, lang.nativeName);
                });
                dropdown.setValue(settings.language);
                dropdown.onChange(async (value) => {
                  settings.language = value as typeof settings.language;
                  setLanguage(value as typeof settings.language);
                  await this.plugin.saveSettings();
                  this.rerender(); // Re-render to update all text
                });
              });
            },
          },
        ],
      },

      // =====================================================================
      // 1. Management Rules
      // =====================================================================
      {
        heading: t("settings.group.management"),
        rows: [
          {
            name: t("settings.folderSuffix.name"),
            desc: t("settings.folderSuffix.desc"),
            build: (setting) => {
              setting.addText((text) =>
                text
                  .setPlaceholder("_attachments")
                  .setValue(settings.defaultFolderSuffix)
                  .onChange(async (value) => {
                    settings.defaultFolderSuffix = value || "_attachments";
                    await this.plugin.saveSettings();
                    // Refresh attachment manager views since folder suffix affects attachment finding
                    this.plugin.refreshAttachmentManagerViews();
                  })
              );
            },
          },
          {
            name: t("settings.attachmentNameFormat.name"),
            desc: t("settings.attachmentNameFormat.desc"),
            build: (setting) => {
              setting.addText((text) =>
                text
                  .setPlaceholder("{notename}-{date}")
                  .setValue(settings.defaultNameFormat)
                  .onChange(async (value) => {
                    settings.defaultNameFormat = value || "{notename}-{date}";
                    await this.plugin.saveSettings();
                  })
              );
            },
          },
          {
            name: t("settings.dateFormat.name"),
            desc: t("settings.dateFormat.desc"),
            build: (setting) => {
              setting.addMomentFormat((component: MomentFormatComponent) => {
                component
                  .setPlaceholder(DEFAULT_DATE_FORMAT)
                  .setValue(settings.dateFormat)
                  .onChange(async (value) => {
                    settings.dateFormat = value || DEFAULT_DATE_FORMAT;
                    await this.plugin.saveSettings();
                  });
              });
            },
          },
          {
            name: t("settings.autoRenameAttachmentFolder.name"),
            desc: t("settings.autoRenameAttachmentFolder.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.autoRenameFolder)
                  .onChange(async (value) => {
                    settings.autoRenameFolder = value;
                    await this.plugin.saveSettings();
                  })
              );
            },
          },
          {
            name: t("settings.renameConfirmation.name"),
            desc: t("settings.renameConfirmation.desc"),
            build: (setting) => {
              setting.addDropdown((dropdown) => {
                dropdown
                  .addOption("ask", t("settings.renameConfirmation.ask"))
                  .addOption("always-rename", t("settings.renameConfirmation.alwaysRename"))
                  .setValue(settings.renameConfirmationBehavior)
                  .onChange(async (value) => {
                    settings.renameConfirmationBehavior = value as "ask" | "always-rename";
                    await this.plugin.saveSettings();
                  });
              });
            },
          },
          {
            name: t("settings.promptRenameImage.name"),
            desc: t("settings.promptRenameImage.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.promptRenameImage)
                  .onChange(async (value) => {
                    settings.promptRenameImage = value;
                    await this.plugin.saveSettings();
                  })
              );
            },
          },
        ],
      },

      // =====================================================================
      // 2. Interface Integration
      // =====================================================================
      {
        heading: t("settings.group.appearance"),
        rows: [
          {
            name: t("settings.showRibbonIcon.name"),
            desc: t("settings.showRibbonIcon.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.showRibbonIcon)
                  .onChange(async (value) => {
                    settings.showRibbonIcon = value;
                    await this.plugin.saveSettings();
                    // Refresh to update ribbon icon visibility and sync with hideFolder state
                    this.plugin.hideFolderRibbon.refresh(false);
                  })
              );
            },
          },
          {
            name: t("settings.showStatusBar.name"),
            desc: t("settings.showStatusBar.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.showStatusBar)
                  .onChange(async (value) => {
                    settings.showStatusBar = value;
                    await this.plugin.saveSettings();
                    // Refresh to update status bar visibility and sync with hideFolder state
                    this.plugin.hideFolderRibbon.refresh(false);
                  })
              );
            },
          },
          {
            name: t("settings.showAttachmentManagerButton.name"),
            desc: t("settings.showAttachmentManagerButton.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.showAttachmentManagerButton)
                  .onChange(async (value) => {
                    settings.showAttachmentManagerButton = value;
                    await this.plugin.saveSettings();
                    // Refresh to update attachment manager button visibility
                    this.plugin.hideFolderRibbon.refresh(false);
                  })
              );
            },
          },
          {
            name: t("settings.hideFolder.name"),
            desc: t("settings.hideFolder.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.hideFolder)
                  .onChange(async (value) => {
                    settings.hideFolder = value;
                    await this.plugin.saveSettings();
                    // Refresh with folder refresh to update visibility
                    this.plugin.hideFolderRibbon.refresh(true);
                  })
              );
            },
          },
          {
            name: t("settings.aeroFolder.name"),
            desc: t("settings.aeroFolder.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.aeroFolder)
                  .onChange(async (value) => {
                    settings.aeroFolder = value;
                    await this.plugin.saveSettings();
                    // Refresh with folder refresh to update styling
                    this.plugin.hideFolderRibbon.refresh(true);
                  })
              );
            },
          },
        ],
      },

      // =====================================================================
      // 3. Attachment Tree View
      // =====================================================================
      {
        heading: t("settings.group.view"),
        rows: [
          {
            name: t("settings.showFileAttachmentTree.name"),
            desc: t("settings.showFileAttachmentTree.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.showFileAttachmentTree)
                  .onChange(async (value) => {
                    settings.showFileAttachmentTree = value;
                    await this.plugin.saveSettings();
                    if (value) {
                      this.plugin.fileAttachmentTree.load();
                      // Force refresh after loading to show attachment trees immediately
                      window.setTimeout(() => {
                        this.plugin.fileAttachmentTree.refreshAllFiles();
                      }, 100);
                    } else {
                      this.plugin.fileAttachmentTree.unload();
                    }
                  })
              );
            },
          },
          {
            name: t("settings.showRemoteHint.name"),
            desc: t("settings.showRemoteHint.desc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.showRemoteHint)
                  .onChange(async (value) => {
                    settings.showRemoteHint = value;
                    await this.plugin.saveSettings();
                    // Refresh tree to show/hide icons
                    if (settings.showFileAttachmentTree) {
                      this.plugin.fileAttachmentTree.refreshAllFiles();
                    }
                  })
              );
            },
          },
          {
            name: t("settings.highlight.enable"),
            desc: t("settings.highlight.enableDesc"),
            build: (setting) => {
              setting.addToggle((toggle) =>
                toggle
                  .setValue(settings.enableHighlight)
                  .onChange(async (value) => {
                    settings.enableHighlight = value;
                    await this.plugin.saveSettings();
                    // Refresh tree to apply styles
                    this.plugin.fileAttachmentTree.refreshHighlightStyles();
                  })
              );
            },
          },
          {
            name: t("settings.highlight.borderColor"),
            desc: t("settings.highlight.borderColorDesc"),
            build: (setting) => {
              this.buildColorSetting(
                setting,
                settings.highlightBorderColor,
                DEFAULT_SETTINGS.highlightBorderColor,
                async (value) => {
                  settings.highlightBorderColor = value;
                  await this.plugin.saveSettings();
                  this.plugin.fileAttachmentTree.refreshHighlightStyles();
                }
              );
            },
          },
        ],
      },

      // =====================================================================
      // 4. Tools & Maintenance
      // =====================================================================
      {
        heading: t("settings.group.tools"),
        rows: [
          {
            name: t("settings.checkPaths.name"),
            desc: t("settings.checkPaths.desc"),
            build: (setting) => {
              setting.addButton((button) =>
                button
                  .setButtonText(t("settings.checkPaths.button"))
                  .setCta()
                  .onClick(() => {
                    const modal = new PathCheckModal(
                      this.app,
                      this.app.vault,
                      this.app.fileManager,
                      settings
                    );
                    modal.open();
                  })
              );
            },
          },
          {
            name: t("settings.cleanup.name"),
            desc: t("settings.cleanup.desc"),
            build: (setting) => {
              setting.addButton((button) =>
                button
                  .setButtonText(t("settings.cleanup.button"))
                  .onClick(() => {
                    const handler = new CleanupHandler(this.app, this.plugin);
                    handler.checkEmptyFolders();
                  })
              );
            },
          },
        ],
      },
    ];
  }

  /**
   * Adds a color text input, color picker, opacity slider and reset button
   * to an existing setting row.
   */
  private buildColorSetting(
    setting: Setting,
    initialValue: string,
    defaultValue: string,
    onSave: (value: string) => Promise<void>
  ) {
    let textComponent: TextComponent | null = null;
    let pickerComponent: ColorComponent | null = null;

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

    // The slider is created below; declare it first so updateSliderFromColor can use it.
    let slider: SliderComponent | null = null;

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
            if (textComponent) {
              textComponent.setValue(value);
              textComponent.inputEl.removeClass("attachmenter-input-error"); // clear error
            }
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
            if (textComponent) {
              textComponent.setValue(defaultValue);
              textComponent.inputEl.removeClass("attachmenter-input-error");
            }
            previewEl.style.backgroundColor = getPreviewColor(defaultValue);
            updateSliderFromColor(defaultValue);

            await onSave(defaultValue);

            // Only update picker if it's a valid hex.
            // If it's empty (theme default), we DO NOT touch the picker.
            // Touching the picker when it doesn't match the new value might trigger onChange
            // and overwrite our just-set default value.
            if (defaultValue.startsWith("#") && pickerComponent) {
              pickerComponent.setValue(defaultValue);
            }
          })
      );

    // Initial sync
    updateSliderFromColor(initialValue);

    // Move the default color picker input INSIDE the preview element to anchor the popup correctly
    const colorInput = setting.controlEl.querySelector('input[type="color"]') as HTMLElement;
    if (colorInput) {
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

    // Assume basic names like "red" are 100%.
    if (color.match(/^[a-z]+$/i)) return 1;

    return null;
  }

  // Apply new alpha to color
  private applyOpacity(color: string, alpha: number): string | null {
    if (!color) return `rgba(0, 0, 0, ${alpha})`;
    color = color.trim().toLowerCase();

    // Normalize alpha to max 2 decimals
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

    // Safe fallback: don't modify if we can't parse.
    return null;
  }
}
