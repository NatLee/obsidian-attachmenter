import {
  App,
  FileManager,
  Modal,
  Notice,
  TFile,
  TFolder,
  Vault,
} from "obsidian";

import type { AttachmenterSettings } from "../model/Settings";
import {
  PathValidator,
  type ValidationIssue,
  type ValidationResult,
} from "../lib/PathValidator";

export class PathCheckModal extends Modal {
  private validationResult: ValidationResult | null = null;
  private isRunning = false;

  constructor(
    app: App,
    private vault: Vault,
    private fileManager: FileManager,
    private settings: AttachmenterSettings
  ) {
    super(app);
    this.modalEl.addClass("attachmenter-path-check-modal");
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
        this.settings
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
