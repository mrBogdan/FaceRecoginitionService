import globals from "globals";
import pluginJs from "@eslint/js";
import jestPlugin from "eslint-plugin-jest";


/** @type {import('eslint').Linter.Config[]} */
export default [{
  languageOptions: { globals: globals.node }},
  {
    files: ["**/*.test.js"],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
    },
  },
  pluginJs.configs.recommended,
];
