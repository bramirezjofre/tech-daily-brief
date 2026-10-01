import eslintPluginAstro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
  },
  { rules: { "no-console": "error" } },
  {
    // CLI/tooling scripts intentionally write to stdout/stderr; the
    // application code (`.astro`, `.ts`, `.tsx`) keeps `no-console` enforced.
    files: [
      "scripts/**/*.mjs",
      "scripts/**/*.cjs",
      "*.cjs",
    ],
    rules: { "no-console": "off" },
  },
  { ignores: ["dist/**", ".astro/**", "public/pagefind/**"] },
];
