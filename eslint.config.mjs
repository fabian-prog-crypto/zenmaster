import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "artifacts/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".worktrees/**"
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: {
        chrome: "readonly",
        document: "readonly",
        window: "readonly",
        location: "readonly",
        MutationObserver: "readonly",
        Element: "readonly",
        HTMLElement: "readonly",
        HTMLVideoElement: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        Node: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off"
    }
  },
  {
    files: ["scripts/**/*.mjs", "*.config.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly"
      }
    }
  }
);
