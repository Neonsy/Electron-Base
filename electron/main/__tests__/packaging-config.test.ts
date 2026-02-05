import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('desktop build config', () => {
    it('keeps package main pointed at the Electron main bundle entry', () => {
        const packagePath = path.join(process.cwd(), 'package.json');
        const contents = JSON.parse(readFileSync(packagePath, 'utf8')) as {
            main: string;
        };

        expect(contents.main).toBe('dist-electron/index.js');
    });

    it('uses an explicit sandbox-safe preload bundle contract', () => {
        const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
        const preloadBuildConfigPath = path.join(process.cwd(), 'electron', 'main', 'preload', 'buildConfig.ts');
        const preloadPathResolverPath = path.join(process.cwd(), 'electron', 'main', 'window', 'preloadPaths.ts');
        const viteConfigContents = readFileSync(viteConfigPath, 'utf8');
        const preloadBuildConfigContents = readFileSync(preloadBuildConfigPath, 'utf8');
        const preloadPathResolverContents = readFileSync(preloadPathResolverPath, 'utf8');

        expect(viteConfigContents).toContain("buildPreloadOptions('electron/main/preload/index.ts', 'mainWindow')");
        expect(viteConfigContents).toContain('createPreloadBuildConfig');
        expect(preloadBuildConfigContents).toContain('formats: sandboxedPreloadFormats');
        expect(preloadBuildConfigContents).toContain("format: 'cjs'");
        expect(preloadBuildConfigContents).toContain('inlineDynamicImports: true');
        expect(preloadPathResolverContents).toContain("MAIN_WINDOW_PRELOAD_BUNDLE_NAME = 'mainWindow.cjs'");
    });

    it('uses a CommonJS-safe electron-updater import pattern', () => {
        const updaterPath = path.join(process.cwd(), 'electron', 'main', 'updates', 'updater.ts');
        const contents = readFileSync(updaterPath, 'utf8');

        expect(contents).toContain("import electronUpdater, { type ProgressInfo } from 'electron-updater';");
        expect(contents).toContain('return electronUpdater.autoUpdater;');
        expect(contents).not.toContain("import { autoUpdater, type ProgressInfo } from 'electron-updater';");
    });
});
