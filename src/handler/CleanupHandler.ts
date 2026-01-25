import { App, TFolder, Notice } from "obsidian";
import type AttachmenterPlugin from "../../main";
import { CleanupResultModal } from "../ui/CleanupResultModal";
import { t } from "../i18n/index";

export class CleanupHandler {
    constructor(private app: App, private plugin: AttachmenterPlugin) { }

    public async checkEmptyFolders() {
        const folders = this.getEmptyAttachmentFolders();

        new CleanupResultModal(
            this.app,
            folders,
            async (foldersToDelete) => {
                let deletedCount = 0;
                for (const folder of foldersToDelete) {
                    try {
                        // double check it is still empty
                        if (folder.children.length === 0) {
                            await this.app.vault.delete(folder);
                            deletedCount++;
                        }
                    } catch (err) {
                        console.error(`Failed to delete ${folder.path}`, err);
                    }
                }
                new Notice(t("settings.cleanup.deleteSuccess").replace("{count}", deletedCount.toString()));
            }
        ).open();
    }

    private getEmptyAttachmentFolders(): TFolder[] {
        const suffix = this.plugin.settings.defaultFolderSuffix || "_attachments";
        const allFolders = this.getAllFolders(this.app.vault.getRoot());

        return allFolders.filter(folder => {
            // defined as: ends with suffix AND has no children
            // We probably also want to match case insensitive if needed, but usually suffix is consistent
            // Also check exclude patterns? For now simple suffix match
            if (!folder.name.endsWith(suffix)) return false;

            // Check emptiness
            return folder.children.length === 0;
        });
    }

    private getAllFolders(root: TFolder): TFolder[] {
        let folders: TFolder[] = [];
        for (const child of root.children) {
            if (child instanceof TFolder) {
                folders.push(child);
                folders = folders.concat(this.getAllFolders(child));
            }
        }
        return folders;
    }
}
