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
  type ChangePlan,
} from "../lib/PathValidator";
import { NameResolver } from "../path/NameResolver";
import { RenameImageModal } from "./RenameImageModal";
import { t } from "../i18n/index";

export class PathCheckModal extends Modal {
  private validationResult: ValidationResult | null = null;
  private isRunning = false;
  private nameResolver: NameResolver;
  private changePlan: ChangePlan | null = null;
  private showingChangePlan = false;

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

    contentEl.createEl("h2", { text: t("pathCheck.title") });
    contentEl.createEl("p", {
      text: t("pathCheck.checking"),
      cls: "attachmenter-check-status",
    });

    // Run validation
    void this.runValidation().catch((error) => {
      console.error("Error running validation:", error);
      new Notice(t("notices.validationFailed"));
    });
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
      new Notice(t("notices.validationFailed"));
    } finally {
      this.isRunning = false;
    }
  }

  private renderResults() {
    const { contentEl } = this;
    if (!this.validationResult) return;

    // If showing change plan, render that instead
    if (this.showingChangePlan && this.changePlan) {
      this.renderChangePlan();
      return;
    }

    // Clear content before rendering (important when returning from change plan view)
    contentEl.empty();

    // Add title
    contentEl.createEl("h2", { text: t("pathCheck.title") });

    // Render detailed statistics
    this.renderStatistics();

    if (this.validationResult.issues.length === 0) {
      contentEl.createEl("p", {
        text: t("pathCheck.allValid"),
        cls: "attachmenter-success-message",
      });
      return;
    }

    // Issues list
    const issuesContainer = contentEl.createDiv({
      cls: "attachmenter-issues-container",
    });
    issuesContainer.createEl("h3", { text: t("pathCheck.issuesFound") });

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
        t("pathCheck.missingFoldersTitle"),
        missingIssues,
        "missing"
      );
    }

    if (mismatchIssues.length > 0) {
      this.renderIssueSection(
        issuesContainer,
        t("pathCheck.nameMismatchesTitle"),
        mismatchIssues,
        "name_mismatch"
      );
    }

    if (invalidCharIssues.length > 0) {
      this.renderIssueSection(
        issuesContainer,
        t("pathCheck.invalidCharsTitle"),
        invalidCharIssues,
        "invalid_chars"
      );
    }

    // Fix buttons
    if (
      missingIssues.length > 0 ||
      mismatchIssues.length > 0 ||
      invalidCharIssues.length > 0
    ) {
      const buttonContainer = contentEl.createDiv({
        cls: "attachmenter-fix-buttons",
      });

      // Preview changes button (dry-run)
      const previewButton = buttonContainer.createEl("button", {
        text: t("pathCheck.previewChanges"),
        cls: "mod-cta",
      });
      previewButton.onclick = async () => {
        await this.generateAndShowChangePlan();
      };

      // Execute fixes button (direct execution)
      const executeButton = buttonContainer.createEl("button", {
        text: t("pathCheck.executeChanges"),
      });
      executeButton.onclick = async () => {
        await this.fixAllIssues();
      };
    }
  }

  private renderStatistics() {
    const { contentEl } = this;
    if (!this.validationResult?.statistics) return;

    const stats = this.validationResult.statistics;

    // Statistics container
    const statsContainer = contentEl.createDiv({
      cls: "attachmenter-statistics-container",
    });

    statsContainer.createEl("h3", { text: t("pathCheck.statistics.title") });

    // Statistics grid
    const statsGrid = statsContainer.createDiv({
      cls: "attachmenter-statistics-grid",
    });

    // Files statistics card
    this.renderStatCard(
      statsGrid,
      t("pathCheck.statistics.files.title"),
      stats.files.total.toString(),
      [
        {
          label: t("pathCheck.statistics.files.withImageLinks"),
          value: stats.files.withImageLinks.toString(),
          status: "normal" as const,
        },
        {
          label: t("pathCheck.statistics.files.withoutImageLinks"),
          value: stats.files.withoutImageLinks.toString(),
          status: "normal" as const,
        },
        {
          label: t("pathCheck.statistics.files.withAttachments"),
          value: stats.files.withAttachments.toString(),
          status: "success" as const,
        },
        {
          label: t("pathCheck.statistics.files.withoutAttachments"),
          value: stats.files.withoutAttachments.toString(),
          status: stats.files.withoutAttachments > 0 ? "warning" : "normal",
        },
      ]
    );

    // Image links statistics card
    this.renderStatCard(
      statsGrid,
      t("pathCheck.statistics.imageLinks.title"),
      stats.imageLinks.total.toString(),
      [
        {
          label: t("pathCheck.statistics.imageLinks.resolved"),
          value: stats.imageLinks.resolved.toString(),
          status: "success" as const,
        },
        {
          label: t("pathCheck.statistics.imageLinks.unresolved"),
          value: stats.imageLinks.unresolved.toString(),
          status: stats.imageLinks.unresolved > 0 ? "warning" : "normal",
        },
        {
          label: t("pathCheck.statistics.imageLinks.markdown"),
          value: stats.imageLinks.markdown.toString(),
          status: "normal" as const,
        },
        {
          label: t("pathCheck.statistics.imageLinks.wiki"),
          value: stats.imageLinks.wiki.toString(),
          status: "normal" as const,
        },
      ]
    );

    // Attachment folders statistics card
    this.renderStatCard(
      statsGrid,
      t("pathCheck.statistics.attachmentFolders.title"),
      stats.attachmentFolders.totalExpected.toString(),
      [
        {
          label: t("pathCheck.statistics.attachmentFolders.existing"),
          value: stats.attachmentFolders.existing.toString(),
          status: "success" as const,
        },
        {
          label: t("pathCheck.statistics.attachmentFolders.missing"),
          value: stats.attachmentFolders.missing.toString(),
          status: stats.attachmentFolders.missing > 0 ? "error" : "normal",
        },
        {
          label: t("pathCheck.statistics.attachmentFolders.correctlyNamed"),
          value: stats.attachmentFolders.correctlyNamed.toString(),
          status: "success" as const,
        },
        {
          label: t("pathCheck.statistics.attachmentFolders.incorrectlyNamed"),
          value: stats.attachmentFolders.incorrectlyNamed.toString(),
          status: stats.attachmentFolders.incorrectlyNamed > 0 ? "warning" : "normal",
        },
      ]
    );

    // Issues statistics card
    this.renderStatCard(
      statsGrid,
      t("pathCheck.statistics.issues.title"),
      stats.issues.total.toString(),
      [
        {
          label: t("pathCheck.statistics.issues.missing"),
          value: stats.issues.missing.toString(),
          status: stats.issues.missing > 0 ? "error" : "normal",
        },
        {
          label: t("pathCheck.statistics.issues.nameMismatch"),
          value: stats.issues.nameMismatch.toString(),
          status: stats.issues.nameMismatch > 0 ? "warning" : "normal",
        },
        {
          label: t("pathCheck.statistics.issues.invalidChars"),
          value: stats.issues.invalidChars.toString(),
          status: stats.issues.invalidChars > 0 ? "warning" : "normal",
        },
      ],
      stats.issues.total === 0 ? "success" : "error"
    );
  }

  private renderStatCard(
    container: HTMLElement,
    title: string,
    mainValue: string,
    breakdown: Array<{ label: string; value: string; status: "normal" | "success" | "warning" | "error" }>,
    overallStatus: "normal" | "success" | "warning" | "error" = "normal"
  ) {
    const card = container.createDiv({
      cls: `attachmenter-stat-card attachmenter-stat-card-${overallStatus}`,
    });

    const cardHeader = card.createDiv({ cls: "attachmenter-stat-card-header" });
    cardHeader.createEl("h4", { text: title, cls: "attachmenter-stat-card-title" });
    cardHeader.createDiv({
      cls: "attachmenter-stat-value",
      text: mainValue,
    });

    const breakdownList = card.createDiv({ cls: "attachmenter-stat-breakdown" });
    breakdown.forEach((item) => {
      const breakdownItem = breakdownList.createDiv({
        cls: `attachmenter-stat-breakdown-item attachmenter-stat-breakdown-item-${item.status}`,
      });
      breakdownItem.createSpan({
        cls: "attachmenter-stat-breakdown-label",
        text: item.label,
      });
      breakdownItem.createSpan({
        cls: "attachmenter-stat-breakdown-value",
        text: item.value,
      });
    });
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
          text: t("pathCheck.expected", { path: issue.expectedFolderPath }),
        });
      } else if (issueType === "name_mismatch") {
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: t("pathCheck.expected", { path: issue.expectedFolderPath }),
        });
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: t("pathCheck.actual", { path: issue.actualFolderPath || t("pathCheck.nA") }),
        });
      } else if (issueType === "invalid_chars") {
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: t("pathCheck.invalidCharacters", { chars: issue.invalidChars?.join(", ") || t("pathCheck.nA") }),
        });
        issueItem.createEl("div", {
          cls: "attachmenter-issue-detail",
          text: t("pathCheck.noteName", { name: issue.file.basename }),
        });
      }
    });

    if (issues.length > 10) {
      issuesList.createEl("p", {
        text: t("pathCheck.moreIssues", { count: issues.length - 10 }),
        cls: "attachmenter-more-issues",
      });
    }
  }

  /**
   * Prompt user to rename an image file.
   * @param imageFile - The image file to rename
   * @param defaultBaseName - Default base name (without extension)
   * @returns The new base name (or the string "keep" to use original name), or null if user cancelled/deleted
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
        (newName: string) => {
          resolve(newName);
          return Promise.resolve();
        }
      );
      // Resolve with original name if modal closed without confirm
      const originalOnClose = modal.onClose.bind(modal);
      modal.onClose = () => {
        resolve("keep");
        originalOnClose();
      };
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
          const result = await this.promptForImageName(
            imageFile,
            defaultBaseName
          );
          if (result === null) {
            // User deleted or cancelled, skip this image
            continue;
          } else if (result === "keep") {
            // User chose to keep original name
            finalBaseName = imageFile.basename;
          } else {
            // User provided a new name
            finalBaseName = result;
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
              const result = await this.promptForImageName(
                imageFile,
                defaultBaseName
              );
              if (result === null) {
                // User deleted or cancelled, skip this image
                continue;
              } else if (result === "keep") {
                // User chose to keep original name
                finalBaseName = imageFile.basename;
              } else {
                // User provided a new name
                finalBaseName = result;
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
      t("notices.fixedIssues", {
        fixed,
        failed: failed > 0 ? t("notices.fixedIssuesFailed", { failed }) : ""
      })
    );

    // Re-run validation to update results
    await this.runValidation();
  }

  /**
   * Generate a change plan without executing any changes (dry-run).
   */
  private async generateAndShowChangePlan() {
    if (!this.validationResult) return;

    this.changePlan = {
      folderCreations: [],
      folderRenames: [],
      imageMoves: [],
      linkUpdates: [],
    };

    const { issues } = this.validationResult;

    for (const issue of issues) {
      try {
        if (issue.issue === "missing") {
          // Plan to create missing folder
          this.changePlan.folderCreations.push({
            path: issue.expectedFolderPath,
            noteFile: issue.file,
          });

          // Plan to move images if there are any
          if (issue.imageLinks && issue.imageLinks.length > 0) {
            await this.generateImageMovePlan(
              issue.file,
              issue.imageLinks,
              issue.expectedFolderPath
            );
          }
        } else if (issue.issue === "name_mismatch" && issue.actualFolderPath) {
          // Plan to rename folder
          this.changePlan.folderRenames.push({
            from: issue.actualFolderPath,
            to: issue.expectedFolderPath,
            noteFile: issue.file,
          });

          // Plan to move images if there are any
          if (issue.imageLinks && issue.imageLinks.length > 0) {
            await this.generateImageMovePlan(
              issue.file,
              issue.imageLinks,
              issue.expectedFolderPath
            );
          }
        }
        // Note: invalid_chars issues don't need fixing - they're informational
      } catch (error) {
        console.error(`Failed to generate plan for ${issue.file.path}:`, error);
      }
    }

    this.showingChangePlan = true;
    this.renderResults();
  }

  /**
   * Generate image move plan without executing (dry-run).
   * This simulates copyImagesToFolder but doesn't actually move files.
   */
  private async generateImageMovePlan(
    file: TFile,
    imageLinks: ImageLink[],
    targetFolder: string
  ): Promise<void> {
    let content: string;
    try {
      content = await this.vault.read(file);
    } catch (error) {
      console.warn(`Failed to read file: ${file.path}`, error);
      return;
    }

    if (file.extension === "md") {
      // Process markdown file
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
          // Image is already in the correct location
          continue;
        }

        // Generate default name using NameResolver
        const defaultBaseName = this.nameResolver.buildBaseName(file, moment());

        // For dry-run, we use default name (can't prompt user)
        // In actual execution, this would prompt if settings.promptRenameImage is true
        const finalBaseName = defaultBaseName;

        // Generate new path in target folder
        const ext = imageFile.extension;
        let newImagePath = `${targetFolder}/${finalBaseName}.${ext}`;

        // Handle filename conflicts (simulate)
        let counter = 1;
        while (this.vault.getAbstractFileByPath(newImagePath)) {
          newImagePath = `${targetFolder}/${finalBaseName}_${counter}.${ext}`;
          counter++;
        }

        // Add to image moves plan
        this.changePlan!.imageMoves.push({
          imageFile,
          fromPath: imageFile.path,
          toPath: newImagePath,
          noteFile: file,
          oldLinkMatch: imageLink.match,
          altText: imageLink.altText,
          linkType: imageLink.type,
        });

        // Calculate new link
        // Simulate what generateMarkdownLink would return
        const relativePath = this.calculateRelativePath(file.path, newImagePath);
        let newLink: string;
        if (imageLink.type === "markdown") {
          const altPart = imageLink.altText ? `![${imageLink.altText}]` : "!";
          newLink = `${altPart}(${relativePath})`;
        } else if (imageLink.type === "wiki") {
          const altPart = imageLink.altText
            ? `|${imageLink.altText}`
            : "";
          // Extract basename from newImagePath
          const basename = newImagePath.substring(
            newImagePath.lastIndexOf("/") + 1
          );
          const nameWithoutExt = basename.substring(
            0,
            basename.lastIndexOf(".")
          );
          newLink = `![[${nameWithoutExt}${altPart}]]`;
        } else {
          continue;
        }

        // Add to link updates plan
        this.changePlan!.linkUpdates.push({
          noteFile: file,
          oldLink: imageLink.match,
          newLink,
          linkType: imageLink.type,
        });
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

            // For dry-run, use default name
            const finalBaseName = defaultBaseName;

            // Generate new path in target folder
            const ext = imageFile.extension;
            let newImagePath = `${targetFolder}/${finalBaseName}.${ext}`;

            // Handle filename conflicts (simulate)
            let counter = 1;
            while (this.vault.getAbstractFileByPath(newImagePath)) {
              newImagePath = `${targetFolder}/${finalBaseName}_${counter}.${ext}`;
              counter++;
            }

            // Add to image moves plan
            this.changePlan!.imageMoves.push({
              imageFile,
              fromPath: imageFile.path,
              toPath: newImagePath,
              noteFile: file,
              oldLinkMatch: imageLink.match,
              altText: imageLink.altText,
              linkType: "markdown", // Canvas uses markdown-like format
            });

            // For canvas, the link update is just the basename
            const basename = newImagePath.substring(
              newImagePath.lastIndexOf("/") + 1
            );
            const nameWithoutExt = basename.substring(
              0,
              basename.lastIndexOf(".")
            );

            // Add to link updates plan
            this.changePlan!.linkUpdates.push({
              noteFile: file,
              oldLink: imageLink.match,
              newLink: nameWithoutExt,
              linkType: "markdown", // Canvas uses markdown-like format
            });
          }
        }
      } catch (error) {
        console.error(`Failed to parse canvas file: ${file.path}`, error);
      }
    }
  }

  /**
   * Calculate relative path from note file to image file.
   */
  private calculateRelativePath(notePath: string, imagePath: string): string {
    const noteDir = notePath.substring(0, notePath.lastIndexOf("/"));
    const imageDir = imagePath.substring(0, imagePath.lastIndexOf("/"));
    const imageName = imagePath.substring(imagePath.lastIndexOf("/") + 1);

    if (noteDir === imageDir) {
      return imageName;
    }

    // Simple relative path calculation
    const noteParts = noteDir.split("/").filter((p) => p);
    const imageParts = imageDir.split("/").filter((p) => p);

    // Find common prefix
    let commonLength = 0;
    while (
      commonLength < noteParts.length &&
      commonLength < imageParts.length &&
      noteParts[commonLength] === imageParts[commonLength]
    ) {
      commonLength++;
    }

    // Calculate relative path
    const upLevels = noteParts.length - commonLength;
    const downParts = imageParts.slice(commonLength);
    const relativeParts = [
      ...Array(upLevels).fill(".."),
      ...downParts,
      imageName,
    ];

    return relativeParts.join("/");
  }

  /**
   * Render the change plan view.
   */
  private renderChangePlan() {
    const { contentEl } = this;
    if (!this.changePlan) return;

    contentEl.empty();

    contentEl.createEl("h2", { text: t("pathCheck.changePlan") });

    // Back button
    const backButton = contentEl.createEl("button", {
      text: t("common.cancel"),
    });
    backButton.onclick = () => {
      this.showingChangePlan = false;
      this.renderResults();
    };

    // Check if there are any changes
    const hasChanges =
      this.changePlan.folderCreations.length > 0 ||
      this.changePlan.folderRenames.length > 0 ||
      this.changePlan.imageMoves.length > 0 ||
      this.changePlan.linkUpdates.length > 0;

    if (!hasChanges) {
      contentEl.createEl("p", {
        text: t("pathCheck.noChanges"),
        cls: "attachmenter-success-message",
      });
      return;
    }

    // Folder creations
    if (this.changePlan.folderCreations.length > 0) {
      const section = contentEl.createDiv({
        cls: "attachmenter-change-plan-section",
      });
      section.createEl("h3", {
        text: `${t("pathCheck.folderCreations")} (${this.changePlan.folderCreations.length})`,
      });
      const list = section.createDiv({ cls: "attachmenter-change-plan-list" });
      this.changePlan.folderCreations.forEach((item) => {
        const itemEl = list.createDiv({
          cls: "attachmenter-change-plan-item",
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-file",
          text: t("pathCheck.inFile", { path: item.noteFile.path }),
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-detail",
          text: t("pathCheck.toPath", { path: item.path }),
        });
      });
    }

    // Folder renames
    if (this.changePlan.folderRenames.length > 0) {
      const section = contentEl.createDiv({
        cls: "attachmenter-change-plan-section",
      });
      section.createEl("h3", {
        text: `${t("pathCheck.folderRenames")} (${this.changePlan.folderRenames.length})`,
      });
      const list = section.createDiv({ cls: "attachmenter-change-plan-list" });
      this.changePlan.folderRenames.forEach((item) => {
        const itemEl = list.createDiv({
          cls: "attachmenter-change-plan-item",
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-file",
          text: t("pathCheck.inFile", { path: item.noteFile.path }),
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-detail",
          text: t("pathCheck.fromPath", { path: item.from }),
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-detail",
          text: t("pathCheck.toPath", { path: item.to }),
        });
      });
    }

    // Image moves
    if (this.changePlan.imageMoves.length > 0) {
      const section = contentEl.createDiv({
        cls: "attachmenter-change-plan-section",
      });
      section.createEl("h3", {
        text: `${t("pathCheck.imageMoves")} (${this.changePlan.imageMoves.length})`,
      });
      const list = section.createDiv({ cls: "attachmenter-change-plan-list" });
      this.changePlan.imageMoves.forEach((item) => {
        const itemEl = list.createDiv({
          cls: "attachmenter-change-plan-item",
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-file",
          text: t("pathCheck.inFile", { path: item.noteFile.path }),
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-detail",
          text: t("pathCheck.fromPath", { path: item.fromPath }),
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-detail",
          text: t("pathCheck.toPath", { path: item.toPath }),
        });
      });
    }

    // Link updates
    if (this.changePlan.linkUpdates.length > 0) {
      const section = contentEl.createDiv({
        cls: "attachmenter-change-plan-section",
      });
      section.createEl("h3", {
        text: `${t("pathCheck.linkUpdates")} (${this.changePlan.linkUpdates.length})`,
      });
      const list = section.createDiv({ cls: "attachmenter-change-plan-list" });
      this.changePlan.linkUpdates.forEach((item) => {
        const itemEl = list.createDiv({
          cls: "attachmenter-change-plan-item",
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-file",
          text: t("pathCheck.inFile", { path: item.noteFile.path }),
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-detail",
          text: t("pathCheck.oldLink", { link: item.oldLink }),
        });
        itemEl.createEl("div", {
          cls: "attachmenter-change-plan-detail",
          text: t("pathCheck.newLink", { link: item.newLink }),
        });
      });
    }

    // Execute button
    const buttonContainer = contentEl.createDiv({
      cls: "attachmenter-fix-buttons",
    });
    const executeButton = buttonContainer.createEl("button", {
      text: t("pathCheck.confirmExecute"),
      cls: "mod-cta",
    });
    executeButton.onclick = async () => {
      await this.executeChangePlan();
    };
  }

  /**
   * Execute the change plan (actual execution).
   */
  private async executeChangePlan() {
    if (!this.changePlan) return;

    let fixed = 0;
    let failed = 0;

    try {
      // Create folders
      for (const item of this.changePlan.folderCreations) {
        try {
          await this.vault.createFolder(item.path);
          fixed++;
        } catch (error) {
          console.error(`Failed to create folder: ${item.path}`, error);
          failed++;
        }
      }

      // Rename folders
      for (const item of this.changePlan.folderRenames) {
        try {
          const folder = this.vault.getAbstractFileByPath(item.from);
          if (folder instanceof TFolder) {
            await this.fileManager.renameFile(folder, item.to);
            fixed++;
          }
        } catch (error) {
          console.error(
            `Failed to rename folder: ${item.from} -> ${item.to}`,
            error
          );
          failed++;
        }
      }

      // Move images and update links
      // Group by note file to process efficiently
      const imageMovesByFile = new Map<TFile, typeof this.changePlan.imageMoves>();
      for (const move of this.changePlan.imageMoves) {
        if (!imageMovesByFile.has(move.noteFile)) {
          imageMovesByFile.set(move.noteFile, []);
        }
        imageMovesByFile.get(move.noteFile)!.push(move);
      }

      for (const [noteFile, moves] of imageMovesByFile.entries()) {
        try {
          let content = await this.vault.read(noteFile);
          let contentModified = false;

          // Move all images for this file and update links
          for (const move of moves) {
            try {
              // Move the image file
              await this.fileManager.renameFile(
                move.imageFile,
                move.toPath
              );

              // Get the moved file to generate correct link
              const movedFile = this.vault.getAbstractFileByPath(move.toPath);
              if (!(movedFile instanceof TFile)) {
                console.warn(`Moved file not found: ${move.toPath}`);
                continue;
              }

              // Update the link in content
              if (noteFile.extension === "md") {
                // For markdown files, generate new link
                let newLink: string;
                if (move.linkType === "markdown") {
                  newLink = this.fileManager.generateMarkdownLink(
                    movedFile,
                    noteFile.path,
                    undefined,
                    move.altText
                  );
                  // Ensure it's an image link
                  if (!newLink.startsWith("!")) {
                    newLink = `!${newLink}`;
                  }
                } else if (move.linkType === "wiki") {
                  // For wiki links, use basename
                  const altPart = move.altText ? `|${move.altText}` : "";
                  newLink = `![[${movedFile.basename}${altPart}]]`;
                } else {
                  continue;
                }
                content = content.replace(move.oldLinkMatch, newLink);
                contentModified = true;
              } else if (noteFile.extension === "canvas") {
                // For canvas files, update the JSON node
                try {
                  const data = JSON.parse(content);
                  if (Array.isArray(data.nodes)) {
                    // Find and update the node
                    for (const node of data.nodes) {
                      if (
                        (node.type === "file" && node.file === move.imageFile.basename) ||
                        (node.type === "link" && node.url === move.imageFile.basename)
                      ) {
                        node.type = "file";
                        node.file = movedFile.basename;
                        contentModified = true;
                        break;
                      }
                    }
                    if (contentModified) {
                      content = JSON.stringify(data, null, "\t");
                    }
                  }
                } catch (error) {
                  console.error(`Failed to parse canvas file: ${noteFile.path}`, error);
                }
              }
            } catch (error) {
              console.error(
                `Failed to move image: ${move.fromPath} -> ${move.toPath}`,
                error
              );
              failed++;
              continue;
            }
          }

          // Save updated content
          if (contentModified) {
            await this.vault.modify(noteFile, content);
          }

          fixed++;
        } catch (error) {
          console.error(`Failed to process file: ${noteFile.path}`, error);
          failed++;
        }
      }
    } catch (error) {
      console.error("Error executing change plan:", error);
      new Notice(t("notices.validationFailed"));
      return;
    }

    new Notice(
      t("notices.fixedIssues", {
        fixed,
        failed: failed > 0 ? t("notices.fixedIssuesFailed", { failed }) : "",
      })
    );

    // Reset and re-run validation
    this.showingChangePlan = false;
    this.changePlan = null;
    await this.runValidation();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.showingChangePlan = false;
    this.changePlan = null;
  }
}
