// The tickets repository. A ticket is a title, a description, labels, the
// column it is in and who it is assigned to. It can be blocked in any
// column, and archived or canceled without losing its column.
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { type Catalog, Column, Kind, Label } from "../catalog/catalog.js";
import { nextNumber } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const STATES = ["open", "archived", "canceled"] as const;
export const State = z.enum(STATES);
export type State = z.infer<typeof State>;

export const Ticket = z.object({
  id: z.string(),
  project: z.string(),
  title: z.string(),
  description: z.string(),
  column: Column,
  assignee: z.string().nullable().describe("The actor id it is assigned to, or null."),
  assigneeName: z.string(),
  labels: z.array(Label),
  blocked: z.string().nullable().describe("Why it is blocked, or null when it is not."),
  state: State,
  createdAt: z.string(),
  createdBy: z.string(),
});
export type Ticket = z.infer<typeof Ticket>;

export const Board = z.object({
  project: z.object({ id: z.string(), name: z.string() }),
  columns: z.array(Column.extend({ tickets: z.array(Ticket) })),
});
export type Board = z.infer<typeof Board>;

export const Find = z.object({
  project: z.string().optional(),
  kind: Kind.optional(),
  assignee: z
    .string()
    .nullable()
    .optional()
    .describe("An actor id, or null for tickets assigned to nobody."),
  label: z.string().optional().describe("A label id."),
  text: z.string().optional().describe("Words to look for in the title and description."),
  blocked: z.boolean().optional(),
  state: State.optional().describe("open if left out."),
});
export type Find = z.infer<typeof Find>;

export type Tickets = {
  get(id: string): Ticket;
  board(project: string): Board;
  find(filter: Find): Ticket[];
  create(
    by: string,
    at: string,
    ticket: {
      project: string;
      title: string;
      description: string;
      column?: string | undefined;
      labels: string[];
      assignee?: string | undefined;
    },
  ): Ticket;
  edit(id: string, patch: { title?: string | undefined; description?: string | undefined }): Ticket;
  /** Moves an open ticket to any column of its board. */
  move(id: string, column: string): Ticket;
  /** Moves an open ticket to the first column of a kind on its board. */
  moveToKind(id: string, kind: Kind): Ticket;
  assign(id: string, actor: string | null): Ticket;
  addLabel(id: string, label: string): Ticket;
  removeLabel(id: string, label: string): Ticket;
  block(id: string, note: string | null): Ticket;
  setState(id: string, state: State): Ticket;
  /** Moves every ticket in a column to another column. */
  vacate(from: string, to: string): void;
  /** Deletes a ticket and its labels. It cannot be brought back. */
  purge(id: string): void;
};

export function migrateTickets(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, project TEXT NOT NULL REFERENCES projects (id), number INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, column_id TEXT NOT NULL REFERENCES columns (id), assignee TEXT REFERENCES actors (id), blocked TEXT, state TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL, created_by TEXT NOT NULL)",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS ticket_labels (id TEXT PRIMARY KEY, ticket TEXT NOT NULL REFERENCES tickets (id), label TEXT NOT NULL REFERENCES labels (id))",
  );
}

type TicketRow = {
  id: string;
  project: string;
  number: number;
  title: string;
  description: string;
  column_id: string;
  assignee: string | null;
  blocked: string | null;
  state: State;
  created_at: string;
  created_by: string;
};

