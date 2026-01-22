import { TranslationMap } from "../index";

export const zhHant: TranslationMap = {
  // 通用
  common: {
    save: "保存",
    cancel: "取消",
    delete: "刪除",
    confirm: "確認",
    keep: "保留",
    close: "關閉",
    file: "檔案",
    path: "路徑",
  },

  // 设置页面
  settings: {
    title: "Attachmenter 設定",
    language: {
      name: "語言",
      desc: "選擇介面語言"
    },
    simpleMode: {
      name: "簡單模式",
      desc: "使用每個筆記的附件資料夾，並使用簡單的命名模式。"
    },
    folderSuffix: {
      name: "資料夾後綴",
      desc: "每個筆記附件資料夾的後綴，例如 `_Attachments`。"
    },
    attachmentNameFormat: {
      name: "附件名稱格式",
      desc: "使用 {notename} 和 {date}，例如 `{notename}-{date}`。"
    },
    dateFormat: {
      name: "日期格式",
      desc: "用於 {date} 的 Moment.js 日期格式。"
    },
    folderDisplay: {
      name: "資料夾顯示",
    },
    hideFolder: {
      name: "隱藏附件資料夾",
      desc: "在檔案瀏覽器中隱藏附件資料夾。您可以從功能區圖示切換此選項。"
    },
    aeroFolder: {
      name: "Aero 資料夾樣式",
      desc: "對附件資料夾套用 AERO（半透明）樣式。"
    },
    autoRenameFolder: {
      name: "自動重新命名資料夾",
    },
    autoRenameAttachmentFolder: {
      name: "自動重新命名附件資料夾",
      desc: "當筆記重新命名時，自動重新命名附件資料夾。"
    },
    pathValidation: {
      name: "路徑驗證",
    },
    promptRenameImage: {
      name: "提示重新命名圖片",
      desc: "在路徑檢查期間移動圖片時，提示使用者重新命名每個圖片。如果停用，則使用預設命名格式。"
    },
    checkPaths: {
      name: "檢查附件資料夾路徑",
      desc: "驗證所有附件資料夾路徑並檢查問題（無效字元、缺少資料夾、名稱不符）。",
      button: "檢查路徑"
    }
  },

  // 命令
  commands: {
    downloadRemoteImagesActive: "下載目前檔案中的遠端圖片"
  },

  // 菜单
  menu: {
    downloadRemoteImages: "下載遠端圖片"
  },

  // 通知消息
  notices: {
    noActiveFile: "找不到目前檔案",
    replacedCount: "已替換 {count} 個遠端圖片",
    noRemoteImages: "找不到要下載的遠端圖片",
    replacedCountInFile: "已在 {filename} 中替換 {count} 個遠端圖片",
    noRemoteImagesInFile: "在 {filename} 中找不到遠端圖片",
    pathUpdated: "路徑更新成功",
    pathUpdateFailed: "變更路徑失敗",
    imageMoved: "圖片移動成功",
    imageMoveFailed: "移動圖片失敗",
    imageDeleteFailed: "刪除圖片失敗",
    validationFailed: "驗證路徑失敗",
    fixedIssues: "已修復 {fixed} 個問題{failed}",
    fixedIssuesFailed: "，{failed} 個失敗"
  },

  // 路径检查模态框
  pathCheck: {
    title: "路徑驗證",
    checking: "正在檢查所有筆記的附件資料夾路徑...",
    summary: "摘要",
    totalFilesChecked: "已檢查的檔案總數：{count}",
    missingFolders: "缺少的資料夾：{count}",
    nameMismatches: "名稱不符：{count}",
    invalidChars: "包含無效字元的檔案：{count}",
    allValid: "✓ 所有路徑都有效！",
    issuesFound: "發現的問題",
    missingFoldersTitle: "缺少的資料夾",
    nameMismatchesTitle: "名稱不符",
    invalidCharsTitle: "無效字元",
    expected: "預期：{path}",
    actual: "實際：{path}",
    nA: "不適用",
    invalidCharacters: "無效字元：{chars}",
    noteName: "筆記名稱：{name}",
    moreIssues: "... 還有 {count} 個問題",
    fixAll: "修復所有問題"
  },

  // 粘贴图片管理模态框
  pasteImage: {
    manageTitle: "管理貼上的圖片",
    changeLocation: "變更此圖片的儲存位置：",
    currentPath: "目前路徑",
    newPath: "新路徑",
    newPathDesc: "輸入此圖片的新路徑",
    suggestedPaths: "建議的路徑：",
    use: "使用",
    applyPathChange: "套用路徑變更",
    availableActions: "此圖片的可用操作：",
    deleteImage: "刪除圖片",
    deleteImageDesc: "從您的庫和筆記中移除此圖片",
    delete: "刪除",
    moveToFolder: "移至附件資料夾",
    moveToFolderDesc: "將此圖片移至筆記的附件資料夾",
    move: "移動",
    deleteConfirm: "⚠️ 您確定要刪除此圖片嗎？",
    deleteConfirmDesc: "此操作無法復原。",
    confirmDelete: "確認刪除",
    pastedTitle: "圖片已貼上",
    keepImage: "保留圖片",
    previewAlt: "貼上圖片預覽"
  },

  // 重命名图片模态框
  renameImage: {
    title: "重新命名圖片",
    renameDesc: "重新命名圖片：{filename}",
    newName: "新名稱",
    newNameDesc: "輸入圖片的新名稱（不含副檔名）"
  }
};
