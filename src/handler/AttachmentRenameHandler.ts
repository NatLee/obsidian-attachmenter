import { FileManager, MetadataCache, TFile, Vault, normalizePath } from "obsidian";
import { PathSanitizer } from "../lib/pathSanitizer";

export class AttachmentRenameHandler {
  constructor(
    private vault: Vault,
    private fileManager: FileManager,
    private metadataCache: MetadataCache
  ) { }

  async renameAttachment(
    attachmentFile: TFile,
    newBaseName: string,
    noteFile: TFile | null
  ): Promise<void> {
    // Sanitize the new name
    const sanitizedName = PathSanitizer.sanitizeFileName(newBaseName);
    const extension = attachmentFile.extension;
    const newFileName = `${sanitizedName}.${extension}`;

    // Get the directory of the attachment
    const dir = attachmentFile.parent?.path || "";
    const newPath = normalizePath(dir ? `${dir}/${newFileName}` : newFileName);

    // Check if file already exists
    if (this.vault.getAbstractFileByPath(newPath)) {
      throw new Error(`File ${newPath} already exists`);
    }

    // Store old file path for reference
    const oldFilePath = attachmentFile.path;

    // Rename the file
    await this.fileManager.renameFile(attachmentFile, newPath);

    // Get the new file
    const newFile = this.vault.getAbstractFileByPath(newPath);
    if (!(newFile instanceof TFile)) {
      throw new Error("Failed to get renamed file");
    }

    // Find and update all files that reference this attachment
    await this.updateAllReferences(oldFilePath, newFile);
  }

  private async updateAllReferences(
    oldFilePath: string,
    newFile: TFile
  ): Promise<void> {
    // Get all markdown and canvas files
    const allFiles = this.vault.getFiles().filter(
      f => f.extension === "md" || f.extension === "canvas"
    );

    for (const file of allFiles) {
      // Get file content
      const content = await this.vault.read(file);
      let newContent = content;
      let hasMatch = false;

      // For markdown files
      if (file.extension === "md") {
        // Get the new link text for this file
        const newLink = this.fileManager.generateMarkdownLink(newFile, file.path);

        // Try to find and replace markdown image links
        const markdownRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;
        const replacements: Array<{ old: string; new: string }> = [];

        // Collect all matches
        while ((match = markdownRegex.exec(content)) !== null) {
          const linkPath = match[2].trim();
          const resolvedPath = this.resolveLinkPath(linkPath, file.path);

          if (resolvedPath === oldFilePath) {
            const altText = match[1] || "";
            // Extract path from newLink (format: ![name](path))
            const pathMatch = newLink.match(/\]\(([^)]+)\)/);
            const newPath = pathMatch ? pathMatch[1] : newFile.path;
            replacements.push({
              old: match[0],
              new: `![${altText}](${newPath})`
            });
          }
        }

        // Apply replacements (in reverse order to preserve indices)
        for (let i = replacements.length - 1; i >= 0; i--) {
          const { old, new: newLinkText } = replacements[i];
          if (newContent.includes(old)) {
            hasMatch = true;
            newContent = newContent.replace(old, newLinkText);
          }
        }

        // Also handle wiki links: [[path]]
        const wikiRegex = /\[\[([^\]]+)\]\]/g;
        const wikiReplacements: Array<{ old: string; new: string }> = [];

        while ((match = wikiRegex.exec(content)) !== null) {
          const linkPath = match[1].trim();
          const resolvedPath = this.resolveLinkPath(linkPath, file.path);

          if (resolvedPath === oldFilePath) {
            // Generate new wiki link path
            const pathMatch = newLink.match(/\]\(([^)]+)\)/);
            const newPath = pathMatch ? pathMatch[1] : newFile.basename;
            wikiReplacements.push({ old: match[0], new: `[[${newPath}]]` });
          }
        }

        // Apply wiki link replacements
        for (let i = wikiReplacements.length - 1; i >= 0; i--) {
          const { old, new: newLinkText } = wikiReplacements[i];
          if (newContent.includes(old)) {
            hasMatch = true;
            newContent = newContent.replace(old, newLinkText);
          }
        }
      } else if (file.extension === "canvas") {
        // For canvas files, we need to parse JSON and update file paths
        try {
          const canvasData = JSON.parse(content);
          if (canvasData.nodes) {
            let canvasModified = false;
            canvasData.nodes.forEach((node: { type: string; file?: string }) => {
              if (node.type === "file" && node.file === oldFilePath) {
                node.file = newFile.path;
                canvasModified = true;
                hasMatch = true;
              }
            });
            if (canvasModified) {
              newContent = JSON.stringify(canvasData, null, 2);
            }
          }
        } catch (error) {
          console.warn(`Failed to parse canvas file: ${file.path}`, error);
        }
      }

      if (hasMatch) {
        // Write updated content
        await this.vault.modify(file, newContent);
      }
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private resolveLinkPath(linkPath: string, fromFile: string): string {
    // Remove query strings and anchors
    const cleanPath = linkPath.split('?')[0].split('#')[0];

    // If it's already an absolute path, return it
    if (this.vault.getAbstractFileByPath(cleanPath)) {
      return cleanPath;
    }

    // Resolve relative path
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/')) || '';
    const resolved = normalizePath(fromDir ? `${fromDir}/${cleanPath}` : cleanPath);

    // Try to get the file
    const file = this.vault.getAbstractFileByPath(resolved);
    if (file instanceof TFile) {
      return file.path;
    }

    // Try with ./ prefix
    const altPath = normalizePath(`./${cleanPath}`);
    const altFile = this.vault.getAbstractFileByPath(altPath);
    if (altFile instanceof TFile) {
      return altFile.path;
    }

    return cleanPath;
  }
}
