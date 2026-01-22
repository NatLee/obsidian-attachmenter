# Obsidian Attachmenter

**Obsidian Attachmenter** is a unified attachment management plugin for [Obsidian](https://obsidian.md) that combines the best features from two excellent plugins: [Attachment Manager](https://github.com/chenfeicqq/obsidian-attachment-manager) and [Attachment Management](https://github.com/trganda/obsidian-attachment-management).

This plugin automatically downloads remote images in your notes, manages attachment folders, and provides flexible configuration options for organizing your attachments.

## 🙏 Acknowledgments

This plugin is a fusion of two great plugins, taking the best features from each:

- **[Attachment Manager](https://github.com/chenfeicqq/obsidian-attachment-manager)** by [chenfeicqq](https://github.com/chenfeicqq)
  - Simple per-note attachment folder structure
  - Remote image downloading
  - Folder visibility toggle with ribbon icon
  - AERO folder styling

- **[Attachment Management](https://github.com/trganda/obsidian-attachment-management)** by [trganda](https://github.com/trganda)
  - Flexible path templates with variables
  - Override settings for files/folders
  - Advanced attachment naming patterns
  - Original name storage

Thank you to both original authors for their excellent work! This plugin aims to provide a unified solution that combines the simplicity of Attachment Manager with the flexibility of Attachment Management.

## ✨ Features

### Remote Image Download
- **One-Click Download**: Automatically scans notes for remote image URLs (`http://` or `https://`)
- **Smart Replacement**: Replaces remote URLs with local links while **preserving original Alt Text**
- **Multiple Entry Points**:
  - Command Palette: `Download remote images in active file`
  - File Explorer: Right-click on markdown files → `Download remote images`
- **Canvas Support**: Download and replace remote images in Obsidian Canvas files

### Attachment Folder Management
- **Per-Note Folders**: Automatically creates attachment folders for each note (e.g., `MyNote_Attachments/`)
- **Custom Naming**: Configure folder suffix and file naming patterns
- **Folder Visibility Toggle**: 
  - Ribbon icon in the left sidebar to show/hide attachment folders
  - Status bar indicator when folders are hidden
  - Command palette support
- **AERO Style**: Apply semi-transparent styling to attachment folders for a cleaner look

### Simple & Advanced Modes
- **Simple Mode** (Default): Easy-to-use per-note folder structure with simple naming patterns
- **Advanced Mode** (Planned): Full template system with variables like `${notepath}`, `${notename}`, `${date}`, etc.

### Conflict Prevention
- Automatically renames images based on **Note Name + Timestamp** (e.g., `MyNote-202310271030.png`) to avoid filename collisions
- Checks for existing files to prevent duplicate downloads

## ⚙️ Installation

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`) from the Releases page.
2. Create a folder named `obsidian-attachmenter` inside your vault's plugin folder:
   ```
   .obsidian/plugins/obsidian-attachmenter/
   ```
3. Move the downloaded files into this folder.
4. Reload Obsidian.
5. Enable **Obsidian Attachmenter** in `Settings > Community Plugins`.

## 🚀 Usage

### Download Remote Images

#### For Markdown Notes

1. Open the note containing remote images.
2. Use one of the following methods:
   - **Command Palette**: Press `Ctrl/Cmd + P`, type `Download remote images`, and press Enter.
   - **File Explorer**: Right-click on a markdown file in the sidebar and select `Download remote images`.

The plugin will:
- Scan for all remote image URLs in the format `![alt](https://...)`
- Download each image to the note's attachment folder
- Replace the remote URL with a local link
- Show a notification with the number of images replaced

#### For Canvas (Experimental)

1. Open your Canvas file.
2. Open the Command Palette (`Ctrl/Cmd + P`).
3. Run the command `Download remote images in active file`.

### Toggle Folder Visibility

- **Ribbon Icon**: Click the eye icon in the left sidebar to toggle attachment folder visibility
- **Command Palette**: Run `Toggle attachment folder visibility`
- **Settings**: Enable/disable in plugin settings

## 🔧 Settings

Go to `Settings > Obsidian Attachmenter` to configure:

### Basic Settings

- **Simple mode**: Toggle between simple and advanced modes (advanced mode coming soon)
- **Folder suffix**: Suffix for per-note attachment folders (default: `_Attachments`)
- **Attachment name format**: Template for attachment file names (supports `{notename}` and `{date}`)
- **Date format**: Moment.js date format used for `{date}` (default: `YYYYMMDDHHmmssSSS`)

### Folder Display

- **Hide attachment folders**: Hide attachment folders in the file explorer
- **AERO folder style**: Apply semi-transparent styling to attachment folders

## 🛠️ Development

If you want to contribute or build the plugin from source:

1. **Clone the repository**
   ```bash
   git clone https://github.com/YourUsername/obsidian-attachmenter.git
   cd obsidian-attachmenter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build**
   
   Development mode (watches for changes):
   ```bash
   npm run dev
   ```
   
   Production build:
   ```bash
   npm run build
   ```

## 📝 Notes

- The plugin currently supports common image formats: `png`, `jpg/jpeg`, `gif`, `webp`, `svg`, `bmp`, `apng`, `avif`, `bmp`, `ico`, `tif`
- It is recommended to backup your notes before running the replacement on a large number of files
- Remote image downloading requires an active internet connection
- The plugin preserves original alt text when replacing remote image links


## 📄 License

[MIT License](LICENSE.MD)

## 🙏 Credits

- **Attachment Manager** by [chenfeicqq](https://github.com/chenfeicqq) - [GitHub](https://github.com/chenfeicqq/obsidian-attachment-manager)
- **Attachment Management** by [trganda](https://github.com/trganda) - [GitHub](https://github.com/trganda/obsidian-attachment-management)
