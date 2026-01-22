import { Vault } from "obsidian";

export class VaultAttachmentConfiguration {
  private vault: Vault;
  private key = "attachmentFolderPath";
  private _value: string | undefined;
  private key2 = "newLinkFormat";
  private _value2: string | undefined;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  backup() {
    // Backup the original attachment folder path configuration
    // @ts-ignore - getConfig is not in the public API but is available internally
    this._value = this.vault.getConfig(this.key);
    // @ts-ignore - getConfig is not in the public API but is available internally
    this._value2 = this.vault.getConfig(this.key2);
    // 非 relative（相对路径） 及 shortest（最短路径），则设置为 relative
    // https://github.com/chenfeicqq/obsidian-attachment-manager/issues/4
    if (this._value2 !== "relative" && this._value2 !== "shortest") {
      // @ts-ignore - setConfig is not in the public API but is available internally
      this.vault.setConfig(this.key2, "relative");
    }
  }

  update(value: string) {
    // Update the attachment folder path to the specified value
    // This affects the default path shown in the paste image dialog
    // @ts-ignore - setConfig is not in the public API but is available internally
    this.vault.setConfig(this.key, value);
  }

  restore() {
    // Restore the original configuration when plugin unloads
    if (this._value !== undefined) {
      // @ts-ignore - setConfig is not in the public API but is available internally
      this.vault.setConfig(this.key, this._value);
    }
    if (this._value2 !== undefined) {
      // @ts-ignore - setConfig is not in the public API but is available internally
      this.vault.setConfig(this.key2, this._value2);
    }
  }
}
