const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest, // Assuming Jest is used for testing
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn", // Warn for unused variables
      "@typescript-eslint/no-explicit-any": "off", // Allow 'any' for now, can be tightened later
      "no-console": "warn", // Warn about console.log
    },
  },
);
