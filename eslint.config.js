import tsparser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
        ecmaVersion: 2020,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        NodeJS: "readonly",
      },
    },
    plugins: {
      obsidianmd: obsidianmd,
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Obsidian MD specific rules (copied from eslint-plugin-obsidianmd recommended config)
      "obsidianmd/commands/no-command-in-command-id": "error",
      "obsidianmd/commands/no-command-in-command-name": "error",
      "obsidianmd/commands/no-default-hotkeys": "error",
      "obsidianmd/commands/no-plugin-id-in-command-id": "error",
      "obsidianmd/commands/no-plugin-name-in-command-name": "error",
      "obsidianmd/settings-tab/no-manual-html-headings": "error",
      "obsidianmd/settings-tab/no-problematic-settings-headings": "error",
      "obsidianmd/vault/iterate": "error",
      "obsidianmd/detach-leaves": "error",
      "obsidianmd/hardcoded-config-path": "error",
      "obsidianmd/no-forbidden-elements": "error",
      "obsidianmd/no-plugin-as-component": "error",
      "obsidianmd/no-sample-code": "error",
      "obsidianmd/no-tfile-tfolder-cast": "error",
      "obsidianmd/no-view-references-in-plugin": "error",
      "obsidianmd/no-static-styles-assignment": "error",
      "obsidianmd/object-assign": "error",
      "obsidianmd/platform": "error",
      "obsidianmd/prefer-file-manager-trash-file": "warn",
      "obsidianmd/prefer-abstract-input-suggest": "error",
      "obsidianmd/regex-lookbehind": "error",
      "obsidianmd/sample-names": "off",
      "obsidianmd/validate-manifest": "error",
      "obsidianmd/validate-license": ["error"],
      "obsidianmd/ui/sentence-case": ["error", { enforceCamelCaseLower: true }],

      // General Typescript Rules
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: ["esbuild.config.mjs", "inspect_config.mjs"],
  }
];
