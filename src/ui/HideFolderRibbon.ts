import { setIcon, TFolder } from "obsidian";

import type AttachmenterPlugin from "../../main";
import type { AttachmenterSettings } from "../model/Settings";
import { t } from "../i18n/index";

/**
 * Builds a regex pattern to match attachment folder names based on settings.
 * Accounts for sanitized folder names (e.g., # replaced with space).
 */
export function buildFolderRegExp(settings: AttachmenterSettings): RegExp {
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
  private ribbonIconButton: HTMLElement | null = null;
  private statusBarItem: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private refreshTimeout: number | null = null;
  private isRefreshing: boolean = false;
  private attachmentFolderSection: HTMLElement | null = null;

  constructor(private plugin: AttachmenterPlugin) { }

  load() {
    // Create ribbon icon button (if enabled)
    if (this.plugin.settings.showRibbonIcon) {
      this.ribbonIconButton = this.plugin.addRibbonIcon(
        this.plugin.settings.hideFolder ? "eye-off" : "eye",
        "Toggle attachment folder visibility",
        (evt: MouseEvent) => {
          this.plugin.settings.hideFolder = !this.plugin.settings.hideFolder;
          void this.plugin.saveSettings();
          this.refresh(true); // Refresh folders when toggling hideFolder
        }
      );
    }

    // Add status bar item (if enabled)
    if (this.plugin.settings.showStatusBar) {
      this.statusBarItem = this.plugin.addStatusBarItem();
      this.statusBarItem.setText(
        this.plugin.settings.hideFolder ? "Attachment folders hidden" : ""
      );
    }

    // Add command
    this.plugin.addCommand({
      id: "toggle-folder-visibility",
      name: "Toggle attachment folder visibility",
      callback: () => {
        this.plugin.settings.hideFolder = !this.plugin.settings.hideFolder;
        void this.plugin.saveSettings();
        this.refresh(true); // Refresh folders when toggling hideFolder
      },
    });

    // Watch for DOM changes to update folder visibility (with debounce)
    if (!this.mutationObserver) {
      this.mutationObserver = new MutationObserver((mutationRecord) => {
        // Debounce to avoid excessive updates
        if (this.refreshTimeout) {
          clearTimeout(this.refreshTimeout);
        }
        this.refreshTimeout = window.setTimeout(() => {
          let shouldRefresh = false;
          mutationRecord.forEach((record) => {
            // Check if mutation is related to file explorer
            const target = record.target as HTMLElement;
            if (
              target?.classList?.contains("nav-folder") ||
              target?.classList?.contains("nav-files-container") ||
              target?.classList?.contains("nav-folder-children") ||
              target?.parentElement?.classList?.contains("nav-folder") ||
              target?.parentElement?.classList?.contains("nav-files-container")
            ) {
              shouldRefresh = true;
            }
            // Also check added nodes for new folder elements
            record.addedNodes.forEach((node) => {
              if (node instanceof HTMLElement) {
                if (node.classList?.contains("nav-folder") || node.querySelector?.(".nav-folder")) {
                  shouldRefresh = true;
                }
              }
            });
          });
          if (shouldRefresh && !this.isRefreshing) {
            this.refreshFolders();
          }
        }, 10); // Reduced delay for faster response
      });
      this.mutationObserver.observe(window.document, {
        childList: true,
        subtree: true,
      });
    }

    // Initial refresh - use refresh() to ensure all settings are properly applied
    // Wait for layout to be ready before initializing
    this.plugin.app.workspace.onLayoutReady(() => {
      // Execute immediately when layout is ready
      this.refresh(true);
    });

    // Listen for vault changes to update section count
    this.plugin.registerEvent(
      this.plugin.app.vault.on("create", () => {
        this.updateAttachmentFolderSection();
      })
    );
    this.plugin.registerEvent(
      this.plugin.app.vault.on("delete", () => {
        this.updateAttachmentFolderSection();
      })
    );
    this.plugin.registerEvent(
      this.plugin.app.vault.on("rename", () => {
        this.updateAttachmentFolderSection();
      })
    );
  }

  private initAttachmentFolderSection() {
    // Wait for file explorer to be ready
    setTimeout(() => {
      this.createAttachmentFolderSection();
    }, 500);

    // Also try to create it when file explorer is loaded
    this.plugin.app.workspace.onLayoutReady(() => {
      this.createAttachmentFolderSection();
    });
  }

  private createAttachmentFolderSection() {
    const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
    if (!fileExplorer?.view) return;

    const view = fileExplorer.view as any;
    const container = view.containerEl;
    if (!container) return;

    // Check if section already exists
    if (container.querySelector('.attachmenter-folder-section')) return;

    // Find the nav-files-container
    const navFilesContainer = container.querySelector('.nav-files-container');
    if (!navFilesContainer) return;

    // Create attachment manager button section (below toggle folder section)
    const section = document.createElement('div');
    section.className = 'attachmenter-folder-section';

    // Create button
    const button = document.createElement('div');
    button.className = 'attachmenter-manager-button';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.padding = '0.5em 0.75em';
    button.style.cursor = 'pointer';
    button.style.borderRadius = '4px';
    button.style.margin = '0.25em 0.5em';
    button.style.transition = 'background-color 0.2s';
    button.title = t("attachmentManager.title");

    button.onmouseenter = () => {
      button.style.backgroundColor = 'var(--background-modifier-hover)';
    };
    button.onmouseleave = () => {
      button.style.backgroundColor = 'transparent';
    };

    // Icon
    const icon = document.createElement('span');
    icon.className = 'attachmenter-manager-button-icon';
    setIcon(icon, 'folder');
    icon.style.marginRight = '0.5em';

    // Text
    const text = document.createElement('span');
    text.textContent = t("attachmentManager.title");
    text.style.fontSize = '0.9em';

    // Count
    const count = document.createElement('span');
    count.className = 'attachmenter-folder-count';
    count.style.marginLeft = '0.5em';
    count.style.fontSize = '0.85em';
    count.style.color = 'var(--text-muted)';

    button.appendChild(icon);
    button.appendChild(text);
    button.appendChild(count);

    // Add click handler to open manager view
    button.onclick = () => {
      this.openAttachmentManager();
    };

    section.appendChild(button);

    // Insert at the top of nav-files-container (below any existing toggle sections)
    navFilesContainer.insertBefore(section, navFilesContainer.firstChild);

    this.attachmentFolderSection = section;

    // Initial update
    this.updateAttachmentFolderSection();
  }

  private async openAttachmentManager() {
    const { ATTACHMENT_MANAGER_VIEW_TYPE } = await import("./AttachmentManagerView");
    const leaves = this.plugin.app.workspace.getLeavesOfType(ATTACHMENT_MANAGER_VIEW_TYPE);

    if (leaves.length > 0) {
      // Focus existing view
      this.plugin.app.workspace.revealLeaf(leaves[0]);
    } else {
      // Create new leaf in main area (not sidebar)
      const leaf = this.plugin.app.workspace.getLeaf('tab');
      if (leaf) {
        await leaf.setViewState({
          type: ATTACHMENT_MANAGER_VIEW_TYPE,
        });
        this.plugin.app.workspace.revealLeaf(leaf);
      }
    }
  }

  private updateAttachmentFolderSection() {
    if (!this.attachmentFolderSection) {
      this.createAttachmentFolderSection();
      return;
    }

    // Update count
    const folders = this.findAttachmentFolders();
    const count = folders.length;
    const countEl = this.attachmentFolderSection.querySelector('.attachmenter-folder-count');
    if (countEl) {
      countEl.textContent = count > 0 ? `(${count})` : '';
    }
  }

  refresh(shouldRefreshFolders: boolean = true) {
    // Update ribbon icon (if exists)
    if (this.ribbonIconButton) {
      // Update icon if it exists
      setIcon(
        this.ribbonIconButton,
        this.plugin.settings.hideFolder ? "eye-off" : "eye"
      );
    }

    // Handle ribbon icon creation/removal based on settings
    if (this.plugin.settings.showRibbonIcon && !this.ribbonIconButton) {
      // Create ribbon icon if it should be shown but doesn't exist
      this.ribbonIconButton = this.plugin.addRibbonIcon(
        this.plugin.settings.hideFolder ? "eye-off" : "eye",
        "Toggle attachment folder visibility",
        (evt: MouseEvent) => {
          this.plugin.settings.hideFolder = !this.plugin.settings.hideFolder;
          void this.plugin.saveSettings();
          this.refresh(true); // Refresh folders when toggling hideFolder
        }
      );
    } else if (!this.plugin.settings.showRibbonIcon && this.ribbonIconButton) {
      // Remove ribbon icon if it should be hidden
      try {
        (this.ribbonIconButton as HTMLElement).remove();
      } catch (error) {
        console.error("Error removing ribbon icon:", error);
      }
      this.ribbonIconButton = null;
    }

    // Update status bar - always process regardless of shouldRefreshFolders
    if (this.plugin.settings.showStatusBar) {
      // Should be shown
      if (!this.statusBarItem) {
        // Create status bar item if it doesn't exist
        this.statusBarItem = this.plugin.addStatusBarItem();
      }
      // Update text based on current hideFolder setting
      this.statusBarItem.setText(
        this.plugin.settings.hideFolder ? "Attachment folders hidden" : ""
      );
    } else {
      // Should be hidden
      if (this.statusBarItem) {
        // Remove status bar item if it exists
        try {
          if (this.statusBarItem.parentElement) {
            this.statusBarItem.remove();
          } else if (this.statusBarItem instanceof HTMLElement) {
            this.statusBarItem.remove();
          }
        } catch (error) {
          console.error("Error removing status bar item:", error);
        }
        this.statusBarItem = null;
      }
    }

    // Update attachment manager button
    if (this.plugin.settings.showAttachmentManagerButton) {
      if (!this.attachmentFolderSection) {
        this.initAttachmentFolderSection();
      } else {
        // Update existing section
        this.updateAttachmentFolderSection();
      }
    } else {
      if (this.attachmentFolderSection) {
        try {
          this.attachmentFolderSection.remove();
        } catch (error) {
          console.error("Error removing attachment folder section:", error);
        }
        this.attachmentFolderSection = null;
      }
    }

    // Only refresh folders if explicitly requested (for hideFolder or aeroFolder changes)
    if (shouldRefreshFolders) {
      // Use a small delay to ensure settings are saved
      setTimeout(() => {
        this.refreshFolders();
        // Refresh attachment manager views after folders are refreshed
        // Use plugin's unified method for consistency
        this.plugin.refreshAttachmentManagerViews();
      }, 50);
    }
  }

  refreshFolders() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const filter = buildFolderRegExp(this.plugin.settings);
        const folders = document.querySelectorAll(".nav-folder-title-content");

        let hasChanges = false;
        folders.forEach((folder) => {
          const folderName = folder.innerHTML.trim();

          // Identify folder element first to handle recycling
          let folderElement = folder.parentElement?.parentElement;
          if (!folderElement || !folderElement.classList.contains("nav-folder")) {
            folderElement = folder.closest(".nav-folder") as HTMLElement;
          }
          if (!folderElement) return;

          if (filter.test(folderName)) {
            const shouldHide = this.plugin.settings.hideFolder;
            const shouldAero = this.plugin.settings.aeroFolder;
            const isHidden = folderElement.hasClass("attachmenter-hidden-folder");
            const isAero = folderElement.hasClass("attachmenter-aero-folder");

            // Only update if state changed
            if (shouldHide !== isHidden) {
              hasChanges = true;
              if (shouldHide) {
                folderElement.addClass("attachmenter-hidden-folder");
                // Force clear any inline styles that might interfere
                (folderElement as HTMLElement).style.display = '';
                (folderElement as HTMLElement).style.visibility = '';
                (folderElement as HTMLElement).style.height = '';
              } else {
                folderElement.removeClass("attachmenter-hidden-folder");
                // Clear inline styles when showing
                (folderElement as HTMLElement).style.display = '';
                (folderElement as HTMLElement).style.visibility = '';
                (folderElement as HTMLElement).style.height = '';
              }
              // Force immediate reflow
              void folderElement.offsetHeight;
            }

            if (shouldAero !== isAero) {
              hasChanges = true;
              if (shouldAero) {
                folderElement.addClass("attachmenter-aero-folder");
              } else {
                folderElement.removeClass("attachmenter-aero-folder");
              }
            }
          } else {
            // Clean up recycled elements that no longer match the filter
            if (folderElement.hasClass("attachmenter-hidden-folder")) {
              hasChanges = true;
              folderElement.removeClass("attachmenter-hidden-folder");
              (folderElement as HTMLElement).style.display = '';
              (folderElement as HTMLElement).style.visibility = '';
              (folderElement as HTMLElement).style.height = '';
              void folderElement.offsetHeight;
            }
            if (folderElement.hasClass("attachmenter-aero-folder")) {
              hasChanges = true;
              folderElement.removeClass("attachmenter-aero-folder");
            }
          }
        });

        // Apply folder visibility changes immediately
        if (hasChanges) {
          // Force a synchronous reflow
          setTimeout(() => {
            this.forceFileExplorerRefresh();
            this.isRefreshing = false;
          }, 10); // Minimal delay, just enough to batch DOM changes
        } else {
          // No changes, just reset the flag
          this.isRefreshing = false;
        }
      });
    } catch (error) {
      console.error("Error refreshing folders:", error);
      this.isRefreshing = false;
    }
  }

  private forceFileExplorerRefresh() {
    const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
    if (!fileExplorer?.view) {
      return;
    }

    const view = fileExplorer.view as any;

    // Try multiple Obsidian internal methods to force refresh
    try {
      // Method 1: requestUpdate (common in Obsidian views)
      if (typeof view.requestUpdate === 'function') {
        view.requestUpdate();
      }

      // Method 2: recomputeChildren (forces re-render of child elements)
      if (typeof view.recomputeChildren === 'function') {
        view.recomputeChildren();
      }

      // Method 3: Trigger file tree rebuild
      if (view.fileItems && typeof view.sort === 'function') {
        view.sort();
      }

      // Method 4: Refresh tree view if available
      if (view.tree && typeof view.tree.infinityScroll?.invalidateAll === 'function') {
        view.tree.infinityScroll.invalidateAll();
      }

      // Method 5: Force virtual scroll recalculation
      if (view.tree?.infinityScroll) {
        const infinityScroll = view.tree.infinityScroll;
        if (typeof infinityScroll.compute === 'function') {
          infinityScroll.compute();
        }
        if (typeof infinityScroll.scrollToTop === 'function') {
          // Get current scroll position
          const container = document.querySelector('.nav-files-container') as HTMLElement;
          const scrollTop = container?.scrollTop || 0;
          // Force recalculation then restore position
          requestAnimationFrame(() => {
            if (container) {
              container.scrollTop = scrollTop;
            }
          });
        }
      }
    } catch (e) {
      console.debug("Could not call Obsidian internal methods:", e);
    }

    // Fallback: Trigger resize event on workspace to force layout recalculation
    requestAnimationFrame(() => {
      try {
        this.plugin.app.workspace.trigger('resize');
      } catch (e) {
        console.debug("Could not trigger resize:", e);
      }

      // Refresh file attachment tree if enabled
      if (this.plugin.settings.showFileAttachmentTree && this.plugin.fileAttachmentTree) {
        this.plugin.fileAttachmentTree.refreshAllFiles();
      }
    });
  }

  private findAttachmentFolders(): TFolder[] {
    const filter = buildFolderRegExp(this.plugin.settings);
    const folders: TFolder[] = [];

    const walkFolder = (folder: TFolder) => {
      if (filter.test(folder.name)) {
        folders.push(folder);
      }
      folder.children?.forEach((child) => {
        if (child instanceof TFolder) {
          walkFolder(child);
        }
      });
    };

    const root = this.plugin.app.vault.getRoot();
    root.children?.forEach((child) => {
      if (child instanceof TFolder) {
        walkFolder(child);
      }
    });

    return folders;
  }

  unload() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
  }
}
