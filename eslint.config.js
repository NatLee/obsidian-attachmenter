import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
  // Includes ESLint core, typescript-eslint type-checked rules and Obsidian-specific rules.
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Popout-window compatibility checks used by the Obsidian plugin review bot.
      "obsidianmd/prefer-active-doc": "warn",
      "obsidianmd/ui/sentence-case": ["warn", { enforceCamelCaseLower: true }],
      "obsidianmd/sample-names": "off",
    },
  },
  {
    ignores: ["main.js", "node_modules/**", "esbuild.config.mjs"],
  },
]);
