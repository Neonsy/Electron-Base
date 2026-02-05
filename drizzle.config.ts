import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'sqlite',
    out: './electron/main/data/migrations',
    schema: './electron/main/data/schema.ts',
    strict: true,
    verbose: true,
});
