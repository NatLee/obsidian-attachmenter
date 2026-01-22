/**
 * Path sanitization utility for cross-platform file and folder name handling.
 * Handles invalid characters that may cause issues on different operating systems.
 */
export class PathSanitizer {
  /**
   * Characters that are invalid on Windows
   */
  private static readonly WINDOWS_INVALID_CHARS = /[<>:"/\\|?*]/g;

  /**
   * Characters that are invalid on all platforms
   */
  private static readonly UNIVERSAL_INVALID_CHARS = /[/\0]/g;

  /**
   * Special characters that should be replaced with space
   * # is specifically requested to be replaced with space
   */
  private static readonly SPACE_REPLACE_CHARS = /#/g;

  /**
   * Sanitize a file name by removing or replacing invalid characters.
   * @param name - The file name to sanitize
   * @returns Sanitized file name safe for all platforms
   */
  static sanitizeFileName(name: string): string {
    if (!name) return "";

    let sanitized = name;

    // Replace # with space (special case as requested)
    sanitized = sanitized.replace(this.SPACE_REPLACE_CHARS, " ");

    // Replace Windows invalid characters with space
    sanitized = sanitized.replace(this.WINDOWS_INVALID_CHARS, " ");

    // Replace universal invalid characters with space
    sanitized = sanitized.replace(this.UNIVERSAL_INVALID_CHARS, " ");

    // Replace consecutive spaces with single space
    sanitized = sanitized.replace(/\s+/g, " ");

    // Trim leading and trailing spaces and dots
    // Windows doesn't allow leading/trailing dots or spaces in filenames
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");

    // Remove any remaining control characters (C0 and DEL control characters)
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

    // Ensure name is not empty after sanitization
    if (!sanitized) {
      sanitized = "unnamed";
    }

    return sanitized;
  }

  /**
   * Sanitize a folder name by removing or replacing invalid characters.
   * @param name - The folder name to sanitize
   * @returns Sanitized folder name safe for all platforms
   */
  static sanitizeFolderName(name: string): string {
    // Folder names use the same rules as file names
    return this.sanitizeFileName(name);
  }

  /**
   * Check if a name contains invalid characters.
   * @param name - The name to check
   * @returns Array of invalid characters found, or empty array if valid
   */
  static findInvalidCharacters(name: string): string[] {
    if (!name) return [];

    const invalid: string[] = [];
    // Pattern includes control characters (C0 and DEL) which are invalid in filenames
    // eslint-disable-next-line no-control-regex
    const allInvalidPattern = /[<>:"/\\|?*#\0\x00-\x1F\x7F]/g;
    let match;

    while ((match = allInvalidPattern.exec(name)) !== null) {
      if (!invalid.includes(match[0])) {
        invalid.push(match[0]);
      }
    }

    return invalid;
  }

  /**
   * Check if a name is valid (doesn't contain invalid characters).
   * @param name - The name to check
   * @returns True if the name is valid, false otherwise
   */
  static isValidName(name: string): boolean {
    if (!name) return false;
    return this.findInvalidCharacters(name).length === 0;
  }
}
