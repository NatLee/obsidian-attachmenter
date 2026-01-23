import { TranslationMap } from "../index";

export const zhHans: TranslationMap = {
  // 通用
  common: {
    save: "保存",
    cancel: "取消",
    delete: "删除",
    confirm: "确认",
    keep: "保留",
    close: "关闭",
    file: "文件",
    path: "路径",
  },

  // 设置页面
  settings: {
    title: "Attachmenter 设置",
    language: {
      name: "语言",
      desc: "选择界面语言"
    },
    folderSuffix: {
      name: "文件夹后缀",
      desc: "每个笔记附件文件夹的后缀，例如 `_Attachments`。"
    },
    attachmentNameFormat: {
      name: "附件名称格式",
      desc: "使用 {notename} 和 {date}，例如 `{notename}-{date}`。"
    },
    dateFormat: {
      name: "日期格式",
      desc: "用于 {date} 的 Moment.js 日期格式。"
    },
    folderDisplay: {
      name: "文件夹显示",
    },
    hideFolder: {
      name: "隐藏附件文件夹",
      desc: "在文件浏览器中隐藏附件文件夹。您可以从功能区图标切换此选项。"
    },
    aeroFolder: {
      name: "Aero 文件夹样式",
      desc: "对附件文件夹应用 AERO（半透明）样式。"
    },
    showStatusBar: {
      name: "显示状态栏指示器",
      desc: "当附件文件夹隐藏时显示状态栏指示器。"
    },
    showRibbonIcon: {
      name: "显示 Ribbon 图标",
      desc: "在左侧边栏显示 Ribbon 图标以切换附件文件夹的可见性。"
    },
    showAttachmentManagerButton: {
      name: "显示附件管理器按钮",
      desc: "在文件浏览器中显示附件管理器按钮。"
    },
    showFileAttachmentTree: {
      name: "显示文件附件树",
      desc: "在文件浏览器中为每个文件显示可展开的附件树。"
    },
    autoRenameFolder: {
      name: "自动重命名文件夹",
    },
    autoRenameAttachmentFolder: {
      name: "自动重命名附件文件夹",
      desc: "当笔记重命名时，自动重命名附件文件夹。"
    },
    pathValidation: {
      name: "路径验证",
    },
    promptRenameImage: {
      name: "提示重命名图片",
      desc: "在路径检查期间移动图片时，提示用户重命名每个图片。如果禁用，则使用默认命名格式。"
    },
    checkPaths: {
      name: "检查附件文件夹路径",
      desc: "验证所有附件文件夹路径并检查问题（无效字符、缺少文件夹、名称不匹配）。",
      button: "检查路径"
    }
  },

  // 命令
  commands: {
    downloadRemoteImagesActive: "下载当前文件中的远程图片",
    openAttachmentFolderManager: "打开附件文件夹管理"
  },

  // 菜单
  menu: {
    downloadRemoteImages: "下载远程图片"
  },

  // 通知消息
  notices: {
    noActiveFile: "找不到当前文件",
    replacedCount: "已替换 {count} 个远程图片",
    noRemoteImages: "找不到要下载的远程图片",
    replacedCountInFile: "已在 {filename} 中替换 {count} 个远程图片",
    noRemoteImagesInFile: "在 {filename} 中找不到远程图片",
    pathUpdated: "路径更新成功",
    pathUpdateFailed: "更改路径失败",
    imageMoved: "图片移动成功",
    imageMoveFailed: "移动图片失败",
    imageDeleteFailed: "删除图片失败",
    validationFailed: "验证路径失败",
    fixedIssues: "已修复 {fixed} 个问题{failed}",
    fixedIssuesFailed: "，{failed} 个失败"
  },

  // 路径检查模态框
  pathCheck: {
    title: "路径验证",
    checking: "正在检查所有笔记的附件文件夹路径...",
    summary: "摘要",
    totalFilesChecked: "已检查的文件总数：{count}",
    missingFolders: "缺少的文件夹：{count}",
    nameMismatches: "名称不匹配：{count}",
    invalidChars: "包含无效字符的文件：{count}",
    allValid: "✓ 所有路径都有效！",
    issuesFound: "发现的问题",
    missingFoldersTitle: "缺少的文件夹",
    nameMismatchesTitle: "名称不匹配",
    invalidCharsTitle: "无效字符",
    expected: "预期：{path}",
    actual: "实际：{path}",
    nA: "不适用",
    invalidCharacters: "无效字符：{chars}",
    noteName: "笔记名称：{name}",
    moreIssues: "... 还有 {count} 个问题",
    fixAll: "修复所有问题",
    previewChanges: "预览变更",
    executeChanges: "执行修复",
    changePlan: "变更计划",
    folderCreations: "将创建的文件夹",
    folderRenames: "将重命名的文件夹",
    imageMoves: "将移动的图片",
    linkUpdates: "将更新的链接",
    fromPath: "来源：{path}",
    toPath: "目标：{path}",
    inFile: "文件：{path}",
    oldLink: "旧链接：{link}",
    newLink: "新链接：{link}",
    confirmExecute: "确认执行",
    noChanges: "没有需要执行的变更",
    statistics: {
      title: "统计资料",
      files: {
        title: "文件",
        withImageLinks: "有图片链接",
        withoutImageLinks: "没有图片链接",
        withAttachments: "有附件",
        withoutAttachments: "没有附件"
      },
      imageLinks: {
        title: "图片链接",
        resolved: "已解析",
        unresolved: "未解析",
        markdown: "Markdown",
        wiki: "Wiki"
      },
      attachmentFolders: {
        title: "附件文件夹",
        existing: "存在",
        missing: "缺失",
        correctlyNamed: "正确命名",
        incorrectlyNamed: "错误命名"
      },
      issues: {
        title: "问题",
        missing: "缺失",
        nameMismatch: "名称不匹配",
        invalidChars: "无效字符"
      }
    }
  },

  // 粘贴图片管理模态框
  pasteImage: {
    manageTitle: "管理粘贴的图片",
    changeLocation: "更改此图片的保存位置：",
    currentPath: "当前路径",
    newPath: "新路径",
    newPathDesc: "输入此图片的新路径",
    suggestedPaths: "建议的路径：",
    use: "使用",
    applyPathChange: "应用路径更改",
    availableActions: "此图片的可用操作：",
    deleteImage: "删除图片",
    deleteImageDesc: "从您的库和笔记中移除此图片",
    delete: "删除",
    moveToFolder: "移至附件文件夹",
    moveToFolderDesc: "将此图片移至笔记的附件文件夹",
    move: "移动",
    deleteConfirm: "⚠️ 您确定要删除此图片吗？",
    deleteConfirmDesc: "此操作无法撤销。",
    confirmDelete: "确认删除",
    pastedTitle: "图片已粘贴",
    keepImage: "保留图片",
    previewAlt: "粘贴图片预览"
  },

  // 重命名图片模态框
  renameImage: {
    title: "重命名图片",
    renameDesc: "重命名图片：{filename}",
    newName: "新名称",
    newNameDesc: "输入图片的新名称（不含扩展名）"
  },

  // 附件文件夹管理视图
  attachmentFolderManager: {
    title: "附件文件夹",
    refresh: "刷新",
    empty: "未找到附件文件夹",
    fileCount: "{count} 个文件"
  },

  // 文件附件树
  fileAttachmentTree: {
    noAttachments: "没有附件",
    emptyFolder: "文件夹是空的",
    loadMore: "加载更多 {{count}} 个..."
  },

  // 附件管理器
  attachmentManager: {
    title: "附件管理器",
    refresh: "刷新",
    empty: "未找到附件",
    preview: "预览",
    rename: "重命名",
    delete: "删除",
    openNote: "打开笔记",
    previewNotAvailable: "此文件类型不支持预览",
    deleteConfirm: "删除附件",
    deleteConfirmDesc: "您确定要删除「{filename}」吗？此操作无法撤销。",
    deleteSuccess: "附件已成功删除",
    deleteFailed: "删除附件失败"
  }
};
