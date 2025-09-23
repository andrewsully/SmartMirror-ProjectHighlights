import eslintPluginJs from "@eslint/js";
import eslintPluginJsonc from "eslint-plugin-jsonc";
import eslintPluginStylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import {flatConfigs as importConfigs} from "eslint-plugin-import-x";

const config = [
  eslintPluginJs.configs.all,
  eslintPluginStylistic.configs.all,
  importConfigs.recommended,
  ...eslintPluginJsonc.configs["flat/recommended-with-jsonc"],
  {
    "ignores": ["package-lock.json"]
  },
  {
    "files": ["**/*.js"],
    "languageOptions": {
      "globals": {
        ...globals.browser,
        ...globals.node,
        "moment": "readonly"
      },
      "sourceType": "commonjs"
    },
    "rules": {
      "@stylistic/dot-location": ["error", "property"],
      "@stylistic/function-call-argument-newline": ["error", "consistent"],
      "@stylistic/function-paren-newline": ["error", "consistent"],
      "@stylistic/implicit-arrow-linebreak": "off",
      "@stylistic/indent": ["error", 2],
      "@stylistic/multiline-comment-style": "off",
      "@stylistic/multiline-ternary": "off",
      "@stylistic/newline-per-chained-call": "off",
      "@stylistic/no-extra-parens": ["error", "functions"],
      "@stylistic/nonblock-statement-body-position": "off",
      "@stylistic/padded-blocks": ["error", "never"],
      "@stylistic/quote-props": ["error", "consistent"],
      "camelcase": ["error", {"allow": ["CMD_changeScene", "ms_busystatus"]}],
      "capitalized-comments": "off",
      "curly": "off",
      "default-case": "off",
      "id-length": ["warn", {"exceptions": ["a", "b", "c", "e", "f", "i", "j", "k", "l", "p", "r", "t", "v"]}],
      "init-declarations": "off",
      "max-lines": ["warn", 550],
      "max-lines-per-function": ["warn", 150],
      "max-params": ["warn", 5],
      "max-statements": ["warn", 65],
      "no-inline-comments": "off",
      "no-magic-numbers": "off",
      "no-param-reassign": [
        "error",
        {
          "ignorePropertyModificationsFor": [
            "arrs",
            "calendar",
            "dom",
            "e",
            "payload",
            "slotDom",
            "targetDom"
          ],
          "props": true
        }
      ],
      "no-plusplus": ["error", {"allowForLoopAfterthoughts": true}],
      "no-ternary": "off",
      "one-var": "off",
      "prefer-destructuring": "off",
      "sort-keys": "off",
      "strict": "off"
    }
  },
  {
    "files": ["**/*.mjs"],
    "languageOptions": {
      "ecmaVersion": "latest",
      "globals": {
        ...globals.node
      },
      "sourceType": "module"
    },
    "rules": {
      "@stylistic/array-element-newline": ["error", "consistent"],
      "@stylistic/indent": ["error", 2],
      "no-magic-numbers": "off",
      "one-var": "off"
    }
  }
];

export default config;
