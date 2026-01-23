import { TFile, TFolder, setIcon } from "obsidian";
import type AttachmenterPlugin from "../../main";
import { PathResolver } from "../path/PathResolver";
import { t } from "../i18n/index";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { RenameImageModal } from "./RenameImageModal";
import { AttachmentRenameHandler } from "../handler/AttachmentRenameHandler";

export class FileAttachmentTree {
  private expandedFiles: Set<string> = new Set();
  private fileAttachmentContainers: Map<string, HTMLElement> = new Map();
  private mutationObserver!: MutationObserver;
  private pathResolver: PathResolver;
  private refreshTimeout: number | null = null;
  private isProcessing: boolean = false;
  private isEnabled: boolean = false;

  constructor(private plugin: AttachmenterPlugin) {
    this.pathResolver = new PathResolver(this.plugin.app.vault, this.plugin.settings);
  }

  load() {
    this.isEnabled = true;

    // Wait for file explorer to be ready
    this.plugin.app.workspace.onLayoutReady(() => {
      if (this.isEnabled) {
        this.initializeFileWatchers();
      }
    });

    // Also try to initialize after a delay
    setTimeout(() => {
      if (this.isEnabled) {
        this.initializeFileWatchers();
      }
    }, 500);

    // Listen for vault changes to update attachment trees
    this.plugin.registerEvent(
      this.plugin.app.vault.on("create", () => {
        if (this.isEnabled) {
          this.debouncedRefresh();
        }
      })
    );
    this.plugin.registerEvent(
      this.plugin.app.vault.on("delete", () => {
        if (this.isEnabled) {
          this.debouncedRefresh();
        }
      })
    );
    this.plugin.registerEvent(
      this.plugin.app.vault.on("rename", () => {
        if (this.isEnabled) {
          this.debouncedRefresh();
        }
      })
    );
  }

  private debouncedRefresh() {
    if (!this.isEnabled) return;

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = window.setTimeout(() => {
      if (this.isEnabled) {
        this.doRefreshAllFiles();
      }
    }, 300);
  }

