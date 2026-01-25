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
    restoreDefault: "恢復預設",
  },

  // 设置页面
  settings: {
    title: "Attachmenter 設定",
    group: {
      general: "一般設定",
      management: "命名與儲存規則",
      appearance: "介面整合",
      view: "附件樹視圖",
      tools: "工具與維護"
    },
    language: {
      name: "語言",
      desc: "選擇介面語言"
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
    highlight: {
      name: "高亮展開的檔案",
      enable: "啟用高亮",
      enableDesc: "當附件樹展開時，為筆記標題添加左側邊框強調，幫助您識別目前正在操作的檔案。",
      borderColor: "邊框顏色",
      borderColorDesc: "左側邊框強調色的 CSS 顏色值。預設為您的主題強調色 (Accent Color)。"
    },
    hideFolder: {
      name: "隱藏附件資料夾",
      desc: "在檔案瀏覽器中隱藏附件資料夾。您可以從功能區圖示切換此選項。"
    },
    aeroFolder: {
      name: "Aero 資料夾樣式",
      desc: "對附件資料夾套用 AERO（半透明）樣式。"
    },
    showStatusBar: {
      name: "顯示狀態列指示器",
      desc: "當附件資料夾隱藏時顯示狀態列指示器。"
    },
    showRibbonIcon: {
      name: "顯示 Ribbon 圖示",
      desc: "在左側邊欄顯示 Ribbon 圖示以切換附件資料夾的可見性。"
    },
    showAttachmentManagerButton: {
      name: "顯示附件管理器按鈕",
      desc: "在檔案瀏覽器中顯示附件管理器按鈕。"
    },
    showFileAttachmentTree: {
      name: "顯示檔案附件樹",
      desc: "在檔案瀏覽器中為每個檔案顯示可展開的附件樹。"
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
    },
    renameConfirmation: {
      name: "重新命名確認行為",
      desc: "選擇在重新命名附件前是否詢問確認。",
      ask: "每次都詢問",
      alwaysRename: "總是直接更名"
    },
    showRemoteHint: {
      name: "顯示遠端圖片提示",
      desc: "即使筆記只包含遠端圖片（http 開頭的連結），也顯示附件樹展開圖示。"
    },
    cleanup: {
      name: "清理空附件資料夾",
      desc: "尋找並刪除與後綴設定相符的空附件資料夾。",
      button: "檢查空資料夾",
      modalTitle: "空附件資料夾",
      noEmptyFolders: "未找到空附件資料夾。",
      foundFolders: "找到 {count} 個空附件資料夾：",
      deleteAll: "刪除全部",
      deleteSuccess: "已刪除 {count} 個空資料夾。",
      deleteFailed: "刪除資料夾失敗。"
    }
  },

  // 命令
  commands: {
    downloadRemoteImagesActive: "下載目前檔案中的遠端圖片",
    openAttachmentFolderManager: "開啟附件資料夾管理"
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
    fixAll: "修復所有問題",
    previewChanges: "預覽變更",
    executeChanges: "執行修復",
    changePlan: "變更計劃",
    folderCreations: "將建立的資料夾",
    folderRenames: "將重新命名的資料夾",
    imageMoves: "將移動的圖片",
    linkUpdates: "將更新的連結",
    fromPath: "來源：{path}",
    toPath: "目標：{path}",
    inFile: "檔案：{path}",
    oldLink: "舊連結：{link}",
    newLink: "新連結：{link}",
    confirmExecute: "確認執行",
    noChanges: "沒有需要執行的變更",
    statistics: {
      title: "統計資料",
      files: {
        title: "檔案",
        withImageLinks: "有圖片連結",
        withoutImageLinks: "沒有圖片連結",
        withAttachments: "有附件",
        withoutAttachments: "沒有附件"
      },
      imageLinks: {
        title: "圖片連結",
        resolved: "已解析",
        unresolved: "未解析",
        markdown: "Markdown",
        wiki: "Wiki"
      },
      attachmentFolders: {
        title: "附件資料夾",
        existing: "存在",
        missing: "缺失",
        correctlyNamed: "正確命名",
        incorrectlyNamed: "錯誤命名"
      },
      issues: {
        title: "問題",
        missing: "缺失",
        nameMismatch: "名稱不符",
        invalidChars: "無效字元"
      }
    }
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
  },

  // 附件資料夾管理視圖
  attachmentFolderManager: {
    title: "附件資料夾",
    refresh: "重新整理",
    empty: "找不到附件資料夾",
    fileCount: "{count} 個檔案"
  },

  // 文件附件樹
  fileAttachmentTree: {
    noAttachments: "沒有附件",
    emptyFolder: "資料夾是空的",
    loadMore: "載入更多 {{count}} 個...",
    remoteImages: "遠端圖片",
    download: "下載",
    openInBrowser: "在瀏覽器中開啟",
    remoteLoadError: "載入遠端圖片失敗"
  },

  // 附件管理器
  attachmentManager: {
    title: "附件管理器",
    refresh: "重新整理",
    empty: "找不到附件",
    preview: "預覽",
    rename: "重新命名",
    delete: "刪除",
    openNote: "開啟筆記",
    previewNotAvailable: "此檔案類型不支援預覽",
    deleteConfirm: "刪除附件",
    deleteConfirmDesc: "您確定要刪除「{filename}」嗎？此操作無法復原。",
    deleteSuccess: "附件已成功刪除",
    deleteFailed: "刪除附件失敗",
    deleteFolderConfirm: "刪除附件資料夾",
    deleteFolderConfirmDesc: "您確定要刪除資料夾「{foldername}」及其所有 {count} 個檔案嗎？此操作無法復原。",
    deleteFolderSuccess: "附件資料夾已成功刪除",
    openInSystemExplorer: "在系統檔案管理員中開啟"
  }
};
