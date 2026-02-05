import js from '@eslint/js';
import queryPlugin from '@tanstack/eslint-plugin-query';
import vitestPlugin from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import nPlugin from 'eslint-plugin-n';
import noSecrets from 'eslint-plugin-no-secrets';
import playwrightPlugin from 'eslint-plugin-playwright';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const javascriptGlobs = ['**/*.{js,jsx,mjs,cjs,ts,tsx}'];

const rendererGlobs = ['src/**/*.{js,jsx,ts,tsx}'];
const rendererTypeScriptGlobs = ['src/**/*.{ts,tsx}'];

const nodeGlobs = [
    'electron/**/*.{js,mjs,cjs,ts,tsx}',
    'e2e/**/*.{js,mjs,cjs,ts,tsx}',
    'scripts/**/*.{js,mjs,cjs,ts,tsx}',
    'drizzle.config.ts',
    'electron-builder.config.ts',
    'eslint.config.js',
    'playwright.config.ts',
    'prettier.config.js',
    'vite.config.ts',
    'vitest.config.ts',
];

const nodeTypeScriptGlobs = [
    'electron/**/*.{ts,tsx}',
    'e2e/**/*.ts',
    'scripts/**/*.ts',
    'drizzle.config.ts',
    'electron-builder.config.ts',
    'playwright.config.ts',
    'vite.config.ts',
    'vitest.config.ts',
];

const typeCheckedGlobs = [...rendererTypeScriptGlobs, ...nodeTypeScriptGlobs];

const vitestGlobs = [
    'electron/**/*.{test,spec}.ts',
    'src/**/*.{test,spec}.{ts,tsx}',
    'electron/**/__tests__/**/*.{ts,tsx}',
    'src/**/__tests__/**/*.{ts,tsx}',
];

const playwrightGlobs = ['e2e/**/*.{test,spec}.{ts,tsx}'];

