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
  },

  // 设置页面
  settings: {
    title: "Attachmenter settings",
    language: {
      name: "Language",
      desc: "Select the interface language"
    },
    simpleMode: {
      name: "Simple mode",
      desc: "Use per-note attachment folders with a simple naming pattern."
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
    folderDisplay: {
      name: "Folder display",
    },
    hideFolder: {
      name: "Hide attachment folders",
      desc: "Hide attachment folders in the file explorer. You can toggle this from the ribbon icon."
    },
    aeroFolder: {
      name: "Aero folder style",
      desc: "Apply AERO (semi-transparent) style to attachment folders."
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
      button: "Check Paths"
    }
  },

  // 命令
  commands: {
    downloadRemoteImagesActive: "Download remote images in active file"
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
    imageMoved: "Image moved successfully",
    imageMoveFailed: "Failed to move image",
    imageDeleteFailed: "Failed to delete image",
    validationFailed: "Failed to validate paths",
    fixedIssues: "Fixed {fixed} issue(s){failed}",
    fixedIssuesFailed: ", {failed} failed"
  },

  // 路径检查模态框
  pathCheck: {
    title: "Path Validation",
    checking: "Checking attachment folder paths for all notes...",
    summary: "Summary",
    totalFilesChecked: "Total files checked: {count}",
    missingFolders: "Missing folders: {count}",
    nameMismatches: "Name mismatches: {count}",
    invalidChars: "Files with invalid characters: {count}",
    allValid: "✓ All paths are valid!",
    issuesFound: "Issues Found",
    missingFoldersTitle: "Missing Folders",
    nameMismatchesTitle: "Name Mismatches",
    invalidCharsTitle: "Invalid Characters",
    expected: "Expected: {path}",
    actual: "Actual: {path}",
    nA: "N/A",
    invalidCharacters: "Invalid characters: {chars}",
    noteName: "Note name: {name}",
    moreIssues: "... and {count} more issues",
    fixAll: "Fix All Issues"
  },

  // 粘贴图片管理模态框
  pasteImage: {
    manageTitle: "Manage Pasted Image",
    changeLocation: "Change the save location for this image:",
    currentPath: "Current path",
    newPath: "New path",
    newPathDesc: "Enter the new path for this image",
    suggestedPaths: "Suggested paths:",
    use: "Use",
    applyPathChange: "Apply Path Change",
    availableActions: "Available actions for this image:",
    deleteImage: "Delete Image",
    deleteImageDesc: "Remove this image from your vault and the note",
    delete: "Delete",
    moveToFolder: "Move to Attachment Folder",
    moveToFolderDesc: "Move this image to the note's attachment folder",
    move: "Move",
    deleteConfirm: "⚠️ Are you sure you want to delete this image?",
    deleteConfirmDesc: "This action cannot be undone.",
    confirmDelete: "Confirm Delete",
    pastedTitle: "Image Pasted",
    keepImage: "Keep Image",
    previewAlt: "Pasted image preview"
  },

  // 重命名图片模态框
  renameImage: {
    title: "Rename Image",
    renameDesc: "Rename image: {filename}",
    newName: "New name",
    newNameDesc: "Enter the new name for the image (without extension)"
  }
};
