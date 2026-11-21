import type { DatabaseSync } from "node:sqlite";

export function migrateIds(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL)");
}

export function nextNumber(db: DatabaseSync, name: string): number {
  const row = db
    .prepare(
      "INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT (name) DO UPDATE SET value = value + 1 RETURNING value",
    )
    .get(name) as { value: number };
  return row.value;
}

export const nextId = (db: DatabaseSync, prefix: string) => `${prefix}${nextNumber(db, prefix)}`;
