import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';

import { createPreloadBuildConfig } from './electron/main/preload/buildConfig.ts';

const electronMainExternalModules = [
    'electron',
    'electron-updater',
    ...builtinModules
        .filter((moduleName) => !moduleName.startsWith('_'))
        .flatMap((moduleName) => [moduleName, `node:${moduleName}`]),
];

function buildPreloadOptions(input: string, outputFileName: string) {
    return {
        onstart({ reload }: { reload: () => void }) {
            reload();
        },
        vite: createPreloadBuildConfig(input, outputFileName),
    };
}

// https://vite.dev/config/
export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        watch: {
            // Test runs and packaging write Electron profiles and installers here. Watching them can
            // crash the dev server on locked Chromium cache files.
            ignored: ['**/test-results/**', '**/playwright-report/**', '**/release/**', '**/.tmp/**'],
        },
    },
    plugins: [
        devtools(),
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
        }),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwindcss(),
        ...electron([
            {
                entry: 'electron/main/index.ts',
                vite: {
                    resolve: {
                        tsconfigPaths: true,
                    },
                    build: {
                        rolldownOptions: {
                            external: electronMainExternalModules,
                        },
                    },
                },
            },
            buildPreloadOptions('electron/main/preload/index.ts', 'mainWindow'),
        ]),
    ],
});