  private initializeFileWatchers() {
    if (!this.isEnabled || this.isProcessing) return;

    // Watch for new files being added to the file explorer
    this.mutationObserver = new MutationObserver((mutations) => {
      if (this.isProcessing) return;

      let shouldProcess = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if it's a nav-file element
            if (node.classList.contains("nav-file") || node.querySelector(".nav-file")) {
              shouldProcess = true;
            }
          }
        });
      });

      if (shouldProcess) {
        this.debouncedRefresh();
      }
    });

    const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
    if (fileExplorer?.view) {
      const view = fileExplorer.view as any;
      const container = view.containerEl;
      if (container) {
        this.mutationObserver.observe(container, {
          childList: true,
          subtree: true,
        });
      }
    }

    // Initial processing
    this.doRefreshAllFiles();
  }

  private doRefreshAllFiles() {
    if (!this.isEnabled || this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
        if (!fileExplorer?.view) {
          this.isProcessing = false;
          return;
        }

        const view = fileExplorer.view as any;
        const container = view.containerEl;
        if (!container) {
          this.isProcessing = false;
          return;
        }

        // Check if container is visible (not hidden)
        const navFilesContainer = container.querySelector('.nav-files-container');
        if (!navFilesContainer || navFilesContainer.offsetHeight === 0) {
          this.isProcessing = false;
          return;
        }

        // Find all markdown files in the file explorer
        const fileElements = container.querySelectorAll('.nav-file');
        fileElements.forEach((fileEl: HTMLElement) => {
          // Only process if element is visible
          if (fileEl.offsetParent !== null) {
            this.processFileElement(fileEl);
          }
        });

        this.isProcessing = false;
      });
    } catch (error) {
      console.error("Error refreshing file attachment tree:", error);
      this.isProcessing = false;
    }
  }

  private processFileElement(fileEl: HTMLElement) {
    if (!this.isEnabled) return;

    // Skip if this element or its parent is in a hidden folder
    const hiddenParent = fileEl.closest('.attachmenter-hidden-folder');
    if (hiddenParent) {
      return; // Don't process files in hidden attachment folders
    }

    // Skip if element is not visible
    if (fileEl.offsetParent === null && !document.body.contains(fileEl)) {
      return;
    }

    // Get the file path from the element
    const fileTitle = fileEl.querySelector('.nav-file-title');
    if (!fileTitle) return;

    // Try to get the file from the file explorer view
    const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
    if (!fileExplorer?.view) return;

    const view = fileExplorer.view as any;

    // Try to get file from fileItems (most reliable method)
    let file: TFile | null = null;

    if (view.fileItems) {
      // Search through fileItems to find the one matching this element
      for (const [path, item] of Object.entries(view.fileItems)) {
        if (item && (item as any).selfEl === fileEl) {
          file = this.plugin.app.vault.getAbstractFileByPath(path) as TFile;
          break;
        }
      }
    }

    // Fallback: try to get from data-path attribute
    if (!file) {
      const filePath = (fileTitle as HTMLElement).getAttribute('data-path');
      if (filePath) {
        const abstractFile = this.plugin.app.vault.getAbstractFileByPath(filePath);
        if (abstractFile instanceof TFile) {
          file = abstractFile;
        }
      }
    }

    // Final fallback: try to match by filename
    if (!file) {
      const titleText = (fileTitle as HTMLElement).textContent?.trim();
      if (titleText) {
        // Try to find file by basename or full name
        const allFiles = this.plugin.app.vault.getMarkdownFiles();
        file = allFiles.find(f => f.basename === titleText || f.name === titleText) || null;
      }
    }

    if (!file || file.extension !== 'md') {
      return;
    }

    // Check if expand button already exists
    const existingButton = fileEl.querySelector('.attachmenter-expand-button');
    if (existingButton) {
      // Button exists, but check if attachment tree needs to be restored
      if (this.expandedFiles.has(file.path) && !this.fileAttachmentContainers.has(file.path)) {
        // Tree was expanded but container was lost, restore it
        this.renderAttachmentTree(file, fileEl);
      }
      return;
    }

    // Add expand button
    this.addExpandButtonToFile(fileEl, file);
  }

  private addExpandButtonToFile(fileEl: HTMLElement, file: TFile) {
    const fileTitle = fileEl.querySelector('.nav-file-title');
    if (!fileTitle) return;

    // Create expand button
    const expandButton = document.createElement('div');
    expandButton.className = 'attachmenter-expand-button';
    expandButton.style.display = 'inline-block';
    expandButton.style.marginLeft = '0.5em';
    expandButton.style.cursor = 'pointer';
    expandButton.style.opacity = '0.6';
    expandButton.style.transition = 'opacity 0.2s';

    const isExpanded = this.expandedFiles.has(file.path);
    setIcon(expandButton, isExpanded ? 'chevron-down' : 'chevron-right');

    expandButton.onmouseenter = () => {
      expandButton.style.opacity = '1';
    };
    expandButton.onmouseleave = () => {
      expandButton.style.opacity = '0.6';
    };

    expandButton.onclick = (e) => {
      e.stopPropagation();
      this.toggleAttachmentTree(file);
    };

    // Insert button after file title
    fileTitle.appendChild(expandButton);

    // If already expanded, render the tree
    if (isExpanded) {
      this.renderAttachmentTree(file, fileEl);
    }
  }

  private toggleAttachmentTree(file: TFile) {
    const isExpanded = this.expandedFiles.has(file.path);

    if (isExpanded) {
      // Collapse
      this.expandedFiles.delete(file.path);
      const container = this.fileAttachmentContainers.get(file.path);
      if (container) {
        container.remove();
        this.fileAttachmentContainers.delete(file.path);
      }
    } else {
      // Expand
      this.expandedFiles.add(file.path);
      const fileEl = this.findFileElement(file);
      if (fileEl) {
        this.renderAttachmentTree(file, fileEl);
      }
    }

    // Update expand button icon
    this.updateExpandButtonIcon(file);
  }

  private findFileElement(file: TFile): HTMLElement | null {
    const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
    if (!fileExplorer?.view) return null;

    const view = fileExplorer.view as any;
    const container = view.containerEl;
    if (!container) return null;

    // Try to find from fileItems first (more reliable)
    if (view.fileItems && view.fileItems[file.path]) {
      const fileItem = view.fileItems[file.path];
      if (fileItem && (fileItem as any).selfEl) {
        return (fileItem as any).selfEl as HTMLElement;
      }
    }

    // Fallback: search through DOM
    const fileElements = container.querySelectorAll('.nav-file');
    for (const fileEl of fileElements) {
      const fileTitle = (fileEl as HTMLElement).querySelector('.nav-file-title');
      if (fileTitle) {
        let filePath = (fileTitle as HTMLElement).getAttribute('data-path');

        // If no data-path, try to match by filename
        if (!filePath) {
          const titleText = (fileTitle as HTMLElement).textContent?.trim();
          if (titleText === file.basename || titleText === file.name) {
            filePath = file.path;
          }
        }

        if (filePath === file.path) {
          return fileEl as HTMLElement;
        }
      }
    }
    return null;
  }

  private updateExpandButtonIcon(file: TFile) {
    const fileEl = this.findFileElement(file);
    if (!fileEl) return;

    const expandButton = fileEl.querySelector('.attachmenter-expand-button') as HTMLElement;
    if (!expandButton) return;

    const isExpanded = this.expandedFiles.has(file.path);
    setIcon(expandButton, isExpanded ? 'chevron-down' : 'chevron-right');
  }

  private getNoteFileForFolder(folder: TFolder): TFile | null {
    // Try to find the note file that owns this attachment folder
    const folderName = folder.name;
    const folderSuffix = this.plugin.settings.defaultFolderSuffix || "_Attachments";

    if (folderName.endsWith(folderSuffix)) {
      const noteName = folderName.substring(0, folderName.length - folderSuffix.length);
      const folderDir = folder.parent?.path || "";

      const allNotes = this.plugin.app.vault.getMarkdownFiles();
      let noteFile = allNotes.find(n =>
        n.basename === noteName &&
        (folderDir === "" || n.path.startsWith(folderDir))
      );

      if (!noteFile) {
        // Try sanitized name match
        noteFile = allNotes.find(n => {
          const sanitized = n.basename.replace(/[#<>:"|?*]/g, " ");
          return sanitized === noteName || sanitized.trim() === noteName.trim();
        });
      }

      return noteFile || null;
    }

    return null;
  }

  private renderAttachmentTree(file: TFile, fileEl: HTMLElement) {
    // Remove existing container if any
    const existingContainer = this.fileAttachmentContainers.get(file.path);
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create attachment container
    const container = document.createElement('div');
    container.className = 'attachmenter-file-attachments';
    container.style.marginLeft = '1.5em';
    container.style.marginTop = '0.25em';

    // Get attachment folder
    const attachmentFolderPath = this.pathResolver.getAttachmentFolderForNote(file);
    const attachmentFolder = this.plugin.app.vault.getAbstractFileByPath(attachmentFolderPath);

    if (!attachmentFolder || !(attachmentFolder instanceof TFolder)) {
      // No attachment folder
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'attachmenter-no-attachments';
      emptyMsg.textContent = t("fileAttachmentTree.noAttachments");
      emptyMsg.style.padding = '0.5em';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.fontSize = '0.85em';
      emptyMsg.style.fontStyle = 'italic';
      container.appendChild(emptyMsg);
    } else {
      // Render attachment folder and files
      this.renderAttachmentFolder(attachmentFolder, container);
    }

    // Insert container after file element (as next sibling)
    // Find the parent container (usually nav-folder-children or nav-files-container)
    const parent = fileEl.parentElement;
    if (parent) {
      // Insert after the file element
      if (fileEl.nextSibling) {
        parent.insertBefore(container, fileEl.nextSibling);
      } else {
        parent.appendChild(container);
      }
    }
    this.fileAttachmentContainers.set(file.path, container);
  }

  private renderAttachmentFolder(folder: TFolder, container: HTMLElement) {
    // Create folder header
    const folderHeader = document.createElement('div');
    folderHeader.className = 'attachmenter-attachment-folder';
    folderHeader.style.marginBottom = '0.25em';

    const folderTitle = document.createElement('div');
    folderTitle.className = 'attachmenter-folder-header';
    folderTitle.style.display = 'flex';
    folderTitle.style.alignItems = 'center';
    folderTitle.style.padding = '0.25em 0';
    folderTitle.style.color = 'var(--text-muted)';
    folderTitle.style.fontSize = '0.85em';

    const folderIcon = document.createElement('span');
    folderIcon.className = 'nav-folder-icon';
    setIcon(folderIcon, 'folder');
    folderIcon.style.marginRight = '0.5em';

    const folderName = document.createElement('span');
    folderName.textContent = folder.name;

    folderTitle.appendChild(folderIcon);
    folderTitle.appendChild(folderName);
    folderHeader.appendChild(folderTitle);

    // Create files list
    const filesList = document.createElement('div');
    filesList.className = 'attachmenter-folder-files';
    filesList.style.marginLeft = '1.5em';

    const files = folder.children?.filter(child => child instanceof TFile) || [];
    if (files.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.textContent = t("fileAttachmentTree.emptyFolder");
      emptyMsg.style.padding = '0.5em';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.fontSize = '0.85em';
      emptyMsg.style.fontStyle = 'italic';
      filesList.appendChild(emptyMsg);
    } else {
      // Get the note file that owns this attachment folder
      const noteFile = this.getNoteFileForFolder(folder);

      files.forEach((attachmentFile) => {
        if (attachmentFile instanceof TFile) {
          this.renderAttachmentFile(attachmentFile, filesList, noteFile);
        }
      });
    }

    folderHeader.appendChild(filesList);
    container.appendChild(folderHeader);
  }

  private renderAttachmentFile(file: TFile, container: HTMLElement, noteFile: TFile | null = null) {
    const fileEl = document.createElement('div');
    fileEl.className = 'attachmenter-attachment-file';
    fileEl.style.display = 'flex';
    fileEl.style.alignItems = 'center';
    fileEl.style.padding = '0.25em 0.5em';
    fileEl.style.cursor = 'pointer';
    fileEl.style.borderRadius = '4px';
    fileEl.style.transition = 'background-color 0.2s';

    fileEl.onmouseenter = () => {
      fileEl.style.backgroundColor = 'var(--background-modifier-hover)';
    };
    fileEl.onmouseleave = () => {
      fileEl.style.backgroundColor = 'transparent';
    };

    fileEl.onclick = (e) => {
      e.stopPropagation();
      this.plugin.app.workspace.openLinkText(file.path, '', true);
    };

    // File icon
    const fileIcon = document.createElement('span');
    fileIcon.className = 'nav-file-icon';
    setIcon(fileIcon, this.getFileIcon(file.extension));
    fileIcon.style.marginRight = '0.5em';

    // File name
    const fileName = document.createElement('span');
    fileName.textContent = file.name;
    fileName.style.fontSize = '0.85em';
    fileName.style.color = 'var(--text-normal)';
    fileName.style.flex = '1';

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'attachmenter-attachment-actions';
    actions.style.display = 'flex';
    actions.style.gap = '0.5em';
    actions.style.marginLeft = '0.5em';

    // Preview button
    const previewButton = document.createElement('button');
    previewButton.className = 'attachmenter-action-button';
    previewButton.title = t("attachmentManager.preview");
    setIcon(previewButton, 'eye');
    previewButton.onclick = (e) => {
      e.stopPropagation();
      this.showPreview(file);
    };

    // Rename button
    const renameButton = document.createElement('button');
    renameButton.className = 'attachmenter-action-button';
    renameButton.title = t("attachmentManager.rename");
    setIcon(renameButton, 'pencil');
    renameButton.onclick = async (e) => {
      e.stopPropagation();
      await this.showRenameDialog(file, noteFile);
    };

    actions.appendChild(previewButton);
    actions.appendChild(renameButton);

    fileEl.appendChild(fileIcon);
    fileEl.appendChild(fileName);
    fileEl.appendChild(actions);
    container.appendChild(fileEl);
  }

  private showPreview(file: TFile) {
    const modal = new AttachmentPreviewModal(
      this.plugin.app,
      this.plugin.app.vault,
      file
    );
    modal.open();
  }

  private async showRenameDialog(file: TFile, noteFile: TFile | null) {
    const renameHandler = new AttachmentRenameHandler(
      this.plugin.app.vault,
      this.plugin.app.fileManager,
      this.plugin.app.metadataCache
    );

    const defaultName = file.basename;
    const modal = new RenameImageModal(
      this.plugin.app,
      file,
      defaultName,
      async (newName: string) => {
        await renameHandler.renameAttachment(file, newName, noteFile);
        // Refresh the attachment tree for this file
        if (noteFile) {
          const fileEl = this.findFileElement(noteFile);
          if (fileEl && this.expandedFiles.has(noteFile.path)) {
            this.renderAttachmentTree(noteFile, fileEl);
          }
        }
        // Refresh all files to update any changed references
        this.refreshAllFiles();
      }
    );
    modal.open();
  }

  refreshAllFiles() {
    if (!this.isEnabled) return;
    // Public method to refresh all files, using debounce for performance
    this.debouncedRefresh();
  }

  private getFileIcon(extension: string): string {
    const iconMap: Record<string, string> = {
      'png': 'file-image',
      'jpg': 'file-image',
      'jpeg': 'file-image',
      'gif': 'file-image',
      'svg': 'file-image',
      'webp': 'file-image',
      'pdf': 'file-text',
      'mp4': 'video',
      'mp3': 'headphones',
      'zip': 'archive',
    };
    return iconMap[extension.toLowerCase()] || 'file';
  }

  unload() {
    this.isEnabled = false;

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Remove all expand buttons from DOM
    document.querySelectorAll('.attachmenter-expand-button').forEach((el) => {
      el.remove();
    });

    // Remove all attachment containers from DOM
    document.querySelectorAll('.attachmenter-file-attachments').forEach((el) => {
      el.remove();
    });

    // Clean up tracked containers
    this.fileAttachmentContainers.forEach((container) => {
      container.remove();
    });
    this.fileAttachmentContainers.clear();
    this.expandedFiles.clear();
  }
}
