// Giving tickets other ids: when a project's prefix changes, or a ticket moves to another
// project. Every table that names a ticket follows, the earlier id is kept as another name for
// the ticket, and earlier changes to it can no longer be undone, since they hold the earlier id.
import type { DatabaseSync } from "node:sqlite";

export function migrateAliases(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS ticket_aliases (old TEXT PRIMARY KEY, now TEXT NOT NULL)");
}

/** The id a ticket has now, when `id` is one it had before. Undefined if it never was one. */
export function aliasOf(db: DatabaseSync, id: string): string | undefined {
  const found = db.prepare("SELECT now FROM ticket_aliases WHERE old = ?").get(id) as
    | { now: string }
    | undefined;
  return found?.now;
}

const NAME = /^[a-z_]+$/;
/** The tables that have a column of this name. */
function tablesWith(db: DatabaseSync, column: string): string[] {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
    name: string;
  }[];
  return tables
    .map((t) => t.name)
    .filter((name) => NAME.test(name) && name !== "ticket_aliases")
    .filter((name) =>
      (db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).some(
        (c) => c.name === column,
      ),
    );
}

/** Changes whose rows hold `text` can no longer be undone. */
function seal(db: DatabaseSync, text: string): void {
  const like = `%${text.replace(/[%_\\]/g, "\\$&")}%`;
  db.prepare(
    "UPDATE changes SET touched = '[]', final = 1 WHERE final = 0 AND touched LIKE ? ESCAPE '\\'",
  ).run(like);
}

/**
 * Gives each ticket its new id, `[from, to]`. Runs inside the Call's transaction: the tables are
 * checked against each other only when it ends.
 */
export function rekey(db: DatabaseSync, pairs: [string, string][]): void {
  db.exec("PRAGMA defer_foreign_keys = ON");
  const tables = tablesWith(db, "ticket");
  for (const [from, to] of pairs) {
    seal(db, `"${from}"`);
    seal(db, `"${from}:`);
    db.prepare("UPDATE changes SET touched = '[]', final = 1 WHERE ticket = ?").run(from);
    for (const table of tables) {
      db.prepare(`UPDATE ${table} SET ticket = ? WHERE ticket = ?`).run(to, from);
    }
    // A label on a ticket is kept under the ticket's id and the label's.
    db.prepare("UPDATE ticket_labels SET id = ticket || ':' || label WHERE ticket = ?").run(to);
    db.prepare("UPDATE tickets SET id = ? WHERE id = ?").run(to, from);
    db.prepare("DELETE FROM ticket_aliases WHERE old = ?").run(to);
    db.prepare("UPDATE ticket_aliases SET now = ? WHERE now = ?").run(to, from);
    db.prepare("INSERT OR REPLACE INTO ticket_aliases (old, now) VALUES (?, ?)").run(from, to);
  }
}

/** Gives a project the id `to`, and each of its tickets the id that starts with it. */
export function reprefix(db: DatabaseSync, from: string, to: string): void {
  db.exec("PRAGMA defer_foreign_keys = ON");
  const tickets = db.prepare("SELECT id, number FROM tickets WHERE project = ?").all(from) as {
    id: string;
    number: number;
  }[];
  rekey(
    db,
    tickets.map((t) => [t.id, `${to}-${t.number}`]),
  );
  seal(db, `"${from}"`);
  for (const table of tablesWith(db, "project")) {
    db.prepare(`UPDATE ${table} SET project = ? WHERE project = ?`).run(to, from);
  }
  db.prepare("UPDATE projects SET id = ? WHERE id = ?").run(to, from);
  // The project's ticket numbers go on from where they were, past any an earlier project left.
  const counter = (name: string) =>
    (
      db.prepare("SELECT value FROM counters WHERE name = ?").get(name) as
        | { value: number }
        | undefined
    )?.value ?? 0;
  const next = Math.max(counter(`ticket:${from}`), counter(`ticket:${to}`));
  db.prepare("DELETE FROM counters WHERE name IN (?, ?)").run(`ticket:${from}`, `ticket:${to}`);
  if (next > 0) {
    db.prepare("INSERT INTO counters (name, value) VALUES (?, ?)").run(`ticket:${to}`, next);
  }
  // An intake step set to run on this project's items follows it.
  const steps = db.prepare("SELECT id, condition FROM inbox_steps").all() as {
    id: string;
    condition: string | null;
  }[];
  for (const step of steps) {
    if (!step.condition) continue;
    const condition = JSON.parse(step.condition) as Record<string, string>;
    if (condition.project !== from) continue;
    db.prepare("UPDATE inbox_steps SET condition = ? WHERE id = ?").run(
      JSON.stringify({ ...condition, project: to }),
      step.id,
    );
  }
}
