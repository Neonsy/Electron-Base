import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.spec.ts',
    fullyParallel: false,
    workers: 1,
    timeout: 45_000,
    expect: {
        timeout: 10_000,
    },
    forbidOnly: Boolean(process.env['CI']),
    retries: process.env['CI'] ? 2 : 0,
    outputDir: 'test-results/playwright',
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
});
