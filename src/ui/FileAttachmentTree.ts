import { TFile, TFolder, setIcon, View } from "obsidian";
import type AttachmenterPlugin from "../../main";
import { PathResolver } from "../path/PathResolver";
import { t } from "../i18n/index";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { RenameImageModal } from "./RenameImageModal";
import { AttachmentRenameHandler } from "../handler/AttachmentRenameHandler";
import { AttachmentDeleteModal } from "./AttachmentDeleteModal";

interface FileExplorerItem {
  file: TFile;
  selfEl: HTMLElement;
}

interface FileExplorerView extends View {
  fileItems: Record<string, FileExplorerItem>;
  containerEl: HTMLElement;
}

export class FileAttachmentTree {
  private expandedFiles: Set<string> = new Set();
  private fileAttachmentContainers: Map<string, HTMLElement> = new Map();
  private mutationObserver!: MutationObserver;
  private pathResolver: PathResolver;
  private refreshTimeout: number | null = null;
  private isProcessing: boolean = false;
  private isEnabled: boolean = false;
  private isRenderingTree: boolean = false; // Lock to prevent refresh during tree rendering
  private isModalOpen: boolean = false; // Prevent multiple modals from opening

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
    // Skip refresh if disabled or currently rendering a tree
    if (!this.isEnabled || this.isRenderingTree) return;

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = window.setTimeout(() => {
      if (this.isEnabled && !this.isRenderingTree) {
        this.doRefreshAllFiles();
      }
    }, 300);
  }

  private initializeFileWatchers() {
    if (!this.isEnabled || this.isProcessing) return;

    // Disconnect existing observer if any
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Watch for new files being added to the file explorer
    this.mutationObserver = new MutationObserver((mutations) => {
      // Skip if processing or rendering tree
      if (this.isProcessing || this.isRenderingTree) return;

      // Collect new nav-file elements that need processing
      const newNavFiles: HTMLElement[] = [];

      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;

          // Ignore any attachment tree-related elements
          if (node.classList.contains('attachmenter-file-attachments') ||
            node.classList.contains('attachmenter-attachment-file') ||
            node.classList.contains('attachmenter-attachment-folder') ||
            node.classList.contains('attachmenter-expand-button') ||
            node.classList.contains('attachmenter-folder-files') ||
            node.classList.contains('attachmenter-folder-header') ||
            node.classList.contains('attachmenter-count-badge') ||
            node.classList.contains('attachmenter-load-more-container') ||
            node.closest('.attachmenter-file-attachments')) {
            continue; // Skip attachment tree elements
          }

          // Check for nav-file elements that DON'T already have expand buttons
          const navFiles = node.classList.contains('nav-file')
            ? [node]
            : Array.from(node.querySelectorAll('.nav-file'));

          for (const navFile of navFiles) {
            // Only collect if this nav-file doesn't have our button yet
            if (!navFile.querySelector('.attachmenter-expand-button')) {
              newNavFiles.push(navFile as HTMLElement);
            }
          }
        }
      }

      // Process new elements directly without triggering full refresh
      // This prevents scroll position from being reset
      if (newNavFiles.length > 0) {
        for (const navFile of newNavFiles) {
          this.processFileElement(navFile);
        }
      }
    });

    const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
    if (fileExplorer?.view) {
      const view = fileExplorer.view as unknown as FileExplorerView;
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
    if (!this.isEnabled || this.isProcessing || this.isRenderingTree) return;
    this.isProcessing = true;

    try {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
        if (!fileExplorer?.view) {
          this.isProcessing = false;
          return;
        }

        const view = fileExplorer.view as unknown as FileExplorerView;
        const container = view.containerEl;
        if (!container) {
          this.isProcessing = false;
          return;
        }

        // Check if container is visible (not hidden)
        const navFilesContainer = container.querySelector('.nav-files-container') as HTMLElement;
        if (!navFilesContainer || navFilesContainer.offsetHeight === 0) {
          this.isProcessing = false;
          return;
        }

        // Save scroll position before processing
        const scrollTop = navFilesContainer.scrollTop;

        // Find all markdown files in the file explorer
        const fileElements = container.querySelectorAll('.nav-file');
        fileElements.forEach((fileEl) => {
          // Only process if element is visible
          if ((fileEl as HTMLElement).offsetParent !== null) {
            this.processFileElement(fileEl as HTMLElement);
          }
        });

        // Restore scroll position after processing
        if (navFilesContainer.scrollTop !== scrollTop) {
          navFilesContainer.scrollTop = scrollTop;
        }

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

    const view = fileExplorer.view as unknown as FileExplorerView;

    // Try to get file from fileItems (most reliable method)
    let file: TFile | null = null;

    if (view.fileItems) {
      // Search through fileItems to find the one matching this element
      for (const [path, item] of Object.entries(view.fileItems)) {
        if (item && item.selfEl === fileEl) {
          const abstractFile = this.plugin.app.vault.getAbstractFileByPath(path);
          if (abstractFile instanceof TFile) {
            file = abstractFile;
          }
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
      // Button exists - check if we need to restore the tree
      if (this.expandedFiles.has(file.path)) {
        const existingContainer = this.fileAttachmentContainers.get(file.path);
        // Only re-render if container is completely missing or not in DOM
        if (!existingContainer || !document.body.contains(existingContainer)) {
          // Set rendering lock before restoring
          this.isRenderingTree = true;
          try {
            this.renderAttachmentTree(file, fileEl);
          } finally {
            setTimeout(() => { this.isRenderingTree = false; }, 50);
          }
        }
      }
      return;
    }

    // Add expand button
    this.addExpandButtonToFile(fileEl, file);
  }

  private addExpandButtonToFile(fileEl: HTMLElement, file: TFile) {
    const fileTitle = fileEl.querySelector('.nav-file-title') as HTMLElement;
    if (!fileTitle) return;

    // Set file title to relative positioning to allow absolute positioning of the button
    fileTitle.style.position = 'relative';
    fileTitle.style.paddingRight = '32px'; // Make room for the larger expand button

    // Create expand button - styled via CSS
    const expandButton = document.createElement('div');
    expandButton.className = 'attachmenter-expand-button';
    // Style properties moved to CSS (.attachmenter-expand-button)

    const isExpanded = this.expandedFiles.has(file.path);
    setIcon(expandButton, isExpanded ? 'chevron-down' : 'chevron-right');

    // Hover effects handled by CSS

    expandButton.onclick = (e) => {
      e.stopPropagation();
      this.toggleAttachmentPopover(file, fileEl, expandButton);
    };

    // Insert button at the end of file title (positioned absolutely on the right)
    fileTitle.appendChild(expandButton);

    // If already expanded, show the popover
    if (isExpanded) {
      this.showAttachmentPopover(file, fileEl, expandButton);
    }
  }

  private toggleAttachmentPopover(file: TFile, fileEl: HTMLElement, buttonEl: HTMLElement) {
    const isExpanded = this.expandedFiles.has(file.path);

    if (isExpanded) {
      // Collapse - remove popover
      this.expandedFiles.delete(file.path);
      const container = this.fileAttachmentContainers.get(file.path);
      if (container) {
        container.remove();
        this.fileAttachmentContainers.delete(file.path);
      }
      this.updateExpandButtonIcon(file);
    } else {
      // Close all other popovers first (only one popover at a time)
      this.closeAllPopovers();

      // Expand - show popover
      this.expandedFiles.add(file.path);
      this.showAttachmentPopover(file, fileEl, buttonEl);
      this.updateExpandButtonIcon(file);
    }
  }

  private closeAllPopovers() {
    // Collect paths before clearing
    const pathsToUpdate = Array.from(this.fileAttachmentContainers.keys());

    // Close all existing popovers
    for (const [, container] of this.fileAttachmentContainers) {
      container.remove();
    }
    this.fileAttachmentContainers.clear();
    this.expandedFiles.clear();

    // Update all expand button icons for the paths that were expanded
    for (const filePath of pathsToUpdate) {
      const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        this.updateExpandButtonIcon(file);
      }
    }
  }

  private showAttachmentPopover(file: TFile, fileEl: HTMLElement, buttonEl: HTMLElement) {
    // Remove existing popover for this file if any
    const existingContainer = this.fileAttachmentContainers.get(file.path);
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create floating popover container
    const popover = document.createElement('div');
    popover.className = 'attachmenter-file-attachments attachmenter-popover';

    // Get attachment folder
    const attachmentFolderPath = this.pathResolver.getAttachmentFolderForNote(file);
    const attachmentFolder = this.plugin.app.vault.getAbstractFileByPath(attachmentFolderPath);

    if (!attachmentFolder || !(attachmentFolder instanceof TFolder)) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'attachmenter-no-attachments';
      emptyMsg.textContent = t("fileAttachmentTree.noAttachments");
      popover.appendChild(emptyMsg);
    } else {
      this.renderAttachmentFolder(attachmentFolder, popover);
    }

    // Position the popover to the right of the file element
    const rect = fileEl.getBoundingClientRect();
    const fileExplorer = this.plugin.app.workspace.getLeavesOfType('file-explorer')[0];
    const explorerEl = fileExplorer?.view?.containerEl as HTMLElement;

    if (explorerEl) {
      const explorerRect = explorerEl.getBoundingClientRect();

      // Append to the file explorer container for proper positioning
      popover.style.position = 'fixed';
      popover.style.left = `${explorerRect.right + 5}px`;
      popover.style.top = `${rect.top}px`;
      // Dimensions and overflow handled by CSS

      document.body.appendChild(popover);

      // Adjust position if it goes off screen
      const popoverRect = popover.getBoundingClientRect();
      if (popoverRect.bottom > window.innerHeight) {
        popover.style.top = `${window.innerHeight - popoverRect.height - 10}px`;
      }
      if (popoverRect.right > window.innerWidth) {
        // Show on left side instead
        popover.style.left = `${explorerRect.left - popoverRect.width - 5}px`;
      }
    }

    this.fileAttachmentContainers.set(file.path, popover);

    // Close popover when clicking outside (but NOT when a modal is open)
    const closeHandler = (e: MouseEvent) => {
      // Don't close popover if a modal is currently open
      if (this.isModalOpen) return;

      if (!popover.contains(e.target as Node) && !buttonEl.contains(e.target as Node)) {
        this.expandedFiles.delete(file.path);
        popover.remove();
        this.fileAttachmentContainers.delete(file.path);
        this.updateExpandButtonIcon(file);
        document.removeEventListener('click', closeHandler);
      }
    };

    // Delay adding the listener to avoid immediate close
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  /**
   * Refresh the content of an existing popover in-place without recreating it.
   * This prevents the file list from jumping when renaming/deleting attachments.
   */
  private refreshPopoverContent(noteFile: TFile) {
    const existingPopover = this.fileAttachmentContainers.get(noteFile.path);
    if (!existingPopover || !existingPopover.classList.contains('attachmenter-popover')) {
      // No popover exists for this file, nothing to refresh
      return;
    }

    // Keep popover position styles but clear and re-render content
    const savedStyles = {
      position: existingPopover.style.position,
      left: existingPopover.style.left,
      top: existingPopover.style.top,
      maxHeight: existingPopover.style.maxHeight,
      maxWidth: existingPopover.style.maxWidth,
      overflowY: existingPopover.style.overflowY,
      zIndex: existingPopover.style.zIndex,
    };

    // Clear existing content
    existingPopover.innerHTML = '';

    // Re-render attachment folder content
    const attachmentFolderPath = this.pathResolver.getAttachmentFolderForNote(noteFile);
    const attachmentFolder = this.plugin.app.vault.getAbstractFileByPath(attachmentFolderPath);

    if (!attachmentFolder || !(attachmentFolder instanceof TFolder)) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'attachmenter-no-attachments';
      emptyMsg.textContent = t("fileAttachmentTree.noAttachments");
      existingPopover.appendChild(emptyMsg);
    } else {
      this.renderAttachmentFolder(attachmentFolder, existingPopover);
    }

    // Restore position styles
    Object.assign(existingPopover.style, savedStyles);
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

    const view = fileExplorer.view as unknown as FileExplorerView;
    const container = view.containerEl;
    if (!container) return null;

    // Try to find from fileItems first (more reliable)
    if (view.fileItems && view.fileItems[file.path]) {
      const fileItem = view.fileItems[file.path];
      if (fileItem && fileItem.selfEl) {
        return fileItem.selfEl;
      }
    }

    // Fallback: search through DOM
    const fileElements = container.querySelectorAll('.nav-file');
    for (const fileEl of Array.from(fileElements)) {
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
    // Set rendering lock to prevent MutationObserver from triggering refresh
    this.isRenderingTree = true;

    try {
      // Remove existing container if any
      const existingContainer = this.fileAttachmentContainers.get(file.path);
      if (existingContainer) {
        existingContainer.remove();
      }

      // Create attachment container
      const container = document.createElement('div');
      container.className = 'attachmenter-file-attachments';

      // Get attachment folder
      const attachmentFolderPath = this.pathResolver.getAttachmentFolderForNote(file);
      const attachmentFolder = this.plugin.app.vault.getAbstractFileByPath(attachmentFolderPath);

      if (!attachmentFolder || !(attachmentFolder instanceof TFolder)) {
        // No attachment folder
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'attachmenter-no-attachments';
        emptyMsg.textContent = t("fileAttachmentTree.noAttachments");
        container.appendChild(emptyMsg);
      } else {
        // Render attachment folder and files
        this.renderAttachmentFolder(attachmentFolder, container);
      }

      // Insert container as sibling AFTER the file element
      // This keeps the file title (with expand button) at the top
      const parent = fileEl.parentElement;
      if (parent) {
        if (fileEl.nextSibling) {
          parent.insertBefore(container, fileEl.nextSibling);
        } else {
          parent.appendChild(container);
        }
      }

      this.fileAttachmentContainers.set(file.path, container);
    } finally {
      // Release rendering lock after a short delay to let DOM settle
      setTimeout(() => {
        this.isRenderingTree = false;
      }, 50);
    }
  }

  private readonly MAX_VISIBLE_ATTACHMENTS = 20;

  private renderAttachmentFolder(folder: TFolder, container: HTMLElement) {
    const files = folder.children?.filter(child => child instanceof TFile) as TFile[] || [];
    const totalCount = files.length;

    // Create folder header
    const folderHeader = document.createElement('div');
    folderHeader.className = 'attachmenter-attachment-folder';

    const folderTitle = document.createElement('div');
    folderTitle.className = 'attachmenter-folder-header';

    const folderIcon = document.createElement('span');
    folderIcon.className = 'nav-folder-icon attachmenter-folder-icon';
    setIcon(folderIcon, 'folder');

    const folderName = document.createElement('span');
    folderName.className = 'attachmenter-folder-name';
    folderName.textContent = folder.name;

    // Add count badge
    const countBadge = document.createElement('span');
    countBadge.className = 'attachmenter-count-badge';
    countBadge.textContent = `${totalCount}`;

    folderTitle.appendChild(folderIcon);
    folderTitle.appendChild(folderName);
    folderTitle.appendChild(countBadge);
    folderHeader.appendChild(folderTitle);

    // Create files list container with max height for scroll
    const filesList = document.createElement('div');
    filesList.className = 'attachmenter-folder-files';

    if (files.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'attachmenter-empty-folder-msg';
      emptyMsg.textContent = t("fileAttachmentTree.emptyFolder");
      filesList.appendChild(emptyMsg);
    } else {
      // Get the note file that owns this attachment folder
      const noteFile = this.getNoteFileForFolder(folder);

      // Only render up to MAX_VISIBLE_ATTACHMENTS initially
      const visibleFiles = files.slice(0, this.MAX_VISIBLE_ATTACHMENTS);
      const remainingCount = totalCount - this.MAX_VISIBLE_ATTACHMENTS;

      visibleFiles.forEach((attachmentFile) => {
        this.renderAttachmentFile(attachmentFile, filesList, noteFile);
      });

      // Add "Load More" button if there are more files
      if (remainingCount > 0) {
        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.className = 'attachmenter-load-more-container';

        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'attachmenter-load-more-btn';
        loadMoreBtn.textContent = t("fileAttachmentTree.loadMore", { count: remainingCount });
        loadMoreBtn.onclick = (e) => {
          e.stopPropagation();
          // Remove the button
          loadMoreContainer.remove();
          // Render remaining files
          const remainingFiles = files.slice(this.MAX_VISIBLE_ATTACHMENTS);
          remainingFiles.forEach((attachmentFile) => {
            this.renderAttachmentFile(attachmentFile, filesList, noteFile);
          });
        };

        loadMoreContainer.appendChild(loadMoreBtn);
        filesList.appendChild(loadMoreContainer);
      }
    }

    folderHeader.appendChild(filesList);
    container.appendChild(folderHeader);
  }

  private renderAttachmentFile(file: TFile, container: HTMLElement, noteFile: TFile | null = null) {
    const fileEl = document.createElement('div');
    fileEl.className = 'attachmenter-attachment-file';
    // Inline styles removed in favor of CSS

    // Hover effects handled by CSS

    fileEl.onclick = (e) => {
      e.stopPropagation();
      void this.plugin.app.workspace.openLinkText(file.path, '', true);
    };

    // File icon - don't shrink
    const fileIcon = document.createElement('span');
    fileIcon.className = 'nav-file-icon';
    setIcon(fileIcon, this.getFileIcon(file.extension));
    // Inline styles removed in favor of CSS

    // File name - with overflow handling for long names
    const fileName = document.createElement('span');
    fileName.textContent = file.name;
    // Inline styles removed in favor of CSS

    // Actions container - never shrink
    const actions = document.createElement('div');
    actions.className = 'attachmenter-attachment-actions';
    // Inline styles removed in favor of CSS

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
    renameButton.onclick = (e) => {
      e.stopPropagation();
      this.showRenameDialog(file, noteFile);
    };

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'attachmenter-action-button attachmenter-action-button-danger';
    deleteButton.title = t("attachmentManager.delete");
    setIcon(deleteButton, 'trash-2');
    deleteButton.onclick = (e) => {
      e.stopPropagation();
      this.showDeleteConfirmation(file, noteFile);
    };

    actions.appendChild(previewButton);
    actions.appendChild(renameButton);
    actions.appendChild(deleteButton);

    fileEl.appendChild(fileIcon);
    fileEl.appendChild(fileName);
    fileEl.appendChild(actions);
    container.appendChild(fileEl);
  }

  private showPreview(file: TFile) {
    // Prevent multiple modals from opening
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    // Note: We DON'T close popovers here - modal has higher z-index and will appear on top
    // User wants to keep popover open while previewing

    const modal = new AttachmentPreviewModal(
      this.plugin.app,
      this.plugin.app.vault,
      file
    );

    // Reset flag when modal closes - with delay to prevent click from closing popover
    const originalOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      // Delay resetting the flag to prevent the modal close click from triggering popover close
      setTimeout(() => {
        this.isModalOpen = false;
      }, 200);
      originalOnClose();
    };

    modal.open();
  }

  private showRenameDialog(file: TFile, noteFile: TFile | null) {
    // Prevent multiple modals from opening
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    // Note: We DON'T close popovers here - modal has higher z-index

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
        // Refresh the popover content in-place for this file
        if (noteFile && this.expandedFiles.has(noteFile.path)) {
          this.refreshPopoverContent(noteFile);
        }
        // Refresh all files to update any changed references
        this.refreshAllFiles();
      }
    );

    // Reset flag when modal closes - with delay to prevent click from closing popover
    const originalOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      setTimeout(() => {
        this.isModalOpen = false;
      }, 200);
      originalOnClose();
    };

    modal.open();
  }

  private showDeleteConfirmation(file: TFile, noteFile: TFile | null) {
    // Prevent multiple modals from opening
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    // Note: We DON'T close popovers here - modal has higher z-index

    const modal = new AttachmentDeleteModal(
      this.plugin.app,
      this.plugin.app.vault,
      file,
      async () => {
        // Delete the file
        await this.plugin.app.fileManager.trashFile(file);

        // Refresh the popover content in-place for the parent note
        if (noteFile && this.expandedFiles.has(noteFile.path)) {
          this.refreshPopoverContent(noteFile);
        }
        // Refresh all files to update UI
        this.refreshAllFiles();
      }
    );

    // Reset flag when modal closes - with delay to prevent click from closing popover
    const originalOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      setTimeout(() => {
        this.isModalOpen = false;
      }, 200);
      originalOnClose();
    };

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
