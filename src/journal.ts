// The record of changes. Every write goes through `rows`, which remembers
// what each row was before and after; `record` stores those with who made
// the change. Undo puts the rows back, and is itself a recorded change.
import type { DatabaseSync } from "node:sqlite";
import { Refusal } from "./refusal.js";

export type Value = string | number | null;
export type Row = Record<string, Value>;

/** One row a change touched. `before` is null for a new row, `after` for a removed one. */
type Touched = { table: string; id: string; before: Row | null; after: Row | null };

/** One recorded change, as the page and agents see it. */
export type ChangeEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  summary: string;
  ticket: string | null;
  /** The change this one undid, or null. */
  undoes: string | null;
  /** The change that undid this one, or null. */
  undoneBy: string | null;
  /** False for a change that cannot be undone, such as deleting forever. */
  undoable: boolean;
};

/** Reads and writes rows by id, remembering each write for the change being made. */
export type Rows = {
  get(table: string, id: string): Row | undefined;
  insert(table: string, row: Row & { id: string }): void;
  update(table: string, id: string, patch: Row): void;
  remove(table: string, id: string): void;
};

export type Journal = {
  rows: Rows;
  /** How many row writes are waiting to be recorded. */
  pending(): number;
  /** Stores everything written through `rows` since the last record as one change. */
  record(change: {
    actor: string;
    action: string;
    summary: string;
    ticket?: string | undefined;
    /** True for a change that cannot be undone. */
    final?: boolean;
  }): string;
  list(filter?: { ticket?: string | undefined; limit?: number | undefined }): ChangeEntry[];
  /** Puts back what a change changed. Refused if those rows have changed since. */
  undo(id: string, actor: string): ChangeEntry;
  /** Forgets the rows of every change about a ticket: they can no longer be undone. */
  seal(ticket: string): void;
};

const NAME = /^[a-z_]+$/;
const safe = (name: string) => {
  if (!NAME.test(name)) throw new Error(`not a table or column name: ${name}`);
  return name;
};

export function migrateJournal(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, summary TEXT NOT NULL, ticket TEXT, touched TEXT NOT NULL, final INTEGER NOT NULL DEFAULT 0, undoes INTEGER, undone_by INTEGER)",
  );
  db.exec("CREATE INDEX IF NOT EXISTS changes_ticket ON changes (ticket)");
}

type Stored = {
  seq: number;
  at: string;
  actor: string;
  action: string;
  summary: string;
  ticket: string | null;
  touched: string;
  final: number;
  undoes: number | null;
  undone_by: number | null;
};

const ref = (seq: number | null) => (seq === null ? null : `h${seq}`);
const entry = (s: Stored): ChangeEntry => ({
  id: `h${s.seq}`,
  at: s.at,
  actor: s.actor,
  action: s.action,
  summary: s.summary,
  ticket: s.ticket,
  undoes: ref(s.undoes),
  undoneBy: ref(s.undone_by),
  undoable: s.final === 0 && s.undone_by === null,
});