export function sqliteTickets(db: DatabaseSync, rows: Rows, catalog: Catalog): Tickets {
  const toTicket = (r: TicketRow): Ticket => {
    const { project: _, ...column } = catalog.column(r.column_id);
    const labels = db
      .prepare(
        "SELECT l.id, l.name, l.colour FROM ticket_labels t JOIN labels l ON l.id = t.label WHERE t.ticket = ? AND l.removed = 0 ORDER BY l.rowid",
      )
      .all(r.id) as Label[];
    return {
      id: r.id,
      project: r.project,
      title: r.title,
      description: r.description,
      column,
      assignee: r.assignee,
      assigneeName: r.assignee ? catalog.actor(r.assignee).name : "",
      labels,
      blocked: r.blocked,
      state: r.state,
      createdAt: r.created_at,
      createdBy: r.created_by,
    };
  };
  const row = (id: string) => {
    const found = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as TicketRow | undefined;
    if (!found) throw new Refusal("unknown-ticket", `No ticket has id ${id}.`);
    return found;
  };
  const open = (id: string) => {
    const found = row(id);
    if (found.state !== "open") {
      throw new Refusal("not-open", `${id} is ${found.state}. The owner can restore it.`);
    }
    return found;
  };
  const get = (id: string) => toTicket(row(id));
  const activeActor = (id: string) => {
    if (catalog.actor(id).archived) throw new Refusal("archived-actor", `${id} is archived.`);
  };
  const columnOn = (project: string, column: string) => {
    const found = catalog.column(column);
    if (found.project !== project) {
      throw new Refusal("other-board", `Column ${column} is not on the board of ${project}.`);
    }
    return found;
  };
  const attach = (ticket: string, label: string) => {
    catalog.label(label);
    const id = `${ticket}:${label}`;
    if (!rows.get("ticket_labels", id)) rows.insert("ticket_labels", { id, ticket, label });
  };

  return {
    get,
    board: (projectId) => {
      const project = catalog.project(projectId);
      const tickets = db
        .prepare("SELECT * FROM tickets WHERE project = ? AND state = 'open' ORDER BY number")
        .all(projectId) as TicketRow[];
      return {
        project: { id: project.id, name: project.name },
        columns: project.columns.map((c) => ({
          ...c,
          tickets: tickets.filter((t) => t.column_id === c.id).map(toTicket),
        })),
      };
    },
    find: (filter) => {
      if (filter.project !== undefined) catalog.project(filter.project);
      const words = (filter.text ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      const all = db
        .prepare("SELECT * FROM tickets WHERE state = ? ORDER BY created_at, project, number")
        .all(filter.state ?? "open") as TicketRow[];
      return all
        .filter((t) => filter.project === undefined || t.project === filter.project)
        .filter((t) => filter.assignee === undefined || t.assignee === filter.assignee)
        .filter((t) => filter.blocked === undefined || (t.blocked !== null) === filter.blocked)
        .filter((t) => words.every((w) => `${t.title} ${t.description}`.toLowerCase().includes(w)))
        .map(toTicket)
        .filter((t) => filter.kind === undefined || t.column.kind === filter.kind)
        .filter((t) => filter.label === undefined || t.labels.some((l) => l.id === filter.label));
    },
    create: (by, at, ticket) => {
      const project = catalog.project(ticket.project);
      if (project.archived) {
        throw new Refusal("archived-project", `Project ${project.id} is archived.`);
      }
      const column =
        ticket.column === undefined
          ? (catalog.firstColumn(project.id, "todo") ?? project.columns[0])
          : columnOn(project.id, ticket.column);
      if (!column) throw new Refusal("no-column", `The board of ${project.id} has no columns.`);
      if (ticket.assignee !== undefined) activeActor(ticket.assignee);
      const number = nextNumber(db, `ticket:${project.id}`);
      const id = `${project.id}-${number}`;
      rows.insert("tickets", {
        id,
        project: project.id,
        number,
        title: ticket.title,
        description: ticket.description,
        column_id: column.id,
        assignee: ticket.assignee ?? null,
        blocked: null,
        state: "open",
        created_at: at,
        created_by: by,
      });
      for (const label of ticket.labels) attach(id, label);
      return get(id);
    },
    edit: (id, patch) => {
      open(id);
      rows.update("tickets", id, {
        ...(patch.title === undefined ? {} : { title: patch.title }),
        ...(patch.description === undefined ? {} : { description: patch.description }),
      });
      return get(id);
    },
    move: (id, column) => {
      rows.update("tickets", id, { column_id: columnOn(open(id).project, column).id });
      return get(id);
    },
    moveToKind: (id, kind) => {
      const { project } = open(id);
      const column = catalog.firstColumn(project, kind);
      if (!column) {
        throw new Refusal("no-column", `The board of ${project} has no ${kind} column.`);
      }
      rows.update("tickets", id, { column_id: column.id });
      return get(id);
    },
    assign: (id, actor) => {
      open(id);
      if (actor !== null) activeActor(actor);
      rows.update("tickets", id, { assignee: actor });
      return get(id);
    },
    addLabel: (id, label) => {
      open(id);
      attach(id, label);
      return get(id);
    },
    removeLabel: (id, label) => {
      open(id);
      rows.remove("ticket_labels", `${id}:${label}`);
      return get(id);
    },
    block: (id, note) => {
      open(id);
      rows.update("tickets", id, { blocked: note });
      return get(id);
    },
    setState: (id, state) => {
      const found = row(id);
      if (found.state === state) throw new Refusal("no-change", `${id} is already ${state}.`);
      if (state !== "open" && found.state !== "open") {
        throw new Refusal("not-open", `${id} is ${found.state}. The owner can restore it.`);
      }
      rows.update("tickets", id, { state });
      return get(id);
    },
    vacate: (from, to) => {
      const inside = db.prepare("SELECT id FROM tickets WHERE column_id = ?").all(from) as {
        id: string;
      }[];
      for (const { id } of inside) rows.update("tickets", id, { column_id: to });
    },
    purge: (id) => {
      row(id);
      db.prepare("DELETE FROM ticket_labels WHERE ticket = ?").run(id);
      db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
    },
  };
}
