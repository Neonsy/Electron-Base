import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import tsconfigPaths from 'vite-tsconfig-paths';

import { createPreloadBuildConfig } from './electron/main/preload/buildConfig';

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
    plugins: [
        devtools(),
        tsconfigPaths(),
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
        }),

        react({
            babel: {
                plugins: [['babel-plugin-react-compiler']],
            },
        }),
        tailwindcss(),
        ...electron([
            {
                entry: 'electron/main/index.ts',
                vite: {
                    plugins: [tsconfigPaths()],
                    build: {
                        rollupOptions: {
                            external: electronMainExternalModules,
                        },
                    },
                },
            },
            buildPreloadOptions('electron/main/preload/index.ts', 'mainWindow'),
        ]),
    ],
});
