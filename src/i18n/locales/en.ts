import { TranslationMap } from "../index";

export const en: TranslationMap = {
  // 通用
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    keep: "Keep",
    close: "Close",
    file: "File",
    path: "Path",
    restoreDefault: "Restore default",
  },

  // 设置页面
  settings: {
    title: "Attachmenter settings",
    group: {
      general: "General settings",
      management: "Management rules",
      appearance: "Interface integration",
      view: "Attachment tree view",
      tools: "Tools & maintenance"
    },
    language: {
      name: "Language",
      desc: "Select the interface language"
    },
    folderSuffix: {
      name: "Folder suffix",
      desc: "Suffix for the per-note attachment folder, e.g. `_Attachments`."
    },
    attachmentNameFormat: {
      name: "Attachment name format",
      desc: "Use {notename} and {date}, e.g. `{notename}-{date}`."
    },
    dateFormat: {
      name: "Date format",
      desc: "Moment.js date format used for {date}."
    },
    showRemoteHint: {
      name: "Show hint for remote images",
      desc: "Show the expand icon for attachments even if the note only has remote images with http links.",
    },
    folderDisplay: {
      name: "Folder display",
    },
    // Feature: Highlight expanded file
    highlight: {
      name: "Highlight expanded file",
      enable: "Enable highlight",
      enableDesc: "Add a left border accent to the note's file title when its attachment tree is expanded.",
      borderColor: "Border color",
      borderColorDesc: "CSS color value for the left border accent. Defaults to your theme's accent color.",
    },
    hideFolder: {
      name: "Hide attachment folders",
      desc: "Hide attachment folders in the file explorer. You can toggle this from the ribbon icon."
    },
    aeroFolder: {
      name: "Aero folder style",
      desc: "Apply aero (semi-transparent) style to attachment folders."
    },
    showStatusBar: {
      name: "Show status bar indicator",
      desc: "Show status bar indicator when attachment folders are hidden."
    },
    showRibbonIcon: {
      name: "Show ribbon icon",
      desc: "Show ribbon icon in the left sidebar to toggle attachment folder visibility."
    },
    showAttachmentManagerButton: {
      name: "Show attachment manager button",
      desc: "Show attachment manager button in the file explorer."
    },
    showFileAttachmentTree: {
      name: "Show file attachment tree",
      desc: "Show expandable attachment tree for each file in the file explorer."
    },
    autoRenameFolder: {
      name: "Auto rename folder",
    },
    autoRenameAttachmentFolder: {
      name: "Auto rename attachment folder",
      desc: "Automatically rename the attachment folder when the note is renamed."
    },
    pathValidation: {
      name: "Path validation",
    },
    promptRenameImage: {
      name: "Prompt to rename images",
      desc: "When moving images during path check, prompt user to rename each image. If disabled, use default naming format."
    },
    checkPaths: {
      name: "Check attachment folder paths",
      desc: "Validate all attachment folder paths and check for issues (invalid characters, missing folders, name mismatches).",
      button: "Check path"
    },
    renameConfirmation: {
      name: "Rename confirmation behavior",
      desc: "Choose whether to ask for confirmation before renaming attachments.",
      ask: "Ask each time",
      alwaysRename: "Always rename directly"
    },
    cleanup: {
      name: "Clean empty attachment folders",
      desc: "Find and delete empty attachment folders that match the suffix configuration.",
      button: "Check for empty folders",
      modalTitle: "Empty attachment folders",
      noEmptyFolders: "No empty attachment folders found.",
      foundFolders: "Found {count} empty attachment folders:",
      deleteAll: "Delete all",
      deleteSuccess: "Deleted {count} empty folder(s).",
      deleteFailed: "Failed to delete folders."
    }
  },

  // 命令
  commands: {
    downloadRemoteImagesActive: "Download remote images in active file",
    openAttachmentFolderManager: "Open attachment folder manager"
  },

  // 菜单
  menu: {
    downloadRemoteImages: "Download remote images"
  },

  // 通知消息
  notices: {
    noActiveFile: "No active file found",
    replacedCount: "Replaced {count} remote image(s)",
    noRemoteImages: "No remote images found to download",
    replacedCountInFile: "Replaced {count} remote image(s) in {filename}",
    noRemoteImagesInFile: "No remote images found in {filename}",
    pathUpdated: "Path updated successfully",
    pathUpdateFailed: "Failed to change path",
    imageDeleteFailed: "Failed to delete image",
    validationFailed: "Failed to validate paths",
    fixedIssues: "Fixed {fixed} issue(s){failed}",
    fixedIssuesFailed: ", {failed} failed"
  },

  // 路径检查模态框
  pathCheck: {
    title: "Path validation",
    checking: "Checking attachment folder paths for all notes...",
    summary: "Summary",
    totalFilesChecked: "Total files checked: {count}",
    missingFolders: "Missing folders: {count}",
    nameMismatches: "Name mismatches: {count}",
    invalidChars: "Files with invalid characters: {count}",
    allValid: "All paths are valid.",
    issuesFound: "Issues found",
    missingFoldersTitle: "Missing folders",
    nameMismatchesTitle: "Name mismatches",
    invalidCharsTitle: "Invalid characters",
    misplacedTitle: "Misplaced attachments",
    expected: "Expected: {path}",
    actual: "Actual: {path}",
    nA: "N/a",
    invalidCharacters: "Invalid characters: {chars}",
    noteName: "Note name: {name}",
    moreIssues: "... and {count} more issues",
    fixAll: "Fix all issues",
    previewChanges: "Preview changes",
    executeChanges: "Execute fixes",
    changePlan: "Change plan",
    folderCreations: "Folders to be created",
    folderRenames: "Folders to be renamed",
    imageMoves: "Images to be moved",
    linkUpdates: "Links to be updated",
    fromPath: "From: {path}",
    toPath: "To: {path}",
    inFile: "File: {path}",
    oldLink: "Old link: {link}",
    newLink: "New link: {link}",
    confirmExecute: "Confirm and execute",
    noChanges: "No changes to execute",
    statistics: {
      title: "Statistics",
      files: {
        title: "Files",
        withImageLinks: "With image links",
        withoutImageLinks: "Without image links",
        withAttachments: "With attachments",
        withoutAttachments: "Without attachments"
      },
      imageLinks: {
        title: "Image links",
        resolved: "Resolved",
        unresolved: "Unresolved",
        markdown: "Markdown",
        wiki: "Wiki"
      },
      attachmentFolders: {
        title: "Attachment folders",
        existing: "Existing",
        missing: "Missing",
        correctlyNamed: "Correctly named",
        incorrectlyNamed: "Incorrectly named"
      },
      issues: {
        title: "Issues",
        missing: "Missing",
        nameMismatch: "Name mismatch",
        invalidChars: "Invalid characters",
        misplaced: "Misplaced"
      }
    }
  },

  // 粘贴图片管理模态框
  pasteImage: {
    manageTitle: "Manage pasted image",
    changeLocation: "Change the save location for this image:",
    currentPath: "Current path",
    newPath: "New path",
    newPathDesc: "Enter the new path for this image",
    suggestedPaths: "Suggested paths:",
    use: "Use",
    applyPathChange: "Apply path change",

    deleteConfirm: "Are you sure you want to delete this image?",
    deleteConfirmDesc: "This action cannot be undone.",
    confirmDelete: "Confirm delete",
    delete: "Delete",
    pastedTitle: "Image pasted",
    keepImage: "Keep image",
    previewAlt: "Pasted image preview"
  },

  // 重命名图片模态框
  renameImage: {
    title: "Rename image",
    renameDesc: "Rename image: {filename}",
    newName: "New name",
    newNameDesc: "Enter the new name for the image (without extension)"
  },

  // 附件资料夹管理视图
  attachmentFolderManager: {
    title: "Attachment folders",
    refresh: "Refresh",
    empty: "No attachment folders found",
    fileCount: "{count} file"
  },

  // 文件附件樹
  fileAttachmentTree: {
    noAttachments: "No attachments",
    emptyFolder: "Folder is empty",
    loadMore: "Load {{count}} more...",
    remoteImages: "Remote images",
    download: "Download",
    openInBrowser: "Open in browser",
    remoteLoadError: "Failed to load remote image"
  },

  // 附件管理器
  attachmentManager: {
    title: "Attachment manager",
    refresh: "Refresh",
    empty: "No attachments found",
    preview: "Preview",
    rename: "Rename",
    delete: "Delete",
    openNote: "Open note",
    previewNotAvailable: "Preview not available for this file type",
    deleteConfirm: "Delete attachment",
    deleteConfirmDesc: "Are you sure you want to delete \"{filename}\"? This action cannot be undone.",
    deleteSuccess: "Attachment deleted successfully",
    deleteFailed: "Failed to delete attachment",
    deleteFolderConfirm: "Delete attachment folder",
    deleteFolderConfirmDesc: "Are you sure you want to delete the folder \"{foldername}\" and all its {count} files? This action cannot be undone.",
    deleteFolderSuccess: "Attachment folder deleted successfully",
    openInSystemExplorer: "Open in system explorer"
  }
};
