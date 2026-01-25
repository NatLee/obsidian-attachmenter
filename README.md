# Obsidian Attachmenter

A unified attachment management plugin for [Obsidian](https://obsidian.md) that automatically downloads remote images, manages per-note attachment folders, and provides flexible organization tools.

---

## 🌟 Feature Highlights

- 📥 **Remote Image Download** — One-click download of all remote images in notes and Canvas
- 📁 **Per-Note Attachment Folders** — Automatic folder creation and organization
- 📋 **Paste Image Management** — Keep, delete, or relocate pasted images instantly
- 🌲 **File Attachment Tree** — Inline attachment view in File Explorer with quick actions
- 🔍 **Path Validation & Repair** — Comprehensive scanning and auto-fix for attachment issues
- 🌐 **Multi-Language** — English, 繁體中文, 简体中文

---

## 🙏 Acknowledgments

This plugin is a fusion of two excellent plugins:

- **[Attachment Manager](https://github.com/chenfeicqq/obsidian-attachment-manager)** by [chenfeicqq](https://github.com/chenfeicqq)
  - Simple per-note attachment folder structure
  - Remote image downloading
  - Folder visibility toggle with ribbon icon

- **[Attachment Management](https://github.com/trganda/obsidian-attachment-management)** by [trganda](https://github.com/trganda)
  - Flexible path templates with variables
  - Override settings for files/folders
  - Advanced attachment naming patterns

---

## ✨ Features

### Remote Image Download

| Feature | Description |
|---------|-------------|
| One-Click Download | Scans notes for remote image URLs and downloads them locally |
| Format Support | Works with Markdown (`![alt](url)`) and Wiki (`![[url]]`) links |
| Alt Text Preserved | Original alt text is maintained after replacement |
| Canvas Support | Full support for Obsidian Canvas files |
| Conflict Prevention | Automatically appends numbers to avoid filename conflicts |

**How to use:**
- Command Palette: `Download remote images in active file`
- File Explorer: Right-click → `Download remote images`

### Attachment Folder Management

| Feature | Description |
|---------|-------------|
| Per-Note Folders | Creates `NoteName_Attachments/` folder for each note |
| Custom Naming | Configure folder suffix and file naming patterns |
| Auto-Rename | Folders rename automatically when notes are renamed |
| Hide/Show Toggle | Ribbon icon and command to toggle folder visibility |
| AERO Style | Semi-transparent styling for a cleaner look |

### Paste Image Management

When you paste an image, a modal appears with options:

- **Keep** — Confirm and keep the image in its current location
- **Delete** — Remove the image file and its link from your note
- **Change Location** — Move the image to a different folder path

<!-- TODO: Add screenshot of paste image modal here -->

### File Attachment Tree

Expandable attachment trees directly in the File Explorer:

- Click the chevron (▶) next to files to expand attachment list
- Quick actions on hover: **Preview** | **Rename** | **Delete**
- Shows attachment count badges
- Performance optimized with lazy loading (20 items initially)

<!-- TODO: Add GIF showing attachment tree interaction here -->

### Attachment Manager View

A dedicated view for centralized attachment management:

- Attachments grouped by folder
- Preview, rename, delete with single clicks
- Jump to associated notes
- Real-time updates on file changes

**Open via:** Command Palette → `Open attachment folder manager`

### Path Validation & Repair

Comprehensive tool to scan and fix attachment organization issues:

| Statistics | Issues Detected |
|------------|-----------------|
| Files with/without attachments | Missing folders |
| Resolved/unresolved links | Name mismatches |
| Markdown vs Wiki format | Invalid characters |

**Features:**
- **Preview Changes** — Dry-run mode to review before executing
- **Auto-Fix** — Creates folders, renames, moves images, updates links

**Access via:** Settings → `Check paths` button

### Internationalization

| Language | Code |
|----------|------|
| English | `en` |
| 繁體中文 | `zh-Hant` |
| 简体中文 | `zh-Hans` |

---

## ⚙️ Installation

1. Download `main.js`, `manifest.json`, `styles.css` from [Releases](https://github.com/natlee/obsidian-attachmenter/releases)
2. Create folder: `.obsidian/plugins/obsidian-attachmenter/`
3. Move downloaded files into the folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins

---

## 🔧 Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Language** | Interface language | English |
| **Folder suffix** | Suffix for attachment folders (e.g., `_Attachments`) | `_Attachments` |
| **Attachment name format** | Template using `{notename}` and `{date}` | `{notename}-{date}` |
| **Date format** | Moment.js format for `{date}` variable | `YYYYMMDDHHmmssSSS` |
| **Hide attachment folders** | Toggle folder visibility in File Explorer | Off |
| **AERO folder style** | Semi-transparent folder styling | On |
| **Show status bar indicator** | Shows "Attachment folders hidden" when applicable | On |
| **Show ribbon icon** | Toggle button in left sidebar | On |
| **Show attachment manager button** | Button in File Explorer | On |
| **Show file attachment tree** | Inline attachment trees in File Explorer | On |
| **Auto rename attachment folder** | Rename folder when note is renamed | On |
| **Prompt to rename images** | Ask for new name when moving images during repair | On |

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/natlee/obsidian-attachmenter.git
cd obsidian-attachmenter

# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Production build
npm run build
```

---

## 📝 Technical Details

**Supported image formats:** `png`, `jpg/jpeg`, `gif`, `webp`, `svg`, `bmp`, `apng`, `avif`, `ico`, `tif`

**Link format support:**
- Markdown: `![alt text](path/to/image.png)`
- Wiki: `![[image.png]]` or `![[image.png|alt text]]`

**Path sanitization:** Invalid characters (`#`, `<`, `>`, `:`, `"`, `|`, `?`, `*`) are automatically handled.

---

## ❓ FAQ

<details>
<summary><b>What happens when I rename a note?</b></summary>

If "Auto rename attachment folder" is enabled, the attachment folder is automatically renamed to match, and all links are updated.
</details>

<details>
<summary><b>Can I use this with existing attachments?</b></summary>

Yes! Use the Path Validation tool (Settings → Check paths) to reorganize existing attachments and update all links automatically.
</details>

<details>
<summary><b>How do I use custom date formats?</b></summary>

The date format uses [Moment.js syntax](https://momentjs.com/docs/#/displaying/format/). Examples:
- `YYYY-MM-DD` → `2023-10-27`
- `YYYYMMDD_HHmmss` → `20231027_143025`
</details>

---

## 📄 License

[MIT License](LICENSE.MD)

---

## 🔗 Links

- [GitHub Repository](https://github.com/natlee/obsidian-attachmenter)
- [Report Issues](https://github.com/natlee/obsidian-attachmenter/issues)
