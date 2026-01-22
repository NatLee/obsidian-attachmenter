import { setIcon } from "obsidian";

import type AttachmenterPlugin from "../../main";
import type { AttachmenterSettings } from "../model/Settings";
import { PathSanitizer } from "../lib/pathSanitizer";

/**
 * Builds a regex pattern to match attachment folder names based on settings.
 * Accounts for sanitized folder names (e.g., # replaced with space).
 */
function buildFolderRegExp(settings: AttachmenterSettings): RegExp {
  // Escape special regex characters
  const specialChars = ["\\$", "\\[", "\\]", "\\{", "\\}", "\\(", "\\)", "\\*", "\\+", "\\.", "\\?", "\\\\", "\\^"];
  const reg = new RegExp("[" + specialChars.join("") + "]", "gi");
  
  // Get the folder suffix (e.g., "_Attachments")
  // Note: We use the original suffix for matching, but folders may have been created
  // with sanitized names. The pattern should be flexible enough to match both.
  const folderSuffix = settings.defaultFolderSuffix || "_Attachments";
  
  // Escape the suffix and replace any variable placeholders with .+
  let pattern = folderSuffix.replace(reg, (char: string) => `\\${char}`);
  
  // Match folder names ending with the suffix (e.g., "note_Attachments")
  // The pattern matches: any characters + suffix
  // Note: Since folder names may be sanitized (e.g., # -> space), we use .+ which
  // will match any characters, including spaces that replaced invalid chars
  pattern = ".+" + pattern + "$";
  
  return new RegExp(pattern);
}

export class HideFolderRibbon {
  private ribbonIconButton: HTMLElement;
  private statusBarItem: HTMLElement;
  private mutationObserver: MutationObserver;

  constructor(private plugin: AttachmenterPlugin) {}

  load() {
    // Create ribbon icon button
    this.ribbonIconButton = this.plugin.addRibbonIcon(
      this.plugin.settings.hideFolder ? "eye-off" : "eye",
      "Toggle attachment folder visibility",
      (evt: MouseEvent) => {
        this.plugin.settings.hideFolder = !this.plugin.settings.hideFolder;
        void this.plugin.saveSettings();
        this.refresh();
      }
    );

    // Add status bar item
    this.statusBarItem = this.plugin.addStatusBarItem();
    this.statusBarItem.setText(
      this.plugin.settings.hideFolder ? "Attachment folders hidden" : ""
    );

    // Add command
    this.plugin.addCommand({
      id: "toggle-folder-visibility",
      name: "Toggle attachment folder visibility",
      callback: () => {
        this.plugin.settings.hideFolder = !this.plugin.settings.hideFolder;
        void this.plugin.saveSettings();
        this.refresh();
      },
    });

    // Watch for DOM changes to update folder visibility
    this.mutationObserver = new MutationObserver((mutationRecord) => {
      mutationRecord.forEach((record) => {
        if (record.target?.parentElement?.classList.contains("nav-folder")) {
          this.refreshFolders();
        }
      });
    });
    this.mutationObserver.observe(window.document, {
      childList: true,
      subtree: true,
    });

    // Initial refresh
    this.refreshFolders();
  }

  refresh() {
    setIcon(
      this.ribbonIconButton,
      this.plugin.settings.hideFolder ? "eye-off" : "eye"
    );
    this.statusBarItem.setText(
      this.plugin.settings.hideFolder ? "Attachment folders hidden" : ""
    );
    this.refreshFolders();
  }

  refreshFolders() {
    const filter = buildFolderRegExp(this.plugin.settings);
    const folders = document.querySelectorAll(".nav-folder-title-content");

    folders.forEach((folder) => {
      const folderName = folder.innerHTML.trim();
      if (filter.test(folderName)) {
        const folderElement = folder.parentElement?.parentElement;
        if (!folderElement) return;

        // Toggle hide class
        if (this.plugin.settings.hideFolder) {
          folderElement.addClass("attachmenter-hidden-folder");
        } else {
          folderElement.removeClass("attachmenter-hidden-folder");
        }

        // Toggle AERO class
        if (this.plugin.settings.aeroFolder) {
          folderElement.addClass("attachmenter-aero-folder");
        } else {
          folderElement.removeClass("attachmenter-aero-folder");
        }
      }
    });
  }

  unload() {
    this.mutationObserver.disconnect();
  }
}
