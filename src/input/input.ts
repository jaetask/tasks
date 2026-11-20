// The human input repository: questions an agent asks the owner on a
// ticket, and the owner's answers.
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { nextId } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const REQUEST_STATES = ["awaiting", "resolved", "withdrawn"] as const;
export const RequestState = z.enum(REQUEST_STATES);
export type RequestState = z.infer<typeof RequestState>;

export const InputRequest = z.object({
  id: z.string(),
  ticket: z.string(),
  project: z.string(),
  question: z.string(),
  context: z.string().describe("What the owner needs to know to answer."),
  askedBy: z.string(),
  askedByName: z.string(),
  at: z.string(),
  state: RequestState,
  answer: z.string().nullable(),
  answeredAt: z.string().nullable(),
});
export type InputRequest = z.infer<typeof InputRequest>;

export type Inputs = {
  list(filter?: {
    state?: RequestState | undefined;
    project?: string | undefined;
    ticket?: string | undefined;
  }): InputRequest[];
  get(id: string): InputRequest;
  /** How many requests on a ticket still await an answer. */
  awaiting(ticket: string): number;
  ask(
    by: string,
    at: string,
    request: { ticket: string; project: string; question: string; context: string },
  ): InputRequest;
  resolve(id: string, at: string, answer: string): InputRequest;
  withdraw(id: string): InputRequest;
  /** Deletes every request on a ticket. They cannot be brought back. */
  purge(ticket: string): void;
};

export function migrateInput(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS input_requests (id TEXT PRIMARY KEY, ticket TEXT NOT NULL REFERENCES tickets (id), project TEXT NOT NULL, question TEXT NOT NULL, context TEXT NOT NULL, asked_by TEXT NOT NULL, at TEXT NOT NULL, state TEXT NOT NULL, answer TEXT, answered_at TEXT)",
  );
}

type Row = {
  id: string;
  ticket: string;
  project: string;
  question: string;
  context: string;
  asked_by: string;
  at: string;
  state: RequestState;
  answer: string | null;
  answered_at: string | null;
};

export function sqliteInputs(
  db: DatabaseSync,
  rows: Rows,
  nameOf: (actor: string) => string,
): Inputs {
  const toRequest = (r: Row): InputRequest => ({
    id: r.id,
    ticket: r.ticket,
    project: r.project,
    question: r.question,
    context: r.context,
    askedBy: r.asked_by,
    askedByName: nameOf(r.asked_by),
    at: r.at,
    state: r.state,
    answer: r.answer,
    answeredAt: r.answered_at,
  });
  const row = (id: string) => {
    const found = db.prepare("SELECT * FROM input_requests WHERE id = ?").get(id) as
      | Row
      | undefined;
    if (!found) throw new Refusal("unknown-request", `No input request has id ${id}.`);
    return found;
  };
  const awaiting = (id: string) => {
    const found = row(id);
    if (found.state !== "awaiting") {
      throw new Refusal("not-awaiting", `${id} is already ${found.state}.`);
    }
    return found;
  };
  const get = (id: string) => toRequest(row(id));
  return {
    get,
    list: (filter = {}) =>
      (db.prepare("SELECT * FROM input_requests ORDER BY rowid").all() as Row[])
        .filter((r) => filter.state === undefined || r.state === filter.state)
        .filter((r) => filter.project === undefined || r.project === filter.project)
        .filter((r) => filter.ticket === undefined || r.ticket === filter.ticket)
        .map(toRequest),
    awaiting: (ticket) =>
      (
        db
          .prepare(
            "SELECT count(*) AS n FROM input_requests WHERE ticket = ? AND state = 'awaiting'",
          )
          .get(ticket) as { n: number }
      ).n,
    ask: (by, at, request) => {
      const id = nextId(db, "q");
      rows.insert("input_requests", {
        id,
        ticket: request.ticket,
        project: request.project,
        question: request.question,
        context: request.context,
        asked_by: by,
        at,
        state: "awaiting",
        answer: null,
        answered_at: null,
      });
      return get(id);
    },
    resolve: (id, at, answer) => {
      awaiting(id);
      rows.update("input_requests", id, { state: "resolved", answer, answered_at: at });
      return get(id);
    },
    withdraw: (id) => {
      awaiting(id);
      rows.update("input_requests", id, { state: "withdrawn" });
      return get(id);
    },
    purge: (ticket) => {
      db.prepare("DELETE FROM input_requests WHERE ticket = ?").run(ticket);
    },
  };
}
