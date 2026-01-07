import globals from "globals";
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js", "**/*.jsx"],
        ignores: ["cypress/**"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                AudioController: "readonly",
                SoundButton: "readonly",
                VolumeSlider: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["error", {
                "argsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_",
                "varsIgnorePattern": "^_"
            }]
        }
    },
    {
        files: ["cypress/**/*.js"],
        languageOptions: {
             globals: {
                 ...globals.node,
                 cy: "readonly",
                 Cypress: "readonly",
                 describe: "readonly",
                 beforeEach: "readonly",
                 it: "readonly",
                 expect: "readonly"
             }
        }
    }
];