export function openJournal(db: DatabaseSync, now: () => number): Journal {
  let touched: Touched[] = [];

  const get = (table: string, id: string) =>
    db.prepare(`SELECT * FROM ${safe(table)} WHERE id = ?`).get(id) as Row | undefined;

  const rows: Rows = {
    get,
    insert: (table, row) => {
      const columns = Object.keys(row).map(safe);
      db.prepare(
        `INSERT INTO ${safe(table)} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      ).run(...Object.values(row));
      touched.push({ table, id: row.id, before: null, after: get(table, row.id) as Row });
    },
    update: (table, id, patch) => {
      const current = get(table, id);
      if (!current) throw new Error(`no ${table} row ${id}`);
      const before: Row = {};
      const after: Row = {};
      for (const [column, value] of Object.entries(patch)) {
        if (current[safe(column)] === value) continue;
        before[column] = current[column] as Value;
        after[column] = value;
      }
      const columns = Object.keys(after);
      if (columns.length === 0) return;
      db.prepare(
        `UPDATE ${safe(table)} SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
      ).run(...Object.values(after), id);
      touched.push({ table, id, before, after });
    },
    remove: (table, id) => {
      const current = get(table, id);
      if (!current) return;
      db.prepare(`DELETE FROM ${safe(table)} WHERE id = ?`).run(id);
      touched.push({ table, id, before: current, after: null });
    },
  };

  const record: Journal["record"] = (change) => {
    const result = db
      .prepare(
        "INSERT INTO changes (at, actor, action, summary, ticket, touched, final) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        new Date(now()).toISOString(),
        change.actor,
        change.action,
        change.summary,
        change.ticket ?? null,
        JSON.stringify(change.final ? [] : touched),
        change.final ? 1 : 0,
      );
    touched = [];
    return `h${result.lastInsertRowid}`;
  };

  const stored = (id: string) =>
    db.prepare("SELECT * FROM changes WHERE seq = ?").get(Number(id.slice(1))) as
      | Stored
      | undefined;

  const same = (a: Row, b: Row) =>
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).every(([key, value]) => b[key] === value);

  return {
    rows,
    pending: () => touched.length,
    record,
    list: (filter = {}) => {
      const found = (
        filter.ticket === undefined
          ? db.prepare("SELECT * FROM changes ORDER BY seq DESC LIMIT ?").all(filter.limit ?? 100)
          : db
              .prepare("SELECT * FROM changes WHERE ticket = ? ORDER BY seq DESC LIMIT ?")
              .all(filter.ticket, filter.limit ?? 100)
      ) as Stored[];
      return found.reverse().map(entry);
    },
    undo: (id, actor) => {
      const change = /^h\d+$/.test(id) ? stored(id) : undefined;
      if (!change) throw new Refusal("unknown-change", `No change has id ${id}.`);
      if (change.final) throw new Refusal("final", `${id} cannot be undone.`);
      if (change.undone_by !== null) {
        throw new Refusal("already-undone", `${id} was already undone by h${change.undone_by}.`);
      }
      const stale = new Refusal(
        "changed-since",
        `Something ${id} changed has changed again since. Undo the later change first.`,
      );
      const steps = (JSON.parse(change.touched) as Touched[]).reverse();
      for (const step of steps) {
        const current = get(step.table, step.id);
        if (step.after === null) {
          if (current) throw stale;
        } else if (!current) {
          throw stale;
        } else if (step.before === null) {
          if (!same(current, step.after)) throw stale;
        } else if (Object.entries(step.after).some(([key, value]) => current[key] !== value)) {
          throw stale;
        }
      }
      try {
        for (const step of steps) {
          if (step.after === null) rows.insert(step.table, step.before as Row & { id: string });
          else if (step.before === null) rows.remove(step.table, step.id);
          else rows.update(step.table, step.id, step.before);
        }
      } catch (error) {
        if (error instanceof Refusal) throw error;
        throw new Refusal("in-use", `${id} cannot be undone: other things now depend on it.`);
      }
      const undo = record({
        actor,
        action: "history.change-undo",
        summary: change.summary.startsWith("undid: ")
          ? `redid: ${change.summary.slice(7)}`
          : `undid: ${change.summary.replace(/^redid: /, "")}`,
        ticket: change.ticket ?? undefined,
      });
      const seq = Number(undo.slice(1));
      db.prepare("UPDATE changes SET undoes = ? WHERE seq = ?").run(change.seq, seq);
      db.prepare("UPDATE changes SET undone_by = ? WHERE seq = ?").run(seq, change.seq);
      // Undoing an undo makes the first change undoable again.
      if (change.undoes !== null) {
        db.prepare("UPDATE changes SET undone_by = NULL WHERE seq = ?").run(change.undoes);
      }
      return entry(stored(undo) as Stored);
    },
    seal: (ticket) => {
      db.prepare("UPDATE changes SET touched = '[]', final = 1 WHERE ticket = ?").run(ticket);
    },
  };
}
