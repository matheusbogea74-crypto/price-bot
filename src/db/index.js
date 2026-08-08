import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config/index.js';

let db;

/**
 * Returns the shared SQLite connection, opening it (and creating the parent
 * directory) on first call. Safe to call from anywhere — the connection is a
 * singleton for the process's lifetime. Run `npm run init-db` separately to
 * create/update the schema; this function does not run migrations itself.
 *
 * @returns {import('node:sqlite').DatabaseSync}
 */
export function getDb() {
  if (db) return db;

  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  return db;
}

/**
 * True if `err` is a SQLite UNIQUE-constraint violation (e.g. inserting a
 * product URL that's already tracked) — use this to distinguish "already
 * exists" from a genuine database error.
 */
export function isUniqueConstraintError(err) {
  return err.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(err.message);
}