const importOrderRule = [
    'error',
    {
        groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index'], ['type']],
        pathGroups: [
            { pattern: '@/web/**', group: 'internal', position: 'before' },
            { pattern: '@/app/**', group: 'internal', position: 'before' },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
    },
];

const noRestrictedImportsRule = [
    'error',
    {
        patterns: [
            {
                group: ['../*'],
                message: 'Use the @/web or @/app alias for imports outside the current directory.',
            },
        ],
    },
];

function importResolver(project) {
    return {
        'import/resolver': {
            typescript: { project: [project] },
            node: true,
        },
    };
}

export default defineConfig(
    globalIgnores([
        '.codex-artifacts/**',
        '.tmp/**',
        'coverage/**',
        'dist/**',
        'dist-electron/**',
        'playwright-report/**',
        'release/**',
        'src/routeTree.gen.ts',
        'test-results/**',
    ]),

    {
        name: 'project/javascript',
        files: javascriptGlobs,
        extends: [js.configs.recommended],
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
        },
    },

    {
        name: 'project/typescript',
        files: typeCheckedGlobs,
        extends: [tseslint.configs.strictTypeChecked],
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.renderer.json', './tsconfig.node.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
            ],
        },
    },

    {
        name: 'project/renderer',
        files: rendererGlobs,
        extends: [
            importPlugin.flatConfigs.recommended,
            react.configs.flat.recommended,
            react.configs.flat['jsx-runtime'],
            reactHooks.configs.flat['recommended-latest'],
            jsxA11y.flatConfigs.recommended,
            queryPlugin.configs['flat/recommended-strict'],
            reactRefresh.configs.vite,
        ],
        plugins: {
            'no-secrets': noSecrets,
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.browser,
        },
        settings: {
            react: { version: 'detect' },
            ...importResolver('./tsconfig.renderer.json'),
        },
        rules: {
            'react/jsx-key': ['error', { checkFragmentShorthand: true }],
            'react/jsx-no-useless-fragment': 'warn',
            'react/no-unstable-nested-components': 'warn',
            'import/newline-after-import': 'error',
            'import/no-unresolved': 'error',
            'import/order': importOrderRule,
            'no-alert': 'error',
            'no-restricted-imports': noRestrictedImportsRule,
            'no-secrets/no-secrets': 'warn',
        },
    },

    {
        name: 'project/renderer-typescript',
        files: rendererTypeScriptGlobs,
        extends: [importPlugin.flatConfigs.typescript],
        rules: {
            'react/prop-types': 'off',
        },
    },

    {
        name: 'project/node',
        files: nodeGlobs,
        extends: [
            importPlugin.flatConfigs.recommended,
            nPlugin.configs['flat/recommended-module'],
            securityPlugin.configs.recommended,
        ],
        plugins: {
            'no-secrets': noSecrets,
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node,
        },
        settings: importResolver('./tsconfig.node.json'),
        rules: {
            'import/newline-after-import': 'error',
            'import/no-unresolved': 'error',
            'import/order': importOrderRule,
            'no-restricted-imports': noRestrictedImportsRule,
            'no-secrets/no-secrets': 'warn',
            // eslint-plugin-import owns resolution because it understands the
            // repository's TypeScript aliases and package export maps.
            'n/no-missing-import': 'off',
        },
    },

    {
        name: 'project/node-typescript',
        files: nodeTypeScriptGlobs,
        extends: [importPlugin.flatConfigs.typescript],
    },

    {
        name: 'project/commonjs',
        files: ['**/*.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
        },
    },

    {
        name: 'project/vitest',
        files: vitestGlobs,
        extends: [vitestPlugin.configs.recommended],
        languageOptions: {
            // Vitest runs this repository's tests in Node, while test APIs are
            // imported explicitly instead of being exposed as globals.
            globals: globals.node,
        },
    },

    {
        name: 'project/playwright',
        files: playwrightGlobs,
        extends: [playwrightPlugin.configs['flat/recommended']],
    },

    {
        name: 'project/exception-update-channel-storage',
        // The caller anchors this preference path below Electron userData, and
        // the version expression receives only the installed package version.
        files: ['electron/main/updates/channel.ts'],
        rules: {
            'security/detect-non-literal-fs-filename': 'off',
            'security/detect-unsafe-regex': 'off',
        },
    },

    {
        name: 'project/exception-electron-updater-commonjs-interop',
        // electron-updater's CommonJS package must be loaded through its
        // default namespace in the bundled Electron main process.
        files: ['electron/main/updates/updater.ts'],
        rules: {
            'import/no-named-as-default-member': 'off',
        },
    },

    {
        name: 'project/exception-node-sqlite',
        // Node 24.18 provides node:sqlite at Stability 1.2 (release candidate).
        // Ignore that one reviewed built-in without allowing all experimental APIs.
        files: ['electron/main/data/database.ts'],
        rules: {
            'n/no-unsupported-features/node-builtins': ['error', { ignores: ['sqlite'] }],
        },
    },

    {
        name: 'project/exception-csp-map',
        // Both objects are closed, internal CSP directive maps; their keys
        // cannot originate in renderer input or an external policy document.
        files: ['electron/main/security/cspPolicy.ts'],
        rules: {
            'security/detect-object-injection': 'off',
        },
    },

    {
        name: 'project/exception-builder-metadata',
        // This fixed URL is resolved relative to the checked-in config module.
        files: ['electron-builder.config.ts'],
        rules: {
            'security/detect-non-literal-fs-filename': 'off',
        },
    },

    {
        name: 'project/exception-release-helpers',
        // These scripts constrain paths to workflow-owned staging folders;
        // environment names are fixed call-site constants, and dynamic regex
        // inputs are validated SemVer values and escaped before construction.
        files: [
            'scripts/release/extract-release-notes.mjs',
            'scripts/release/prepare-assets.mjs',
            'scripts/release/prepare-release.mjs',
        ],
        rules: {
            'security/detect-non-literal-fs-filename': 'off',
            'security/detect-non-literal-regexp': 'off',
            'security/detect-object-injection': 'off',
        },
    },

    {
        name: 'project/exception-release-version-regex',
        // The anchored literal accepts only the documented stable/beta SemVer forms.
        files: ['scripts/release/prepare-release.mjs'],
        rules: {
            'security/detect-unsafe-regex': 'off',
        },
    },

    {
        name: 'project/exception-release-manifest-regex',
        // The anchored line parser reads the bounded update manifest generated
        // by electron-builder; its repeated groups cannot consume one another.
        files: ['scripts/release/prepare-assets.mjs'],
        rules: {
            'security/detect-unsafe-regex': 'off',
        },
    },

    {
        name: 'project/exception-update-channel-test-fixtures',
        // Every dynamic path is rooted in the test's freshly-created temporary directory.
        files: ['electron/main/updates/channel.test.ts'],
        rules: {
            'security/detect-non-literal-fs-filename': 'off',
        },
    },

    // Formatting-rule disables must remain last so ecosystem presets cannot
    // re-enable rules that conflict with the repository's Prettier config.
    prettierConfig
);
