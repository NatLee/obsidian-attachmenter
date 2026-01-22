import {
  App,
  FileManager,
  Modal,
  moment,
  Notice,
  TFile,
  TFolder,
  Vault,
} from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import {
  PathValidator,
  type ImageLink,
  type ValidationIssue,
  type ValidationResult,
} from "../lib/PathValidator";
import { NameResolver } from "../path/NameResolver";
import { RenameImageModal } from "./RenameImageModal";

export class PathCheckModal extends Modal {
  private validationResult: ValidationResult | null = null;
  private isRunning = false;
  private nameResolver: NameResolver;

  constructor(
    app: App,
    private vault: Vault,
    private fileManager: FileManager,
    private settings: AttachmenterSettings
  ) {
    super(app);
    this.modalEl.addClass("attachmenter-path-check-modal");
    this.nameResolver = new NameResolver(settings);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Path Validation" });
    contentEl.createEl("p", {
      text: "Checking attachment folder paths for all notes...",
      cls: "attachmenter-check-status",
    });

    // Run validation
    this.runValidation();
  }

  private async runValidation() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const result = await PathValidator.validateAttachmentFolders(
        this.vault,
        this.settings,
        this.app
      );
      this.validationResult = result;
      this.renderResults();
    } catch (error) {
      console.error("Error validating paths:", error);
      new Notice("Failed to validate paths");
    } finally {
      this.isRunning = false;
    }
  }

  private renderResults() {
    const { contentEl } = this;
    if (!this.validationResult) return;

    // Remove status message
    const statusEl = contentEl.querySelector(".attachmenter-check-status");
    if (statusEl) {
      statusEl.remove();
    }

    // Summary
    const summaryContainer = contentEl.createDiv({
      cls: "attachmenter-validation-summary",
    });

    summaryContainer.createEl("h3", { text: "Summary" });
    const summaryList = summaryContainer.createEl("ul");
    summaryList.createEl("li", {
      text: `Total files checked: ${this.validationResult.totalFiles}`,
    });
    summaryList.createEl("li", {
      text: `Missing folders: ${this.validationResult.summary.missing}`,
    });
    summaryList.createEl("li", {
      text: `Name mismatches: ${this.validationResult.summary.nameMismatch}`,
    });
    summaryList.createEl("li", {
      text: `Files with invalid characters: ${this.validationResult.summary.invalidChars}`,
    });

    if (this.validationResult.issues.length === 0) {
      contentEl.createEl("p", {
        text: "✓ All paths are valid!",
        cls: "attachmenter-success-message",
      });
      return;
    }

    // Issues list
    const issuesContainer = contentEl.createDiv({
      cls: "attachmenter-issues-container",
    });
    issuesContainer.createEl("h3", { text: "Issues Found" });

    // Group issues by type
    const missingIssues = this.validationResult.issues.filter(
      (i) => i.issue === "missing"
    );
    const mismatchIssues = this.validationResult.issues.filter(
      (i) => i.issue === "name_mismatch"
    );
    const invalidCharIssues = this.validationResult.issues.filter(
      (i) => i.issue === "invalid_chars"
    );

    if (missingIssues.length > 0) {
      this.renderIssueSection(
        issuesContainer,
        "Missing Folders",
        missingIssues,
        "missing"
      );
    }

    if (mismatchIssues.length > 0) {
      this.renderIssueSection(
        issuesContainer,
        "Name Mismatches",
        mismatchIssues,
        "name_mismatch"
      );
    }

    if (invalidCharIssues.length > 0) {
      this.renderIssueSection(
        issuesContainer,
        "Invalid Characters",
        invalidCharIssues,
        "invalid_chars"
      );
    }

    // Fix All button
    if (
      missingIssues.length > 0 ||
      mismatchIssues.length > 0 ||
      invalidCharIssues.length > 0
    ) {
      const buttonContainer = contentEl.createDiv({
        cls: "attachmenter-fix-buttons",
      });
      const fixAllButton = buttonContainer.createEl("button", {
        text: "Fix All Issues",
        cls: "mod-cta",
      });
      fixAllButton.onclick = async () => {
        await this.fixAllIssues();
      };
    }
  }

  private renderIssueSection(
    container: HTMLElement,
    title: string,
    issues: ValidationIssue[],
    issueType: "missing" | "name_mismatch" | "invalid_chars"
  ) {
    const section = container.createDiv({ cls: "attachmenter-issue-section" });
    section.createEl("h4", { text: `${title} (${issues.length})` });

    const issuesList = section.createDiv({ cls: "attachmenter-issues-list" });

    issues.slice(0, 10).forEach((issue) => {
      const issueItem = issuesList.createDiv({
        cls: "attachmenter-issue-item",
      });

      issueItem.createEl("div", {
        cls: "attachmenter-issue-file",
        text: issue.file.path,
      });

      if (issueType === "missing") {
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: `Expected: ${issue.expectedFolderPath}`,
        });
      } else if (issueType === "name_mismatch") {
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: `Expected: ${issue.expectedFolderPath}`,
        });
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: `Actual: ${issue.actualFolderPath || "N/A"}`,
        });
      } else if (issueType === "invalid_chars") {
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: `Invalid characters: ${issue.invalidChars?.join(", ") || "N/A"}`,
        });
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: `Note name: ${issue.file.basename}`,
        });
      }
    });

    if (issues.length > 10) {
      issuesList.createEl("p", {
        text: `... and ${issues.length - 10} more issues`,
        cls: "attachmenter-more-issues",
      });
    }
  }

  /**
   * Prompt user to rename an image file.
   * @param imageFile - The image file to rename
   * @param defaultBaseName - Default base name (without extension)
   * @returns The new base name, or null if user cancelled
   */
  private async promptForImageName(
    imageFile: TFile,
    defaultBaseName: string
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new RenameImageModal(
        this.app,
        imageFile,
        defaultBaseName,
        async (newName: string) => {
          resolve(newName);
        },
        () => {
          resolve(null);
        }
      );
      modal.open();
    });
  }

  /**
   * Copy images to the target folder and update markdown links.
   * @param file - The markdown/canvas file
   * @param imageLinks - Array of image links found in the file
   * @param targetFolder - Target attachment folder path
   */
  private async copyImagesToFolder(
    file: TFile,
    imageLinks: ImageLink[],
    targetFolder: string
  ): Promise<void> {
    let content = await this.vault.read(file);
    let contentModified = false;

    // Ensure target folder exists
    const targetFolderObj = this.vault.getAbstractFileByPath(targetFolder);
    if (!(targetFolderObj instanceof TFolder)) {
      await this.vault.createFolder(targetFolder);
    }

    if (file.extension === "md") {
      // Process markdown file
      for (const imageLink of imageLinks) {
        if (!imageLink.resolvedPath) {
          console.warn(
            `Image link not resolved: ${imageLink.linkText} in ${file.path}`
          );
          continue;
        }

        const imageFile = this.vault.getAbstractFileByPath(
          imageLink.resolvedPath
        );
        if (!(imageFile instanceof TFile)) {
          console.warn(
            `Image file not found: ${imageLink.resolvedPath} in ${file.path}`
          );
          continue;
        }

        // Check if image is already in target folder
        const lastSlashIndex = imageFile.path.lastIndexOf("/");
        const imageDir =
          lastSlashIndex >= 0
            ? imageFile.path.substring(0, lastSlashIndex)
            : ".";
        if (imageDir === targetFolder) {
          // Image is already in the correct location
          continue;
        }

        // Generate default name using NameResolver
        const defaultBaseName = this.nameResolver.buildBaseName(file, moment());

        // Determine the final name based on settings
        let finalBaseName: string;
        if (this.settings.promptRenameImage) {
          // Prompt user for rename
          finalBaseName = await this.promptForImageName(
            imageFile,
            defaultBaseName
          );
          if (!finalBaseName) {
            // User cancelled, skip this image
            continue;
          }
        } else {
          // Use default name
          finalBaseName = defaultBaseName;
        }

        // Generate new path in target folder
        const ext = imageFile.extension;
        let newImagePath = `${targetFolder}/${finalBaseName}.${ext}`;

        // Handle filename conflicts
        let counter = 1;
        while (this.vault.getAbstractFileByPath(newImagePath)) {
          newImagePath = `${targetFolder}/${finalBaseName}_${counter}.${ext}`;
          counter++;
        }

        // Move the image file
        try {
          await this.fileManager.renameFile(imageFile, newImagePath);
        } catch (error) {
          console.error(
            `Failed to move image ${imageFile.path} to ${newImagePath}:`,
            error
          );
          continue;
        }

        // Update markdown content
        const newImageFile = this.vault.getAbstractFileByPath(newImagePath);
        if (newImageFile instanceof TFile) {
          if (imageLink.type === "markdown") {
            // Update markdown link: ![alt](path)
            const newLink = this.fileManager.generateMarkdownLink(
              newImageFile,
              file.path,
              undefined,
              imageLink.altText
            );
            // Ensure it's an image link
            const imageLinkText = newLink.startsWith("!")
              ? newLink
              : `!${newLink}`;
            content = content.replace(imageLink.match, imageLinkText);
            contentModified = true;
          } else if (imageLink.type === "wiki") {
            // Update wiki link: ![[path]] or ![[path|alt]]
            // Since attachment folder is in the same directory as the note,
            // we can use basename for wiki links
            const altPart = imageLink.altText
              ? `|${imageLink.altText}`
              : "";
            // Use basename since the attachment folder is in the same directory
            const newWikiLink = `![[${newImageFile.basename}${altPart}]]`;
            // Replace only the first occurrence to handle multiple identical links correctly
            content = content.replace(imageLink.match, newWikiLink);
            contentModified = true;
          }
        }
      }
    } else if (file.extension === "canvas") {
      // Process canvas file
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data.nodes)) {
          for (const imageLink of imageLinks) {
            if (!imageLink.resolvedPath) {
              continue;
            }

            const imageFile = this.vault.getAbstractFileByPath(
              imageLink.resolvedPath
            );
            if (!(imageFile instanceof TFile)) {
              continue;
            }

            // Check if image is already in target folder
            const lastSlashIndex = imageFile.path.lastIndexOf("/");
            const imageDir =
              lastSlashIndex >= 0
                ? imageFile.path.substring(0, lastSlashIndex)
                : ".";
            if (imageDir === targetFolder) {
              continue;
            }

            // Generate default name using NameResolver
            const defaultBaseName = this.nameResolver.buildBaseName(
              file,
              moment()
            );

            // Determine the final name based on settings
            let finalBaseName: string;
            if (this.settings.promptRenameImage) {
              // Prompt user for rename
              finalBaseName = await this.promptForImageName(
                imageFile,
                defaultBaseName
              );
              if (!finalBaseName) {
                // User cancelled, skip this image
                continue;
              }
            } else {
              // Use default name
              finalBaseName = defaultBaseName;
            }

            // Generate new path in target folder
            const ext = imageFile.extension;
            let newImagePath = `${targetFolder}/${finalBaseName}.${ext}`;

            // Handle filename conflicts
            let counter = 1;
            while (this.vault.getAbstractFileByPath(newImagePath)) {
              newImagePath = `${targetFolder}/${finalBaseName}_${counter}.${ext}`;
              counter++;
            }

            // Move the image file
            try {
              await this.fileManager.renameFile(imageFile, newImagePath);
            } catch (error) {
              console.error(
                `Failed to move image ${imageFile.path} to ${newImagePath}:`,
                error
              );
              continue;
            }

            // Update canvas node
            const newImageFile = this.vault.getAbstractFileByPath(newImagePath);
            if (newImageFile instanceof TFile) {
              // Find and update the node
              for (const node of data.nodes) {
                if (
                  (node.type === "file" && node.file === imageLink.linkText) ||
                  (node.type === "link" && node.url === imageLink.linkText)
                ) {
                  node.type = "file";
                  node.file = newImageFile.basename;
                  contentModified = true;
                  break;
                }
              }
            }
          }

          if (contentModified) {
            content = JSON.stringify(data, null, "\t");
          }
        }
      } catch (error) {
        console.error(`Failed to parse canvas file: ${file.path}`, error);
      }
    }

    // Save updated content
    if (contentModified) {
      await this.vault.modify(file, content);
    }
  }

  private async fixAllIssues() {
    if (!this.validationResult) return;

    const { issues } = this.validationResult;
    let fixed = 0;
    let failed = 0;

    for (const issue of issues) {
      try {
        if (issue.issue === "missing") {
          // Create missing folder
          await this.vault.createFolder(issue.expectedFolderPath);

          // Copy images to the folder if there are any
          if (issue.imageLinks && issue.imageLinks.length > 0) {
            await this.copyImagesToFolder(
              issue.file,
              issue.imageLinks,
              issue.expectedFolderPath
            );
          }

          fixed++;
        } else if (issue.issue === "name_mismatch" && issue.actualFolderPath) {
          // Rename folder to match expected
          const actualFolder = this.vault.getAbstractFileByPath(
            issue.actualFolderPath
          );
          if (actualFolder instanceof TFolder) {
            await this.fileManager.renameFile(
              actualFolder,
              issue.expectedFolderPath
            );

            // Copy images to the renamed folder if there are any
            if (issue.imageLinks && issue.imageLinks.length > 0) {
              await this.copyImagesToFolder(
                issue.file,
                issue.imageLinks,
                issue.expectedFolderPath
              );
            }

            fixed++;
          }
        }
        // Note: invalid_chars issues don't need fixing - they're informational
        // The folders are already created with sanitized names
      } catch (error) {
        console.error(`Failed to fix issue for ${issue.file.path}:`, error);
        failed++;
      }
    }

    new Notice(
      `Fixed ${fixed} issue(s)${failed > 0 ? `, ${failed} failed` : ""}`
    );

    // Re-run validation to update results
    await this.runValidation();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
