import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { openLocalDatabase } from './database';

describe('openLocalDatabase', () => {
    it('opens a hardened in-memory database and executes SQL through Drizzle', () => {
        const database = openLocalDatabase(':memory:');

        try {
            expect(database.sqlite.prepare('PRAGMA foreign_keys').get()).toMatchObject({ foreign_keys: 1 });

            expect(() => {
                database.sqlite.loadExtension('extensions-are-disabled');
            }).toThrow();

            database.db.run(sql`
                CREATE TABLE scaffold_check (
                    id INTEGER PRIMARY KEY,
                    label TEXT NOT NULL
                ) STRICT
            `);
            database.db.run(sql`INSERT INTO scaffold_check (label) VALUES (${'ready'})`);

            expect(database.db.all<{ id: number; label: string }>(sql`SELECT id, label FROM scaffold_check`)).toEqual([
                { id: 1, label: 'ready' },
            ]);
        } finally {
            database.close();
        }
    });
});
