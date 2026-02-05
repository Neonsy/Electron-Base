import { drizzle, type NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { DatabaseSync } from 'node:sqlite';

import type { PathLike } from 'node:fs';

export interface LocalDatabase {
    /** The Drizzle query interface backed by this connection. */
    db: NodeSQLiteDatabase;
    /** The native connection for SQLite features that Drizzle does not expose. */
    sqlite: DatabaseSync;
    /** Close the connection. Safe to call more than once. */
    close: () => void;
}

/**
 * Open an explicitly requested local database.
 *
 * Nothing imports or calls this helper during normal template startup, so the base
 * template does not create a database file. The caller owns the file location and
 * must close the returned connection during application shutdown.
 */
export function openLocalDatabase(path: PathLike): LocalDatabase {
    const sqlite = new DatabaseSync(path, {
        allowExtension: false,
        defensive: true,
        enableForeignKeyConstraints: true,
        timeout: 5_000,
    });

    try {
        sqlite.exec('PRAGMA journal_mode = WAL');
    } catch (error) {
        sqlite.close();
        throw error;
    }

    const db = drizzle({ client: sqlite });
    let closed = false;

    return {
        db,
        sqlite,
        close: () => {
            if (closed) return;

            sqlite.close();
            closed = true;
        },
    };
}
