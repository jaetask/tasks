// Ids are a short prefix and a counter, such as c12. A counter never goes
// back, so an id is never used twice, even after an undo.
import type { DatabaseSync } from "node:sqlite";

export function migrateIds(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL)");
}

/** The next number of the counter `name`, from 1. */
export function nextNumber(db: DatabaseSync, name: string): number {
  const row = db
    .prepare(
      "INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT (name) DO UPDATE SET value = value + 1 RETURNING value",
    )
    .get(name) as { value: number };
  return row.value;
}

export const nextId = (db: DatabaseSync, prefix: string) => `${prefix}${nextNumber(db, prefix)}`;
