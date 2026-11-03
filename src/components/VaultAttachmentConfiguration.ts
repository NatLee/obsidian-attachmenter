import { Vault } from "obsidian";

/**
 * `Vault.getConfig` / `Vault.setConfig` are not part of Obsidian's public
 * typings, but they are available at runtime. Declare the subset we use so
 * the calls stay type-safe.
 */
interface VaultWithConfig extends Vault {
  getConfig(key: string): unknown;
  setConfig(key: string, value: unknown): void;
}

export class VaultAttachmentConfiguration {
  private vault: VaultWithConfig;
  private key = "attachmentFolderPath";
  private _value: unknown;
  private key2 = "newLinkFormat";
  private _value2: unknown;

  constructor(vault: Vault) {
    this.vault = vault as VaultWithConfig;
  }

  backup() {
    // Backup the original attachment folder path configuration
    this._value = this.vault.getConfig(this.key);
    this._value2 = this.vault.getConfig(this.key2);
    // 非 relative（相对路径） 及 shortest（最短路径），则设置为 relative
    // https://github.com/chenfeicqq/obsidian-attachment-manager/issues/4
    if (this._value2 !== "relative" && this._value2 !== "shortest") {
      this.vault.setConfig(this.key2, "relative");
    }
  }

  update(value: string) {
    // Update the attachment folder path to the specified value
    // This affects the default path shown in the paste image dialog
    this.vault.setConfig(this.key, value);
  }

  restore() {
    // Restore the original configuration when plugin unloads
    if (this._value !== undefined) {
      this.vault.setConfig(this.key, this._value);
    }
    if (this._value2 !== undefined) {
      this.vault.setConfig(this.key2, this._value2);
    }
  }
}
