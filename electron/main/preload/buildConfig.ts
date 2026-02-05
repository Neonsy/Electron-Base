import { builtinModules } from 'node:module';

import type { LibraryFormats, UserConfig } from 'vite';

const sandboxedPreloadFormats: LibraryFormats[] = ['cjs'];
const builtinExternalModules = builtinModules
    .filter((moduleName) => !moduleName.startsWith('_'))
    .flatMap((moduleName) => [moduleName, `node:${moduleName}`]);

export function createPreloadBuildConfig(
    entry: string,
    outputFileName: string,
    options?: { outDir?: string }
): UserConfig {
    const outDir = options?.outDir ?? 'dist-electron';

    return {
        resolve: {
            tsconfigPaths: true,
        },
        build: {
            outDir,
            target: 'node24',
            minify: false,
            reportCompressedSize: false,
            lib: {
                entry,
                formats: sandboxedPreloadFormats,
                fileName: () => `${outputFileName}.cjs`,
            },
            rolldownOptions: {
                external: ['electron', ...builtinExternalModules],
                output: {
                    exports: 'named',
                    format: 'cjs',
                    codeSplitting: false,
                },
            },
        },
    };
}
