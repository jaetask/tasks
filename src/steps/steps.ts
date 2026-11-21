import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { nextId } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const StepNote = z.object({
  id: z.string(),
  text: z.string(),
  at: z.string(),
  by: z.string(),
  byName: z.string(),
});
export type StepNote = z.infer<typeof StepNote>;

export const TicketStep = z.object({
  id: z.string(),
  ticket: z.string(),
  title: z.string(),
  done: z.boolean(),
  notes: z.array(StepNote).describe("What was checked or found, oldest first."),
});
export type TicketStep = z.infer<typeof TicketStep>;

export type TicketSteps = {
  get(id: string): TicketStep;
  list(ticket: string): TicketStep[];
  count(ticket: string): { done: number; total: number };
  add(ticket: string, title: string): TicketStep;
  rename(id: string, title: string): TicketStep;
  setDone(id: string, done: boolean): TicketStep;
  note(id: string, by: string, at: string, text: string): TicketStep;
  move(id: string, before?: string): TicketStep[];
  remove(id: string): TicketStep;
  purge(ticket: string): void;
};

export function migrateSteps(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS ticket_steps (id TEXT PRIMARY KEY, ticket TEXT NOT NULL REFERENCES tickets (id), position INTEGER NOT NULL, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS ticket_step_notes (id TEXT PRIMARY KEY, step TEXT NOT NULL REFERENCES ticket_steps (id), text TEXT NOT NULL, at TEXT NOT NULL, by TEXT NOT NULL)",
  );
}

type StepRow = { id: string; ticket: string; position: number; title: string; done: number };
type NoteRow = { id: string; step: string; text: string; at: string; by: string };

export function sqliteSteps(
  db: DatabaseSync,
  rows: Rows,
  nameOf: (actor: string) => string,
): TicketSteps {
  const stepRows = (ticket: string) =>
    db
      .prepare("SELECT * FROM ticket_steps WHERE ticket = ? ORDER BY position")
      .all(ticket) as StepRow[];
  const toStep = (r: StepRow): TicketStep => ({
    id: r.id,
    ticket: r.ticket,
    title: r.title,
    done: r.done === 1,
    notes: (
      db
        .prepare("SELECT * FROM ticket_step_notes WHERE step = ? ORDER BY rowid")
        .all(r.id) as NoteRow[]
    ).map((n) => ({ id: n.id, text: n.text, at: n.at, by: n.by, byName: nameOf(n.by) })),
  });
  const row = (id: string) => {
    const found = db.prepare("SELECT * FROM ticket_steps WHERE id = ?").get(id) as
      | StepRow
      | undefined;
    if (!found) throw new Refusal("unknown-step", `No ticket step has id ${id}.`);
    return found;
  };
  const get = (id: string) => toStep(row(id));
  const list = (ticket: string) => stepRows(ticket).map(toStep);
  const order = (ids: string[]) => {
    for (const [i, id] of ids.entries()) rows.update("ticket_steps", id, { position: i + 1 });
  };

  return {
    get,
    list,
    count: (ticket) => {
      const all = stepRows(ticket);
      return { done: all.filter((s) => s.done === 1).length, total: all.length };
    },
    add: (ticket, title) => {
      const id = nextId(db, "t");
      rows.insert("ticket_steps", {
        id,
        ticket,
        position: stepRows(ticket).length + 1,
        title,
        done: 0,
      });
      return get(id);
    },
    rename: (id, title) => {
      row(id);
      rows.update("ticket_steps", id, { title });
      return get(id);
    },
    setDone: (id, done) => {
      const found = row(id);
      if ((found.done === 1) === done) {
        throw new Refusal("no-change", `${found.title} is already ${done ? "done" : "not done"}.`);
      }
      rows.update("ticket_steps", id, { done: done ? 1 : 0 });
      return get(id);
    },
    note: (id, by, at, text) => {
      row(id);
      rows.insert("ticket_step_notes", { id: nextId(db, "v"), step: id, text, at, by });
      return get(id);
    },
    move: (id, before) => {
      const found = row(id);
      const rest = stepRows(found.ticket)
        .map((s) => s.id)
        .filter((s) => s !== id);
      const at = before === undefined ? rest.length : rest.indexOf(before);
      if (at < 0) throw new Refusal("unknown-step", `No step ${before} is on ${found.ticket}.`);
      order([...rest.slice(0, at), id, ...rest.slice(at)]);
      return list(found.ticket);
    },
    remove: (id) => {
      const found = get(id);
      for (const note of found.notes) rows.remove("ticket_step_notes", note.id);
      rows.remove("ticket_steps", id);
      order(stepRows(found.ticket).map((s) => s.id));
      return found;
    },
    purge: (ticket) => {
      db.prepare(
        "DELETE FROM ticket_step_notes WHERE step IN (SELECT id FROM ticket_steps WHERE ticket = ?)",
      ).run(ticket);
      db.prepare("DELETE FROM ticket_steps WHERE ticket = ?").run(ticket);
    },
  };
}
