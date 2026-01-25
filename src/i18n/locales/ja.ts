import { TranslationMap } from "../index";

export const ja: TranslationMap = {
    // 通用
    common: {
        save: "保存",
        cancel: "キャンセル",
        delete: "削除",
        confirm: "確認",
        keep: "保持",
        close: "閉じる",
        file: "ファイル",
        path: "パス",
        restoreDefault: "デフォルトに戻す",
    },

    // 设置页面
    settings: {
        title: "Attachmenter 設定",
        group: {
            general: "一般設定",
            management: "管理ルール",
            appearance: "インターフェース統合",
            view: "添付ファイルツリー",
            tools: "ツール & メンテナンス"
        },
        language: {
            name: "言語",
            desc: "インターフェース言語を選択"
        },
        folderSuffix: {
            name: "フォルダサフィックス",
            desc: "ノートごとの添付フォルダのサフィックス。例: `_Attachments`。"
        },
        attachmentNameFormat: {
            name: "添付ファイル名の形式",
            desc: "{notename} と {date} を使用します。例: `{notename}-{date}`。"
        },
        dateFormat: {
            name: "日付形式",
            desc: "{date} に使用される Moment.js の日付形式。"
        },
        showRemoteHint: {
            name: "リモート画像のヒントを表示",
            desc: "ノートにリモート画像（httpで始まるリンク）のみが含まれている場合でも、添付ファイルツリーの展開アイコンを表示します。",
        },
        folderDisplay: {
            name: "フォルダ表示",
        },
        // Feature: Highlight expanded file
        highlight: {
            name: "展開中のファイルを強調表示",
            enable: "強調表示を有効にする",
            enableDesc: "添付ファイルツリーが展開されているときに、ノートのファイルタイトルの左境界線にアクセントを追加します。",
            borderColor: "境界線の色",
            borderColorDesc: "左境界線アクセントのCSSカラー値。デフォルトはテーマのアクセントカラーです。",
        },
        hideFolder: {
            name: "添付フォルダを非表示",
            desc: "ファイルエクスプローラーで添付フォルダを非表示にします。リボンアイコンから切り替え可能です。"
        },
        aeroFolder: {
            name: "Aeroフォルダスタイル",
            desc: "添付フォルダにAero（半透明）スタイルを適用します。"
        },
        showStatusBar: {
            name: "ステータスバーインジケーターを表示",
            desc: "添付フォルダが非表示の場合にステータスバーインジケーターを表示します。"
        },
        showRibbonIcon: {
            name: "リボンアイコンを表示",
            desc: "左サイドバーに添付フォルダの表示/非表示を切り替えるリボンアイコンを表示します。"
        },
        showAttachmentManagerButton: {
            name: "添付ファイル管理ボタンを表示",
            desc: "ファイルエクスプローラーに添付ファイル管理ボタンを表示します。"
        },
        showFileAttachmentTree: {
            name: "添付ファイルツリーを表示",
            desc: "ファイルエクスプローラーで各ファイルの添付ファイルツリーを展開可能にします。"
        },
        autoRenameFolder: {
            name: "フォルダ自動リネーム",
        },
        autoRenameAttachmentFolder: {
            name: "添付フォルダの自動リネーム",
            desc: "ノートがリネームされたときに添付フォルダも自動的にリネームします。"
        },
        pathValidation: {
            name: "パス検証",
        },
        promptRenameImage: {
            name: "画像のリネームを確認",
            desc: "パスチェック中に画像を移動する場合、各画像の新しい名前を確認します。無効にすると、デフォルトの命名形式を使用します。"
        },
        checkPaths: {
            name: "添付フォルダパスを確認",
            desc: "すべての添付フォルダパスを検証し、問題（無効な文字、フォルダの欠落、名前の不一致）を確認します。",
            button: "パスを確認"
        },
        renameConfirmation: {
            name: "リネーム確認の動作",
            desc: "添付ファイルをリネームする際に確認を求めるかどうかを選択します。",
            ask: "毎回確認する",
            alwaysRename: "常に直接リネーム"
        },
        cleanup: {
            name: "空の添付フォルダを整理",
            desc: "設定されたサフィックスに一致する空の添付フォルダを検索して削除します。",
            button: "空のフォルダを確認",
            modalTitle: "空の添付フォルダ",
            noEmptyFolders: "空の添付フォルダは見つかりませんでした。",
            foundFolders: "{count} 個の空の添付フォルダが見つかりました:",
            deleteAll: "すべて削除",
            deleteSuccess: "{count} 個の空のフォルダを削除しました。",
            deleteFailed: "フォルダの削除に失敗しました。"
        }
    },

    // 命令
    commands: {
        downloadRemoteImagesActive: "アクティブなファイルのリモート画像をダウンロード",
        openAttachmentFolderManager: "添付フォルダマネージャーを開く"
    },

    // 菜单
    menu: {
        downloadRemoteImages: "リモート画像をダウンロード"
    },

    // 通知消息
    notices: {
        noActiveFile: "アクティブなファイルが見つかりません",
        replacedCount: "{count} 個のリモート画像を置き換えました",
        noRemoteImages: "ダウンロードするリモート画像が見つかりません",
        replacedCountInFile: "{filename} 内の {count} 個のリモート画像を置き換えました",
        noRemoteImagesInFile: "{filename} にリモート画像が見つかりません",
        pathUpdated: "パスが正常に更新されました",
        pathUpdateFailed: "パスの変更に失敗しました",
        imageDeleteFailed: "画像の削除に失敗しました",
        validationFailed: "パスの検証に失敗しました",
        fixedIssues: "{fixed} 個の問題を修正しました{failed}",
        fixedIssuesFailed: "、{failed} 個が失敗しました"
    },

    // 路径检查模态框
    pathCheck: {
        title: "パス検証",
        checking: "すべてのノートの添付フォルダパスを確認中...",
        summary: "概要",
        totalFilesChecked: "チェックしたファイルの総数: {count}",
        missingFolders: "不足しているフォルダ: {count}",
        nameMismatches: "名前の不一致: {count}",
        invalidChars: "無効な文字を含むファイル: {count}",
        allValid: "すべてのパスが有効です。",
        issuesFound: "問題が見つかりました",
        missingFoldersTitle: "不足しているフォルダ",
        nameMismatchesTitle: "名前の不一致",
        invalidCharsTitle: "無効な文字",
        expected: "期待: {path}",
        actual: "実際: {path}",
        nA: "N/A",
        invalidCharacters: "無効な文字: {chars}",
        noteName: "ノート名: {name}",
        moreIssues: "... 他 {count} 件の問題",
        fixAll: "すべての問題を修正",
        previewChanges: "変更をプレビュー",
        executeChanges: "修正を実行",
        changePlan: "変更プラン",
        folderCreations: "作成されるフォルダ",
        folderRenames: "リネームされるフォルダ",
        imageMoves: "移動される画像",
        linkUpdates: "更新されるリンク",
        fromPath: "移動元: {path}",
        toPath: "移動先: {path}",
        inFile: "ファイル: {path}",
        oldLink: "古いリンク: {link}",
        newLink: "新しいリンク: {link}",
        confirmExecute: "確認して実行",
        noChanges: "実行する変更はありません",
        statistics: {
            title: "統計",
            files: {
                title: "ファイル",
                withImageLinks: "画像リンクあり",
                withoutImageLinks: "画像リンクなし",
                withAttachments: "添付ファイルあり",
                withoutAttachments: "添付ファイルなし"
            },
            imageLinks: {
                title: "画像リンク",
                resolved: "解決済み",
                unresolved: "未解決",
                markdown: "Markdown",
                wiki: "Wiki"
            },
            attachmentFolders: {
                title: "添付フォルダ",
                existing: "存在",
                missing: "欠落",
                correctlyNamed: "正しい名前",
                incorrectlyNamed: "誤った名前"
            },
            issues: {
                title: "問題",
                missing: "欠落",
                nameMismatch: "名前の不一致",
                invalidChars: "無効な文字"
            }
        }
    },

    // 粘贴图片管理模态框
    pasteImage: {
        manageTitle: "貼り付け画像の管理",
        changeLocation: "この画像の保存場所を変更:",
        currentPath: "現在のパス",
        newPath: "新しいパス",
        newPathDesc: "この画像の新しいパスを入力してください",
        suggestedPaths: "提案されたパス:",
        use: "使用",
        applyPathChange: "パス変更を適用",

        deleteConfirm: "この画像を削除してもよろしいですか？",
        deleteConfirmDesc: "この操作は取り消せません。",
        confirmDelete: "削除を確認",
        delete: "削除",
        pastedTitle: "画像が貼り付けられました",
        keepImage: "画像を保持",
        previewAlt: "貼り付け画像のプレビュー"
    },

    // 重命名图片模态框
    renameImage: {
        title: "画像のリネーム",
        renameDesc: "画像のリネーム: {filename}",
        newName: "新しい名前",
        newNameDesc: "画像の新しい名前を入力してください（拡張子なし）"
    },

    // 附件资料夹管理视图
    attachmentFolderManager: {
        title: "添付フォルダ",
        refresh: "更新",
        empty: "添付フォルダが見つかりません",
        fileCount: "{count} ファイル"
    },

    // 文件附件樹
    fileAttachmentTree: {
        noAttachments: "添付ファイルなし",
        emptyFolder: "フォルダは空です",
        loadMore: "さらに {count} 件読み込む...",
        remoteImages: "リモート画像",
        download: "ダウンロード",
        openInBrowser: "ブラウザで開く",
        remoteLoadError: "リモート画像の読み込みに失敗しました"
    },

    // 附件管理器
    attachmentManager: {
        title: "添付ファイルマネージャー",
        refresh: "更新",
        empty: "添付ファイルが見つかりません",
        preview: "プレビュー",
        rename: "リネーム",
        delete: "削除",
        openNote: "ノートを開く",
        previewNotAvailable: "このファイル形式のプレビューは利用できません",
        deleteConfirm: "添付ファイルを削除",
        deleteConfirmDesc: "\"{filename}\" を削除してもよろしいですか？この操作は取り消せません。",
        deleteSuccess: "添付ファイルを削除しました",
        deleteFailed: "添付ファイルの削除に失敗しました",
        deleteFolderConfirm: "添付フォルダを削除",
        deleteFolderConfirmDesc: "フォルダ \"{foldername}\" とその中の {count} 個のファイルをすべて削除してもよろしいですか？この操作は取り消せません。",
        deleteFolderSuccess: "添付フォルダを削除しました",
        openInSystemExplorer: "システムエクスプローラーで開く"
    }
};
