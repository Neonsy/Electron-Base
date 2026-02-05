import { builtinModules } from 'node:module';
import tsconfigPaths from 'vite-tsconfig-paths';

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
        plugins: [tsconfigPaths()],
        build: {
            outDir,
            target: 'node20',
            minify: false,
            reportCompressedSize: false,
            lib: {
                entry,
                formats: sandboxedPreloadFormats,
                fileName: () => `${outputFileName}.cjs`,
            },
            rollupOptions: {
                external: ['electron', ...builtinExternalModules],
                output: {
                    exports: 'named',
                    format: 'cjs',
                    inlineDynamicImports: true,
                },
            },
        },
    };
}
