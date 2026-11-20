// The tickets repository. A ticket is a title, a description, labels, the
// column it is in and who it is assigned to. It can be blocked in any
// column, and archived or canceled without losing its column.
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { type Catalog, Column, KINDS, Kind, Label } from "../catalog/catalog.js";
import { nextId, nextNumber } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const STATES = ["open", "archived", "canceled"] as const;
export const State = z.enum(STATES);
export type State = z.infer<typeof State>;

export const Feature = z.object({
  id: z.string(),
  project: z.string(),
  name: z.string(),
  description: z.string(),
  favourite: z.boolean(),
  archived: z.boolean(),
  tickets: z.number().describe("How many open tickets belong to it."),
});
export type Feature = z.infer<typeof Feature>;

export const Ticket = z.object({
  id: z.string(),
  project: z.string(),
  title: z.string(),
  description: z.string(),
  feature: z.string().nullable().describe("The id of the feature it belongs to, or null."),
  featureName: z.string(),
  column: Column,
  assignee: z.string().nullable().describe("The actor id it is assigned to, or null."),
  assigneeName: z.string(),
  labels: z.array(Label),
  location: z.string().nullable().describe("The id of the location its work is done at, or null."),
  locationName: z.string(),
  blocked: z.string().nullable().describe("Why it is blocked, or null when it is not."),
  state: State,
  backlog: z.boolean().describe("True while it waits in the backlog, off the board."),
  comments: z.number().describe("How many comments it has."),
  images: z.number().describe("How many images it has."),
  awaiting: z.number().describe("How many questions on it await the owner's answer."),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type Ticket = z.infer<typeof Ticket>;

export const Board = z.object({
  project: z.object({ id: z.string(), name: z.string() }),
  columns: z.array(Column.extend({ tickets: z.array(Ticket) })),
});
export type Board = z.infer<typeof Board>;

export const Overview = z.object({
  kinds: z.array(z.object({ kind: Kind, tickets: z.array(Ticket) })),
});
export type Overview = z.infer<typeof Overview>;

/** Narrows a board or the overview to some of its tickets. */
export const Narrow = z.object({
  text: z.string().optional().describe("Words to look for in the id, title and description."),
  assignee: z
    .string()
    .nullable()
    .optional()
    .describe("An actor id, or null for tickets assigned to nobody."),
  feature: z
    .string()
    .nullable()
    .optional()
    .describe("A feature id, or null for tickets in no feature."),
});
export type Narrow = z.infer<typeof Narrow>;

export const Find = z.object({
  project: z.string().optional(),
  kind: Kind.optional(),
  assignee: z
    .string()
    .nullable()
    .optional()
    .describe("An actor id, or null for tickets assigned to nobody."),
  label: z.string().optional().describe("A label id."),
  feature: z
    .string()
    .nullable()
    .optional()
    .describe("A feature id, or null for tickets in no feature."),
  text: z.string().optional().describe("Words to look for in the title and description."),
  blocked: z.boolean().optional(),
  backlog: z.boolean().optional().describe("True for the backlog only, false for the board only."),
  state: State.optional().describe("open if left out."),
});
export type Find = z.infer<typeof Find>;

export type Tickets = {
  get(id: string): Ticket;
  board(project: string, narrow?: Narrow): Board;
  /** The open tickets of every project that is not archived, lined up by column kind. */
  overview(narrow?: Narrow): Overview;
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
      feature?: string | undefined;
      location?: string | undefined;
      backlog?: boolean | undefined;
    },
  ): Ticket;
  /** A project's open tickets that wait in the backlog, oldest first. */
  backlog(project: string, narrow?: Narrow): Ticket[];
  /** Sends an open ticket to the backlog, or puts it on the board in the first to-do column. */
  setBacklog(id: string, backlog: boolean): Ticket;
  /** Puts a ticket in a feature of its project, or in none with null. */
  setFeature(id: string, feature: string | null): Ticket;
  /** A project's features, oldest first; archived ones only when asked. */
  features(project: string, archived?: boolean): Feature[];
  feature(id: string): Feature;
  createFeature(project: string, name: string, description: string): Feature;
  editFeature(
    id: string,
    patch: {
      name?: string | undefined;
      description?: string | undefined;
      favourite?: boolean | undefined;
    },
  ): Feature;
  archiveFeature(id: string, archived: boolean): Feature;
  edit(id: string, patch: { title?: string | undefined; description?: string | undefined }): Ticket;
  /** Moves an open ticket to any column of its board. */
  move(id: string, column: string): Ticket;
  /** Moves an open ticket to the first column of a kind on its board. */
  moveToKind(id: string, kind: Kind): Ticket;
  assign(id: string, actor: string | null): Ticket;
  /** Gives a ticket a location, or none with null. */
  setLocation(id: string, location: string | null): Ticket;
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
    "CREATE TABLE IF NOT EXISTS features (id TEXT PRIMARY KEY, project TEXT NOT NULL REFERENCES projects (id), name TEXT NOT NULL, description TEXT NOT NULL, favourite INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0)",
  );
  // Added after the first version: a database made before it gets the column here.
  const columns = db.prepare("PRAGMA table_info(tickets)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "feature")) {
    db.exec("ALTER TABLE tickets ADD COLUMN feature TEXT REFERENCES features (id)");
  }
  if (!columns.some((c) => c.name === "backlog")) {
    db.exec("ALTER TABLE tickets ADD COLUMN backlog INTEGER NOT NULL DEFAULT 0");
  }
  if (!columns.some((c) => c.name === "location")) {
    db.exec("ALTER TABLE tickets ADD COLUMN location TEXT REFERENCES locations (id)");
  }
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
  feature: string | null;
  assignee: string | null;
  location: string | null;
  blocked: string | null;
  state: State;
  backlog: number;
  created_at: string;
  created_by: string;
};

/** How many comments, images and open questions a ticket has. Other Domains keep them. */
export type Counts = (ticket: string) => { comments: number; images: number; awaiting: number };

export function sqliteTickets(
  db: DatabaseSync,
  rows: Rows,
  catalog: Catalog,
  counts: Counts,
): Tickets {
  type FeatureRow = {
    id: string;
    project: string;
    name: string;
    description: string;
    favourite: number;
    archived: number;
  };
  const featureRow = (id: string) =>
    db.prepare("SELECT * FROM features WHERE id = ?").get(id) as FeatureRow | undefined;
  const toFeature = (r: FeatureRow): Feature => ({
    id: r.id,
    project: r.project,
    name: r.name,
    description: r.description,
    favourite: r.favourite === 1,
    archived: r.archived === 1,
    tickets: (
      db
        .prepare("SELECT count(*) AS n FROM tickets WHERE feature = ? AND state = 'open'")
        .get(r.id) as { n: number }
    ).n,
  });
  const feature = (id: string) => {
    const found = featureRow(id);
    if (!found) throw new Refusal("unknown-feature", `No feature has id ${id}.`);
    return toFeature(found);
  };
  // A feature a ticket of `project` can be put in: of that project, not archived.
  const featureOf = (project: string, id: string) => {
    const found = feature(id);
    if (found.project !== project) {
      throw new Refusal("other-project", `Feature ${id} is not in project ${project}.`);
    }
    if (found.archived) throw new Refusal("archived-feature", `${found.name} is archived.`);
    return found;
  };
  const freeFeatureName = (project: string, name: string, except?: string) => {
    const taken = (
      db.prepare("SELECT * FROM features WHERE project = ?").all(project) as FeatureRow[]
    ).some((f) => f.id !== except && f.name.toLowerCase() === name.toLowerCase());
    if (taken) throw new Refusal("name-taken", `This project already has a feature named ${name}.`);
  };

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
      feature: r.feature,
      featureName: r.feature ? (featureRow(r.feature)?.name ?? "") : "",
      column,
      assignee: r.assignee,
      assigneeName: r.assignee ? catalog.actor(r.assignee).name : "",
      labels,
      location: r.location,
      locationName: r.location ? catalog.location(r.location).name : "",
      blocked: r.blocked,
      state: r.state,
      backlog: r.backlog === 1,
      ...counts(r.id),
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
  // An open ticket that is on the board: one that can move between columns.
  const onBoard = (id: string) => {
    const found = open(id);
    if (found.backlog) {
      throw new Refusal("in-backlog", `${id} is in the backlog. Put it on the board first.`);
    }
    return found;
  };
  const get = (id: string) => toTicket(row(id));
  const activeActor = (id: string) => {
    if (catalog.actor(id).archived) throw new Refusal("archived-actor", `${id} is archived.`);
  };
  const activeLocation = (id: string) => {
    const found = catalog.location(id);
    if (found.archived) throw new Refusal("archived-location", `${found.name} is archived.`);
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

  const narrowed = (all: TicketRow[], narrow: Narrow = {}) => {
    const words = (narrow.text ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    return all
      .filter((t) => narrow.feature === undefined || t.feature === narrow.feature)
      .filter((t) => narrow.assignee === undefined || t.assignee === narrow.assignee)
      .filter((t) =>
        words.every((w) => `${t.id} ${t.title} ${t.description}`.toLowerCase().includes(w)),
      );
  };

  return {
    get,
    overview: (narrow) => {
      const active = catalog
        .read()
        .projects.filter((p) => !p.archived)
        .map((p) => p.id);
      const all = narrowed(
        db
          .prepare(
            "SELECT * FROM tickets WHERE state = 'open' AND backlog = 0 ORDER BY created_at, number",
          )
          .all() as TicketRow[],
        narrow,
      )
        .filter((t) => active.includes(t.project))
        .map(toTicket);
      return {
        kinds: KINDS.map((kind) => ({ kind, tickets: all.filter((t) => t.column.kind === kind) })),
      };
    },
    board: (projectId, narrow) => {
      const project = catalog.project(projectId);
      const tickets = narrowed(
        db
          .prepare(
            "SELECT * FROM tickets WHERE project = ? AND state = 'open' AND backlog = 0 ORDER BY number",
          )
          .all(projectId) as TicketRow[],
        narrow,
      );
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
        .filter((t) => filter.feature === undefined || t.feature === filter.feature)
        .filter((t) => filter.backlog === undefined || (t.backlog === 1) === filter.backlog)
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
      if (ticket.feature !== undefined) featureOf(project.id, ticket.feature);
      if (ticket.location !== undefined) activeLocation(ticket.location);
      const number = nextNumber(db, `ticket:${project.id}`);
      const id = `${project.id}-${number}`;
      rows.insert("tickets", {
        id,
        project: project.id,
        number,
        title: ticket.title,
        description: ticket.description,
        column_id: column.id,
        feature: ticket.feature ?? null,
        assignee: ticket.assignee ?? null,
        location: ticket.location ?? null,
        blocked: null,
        state: "open",
        backlog: ticket.backlog ? 1 : 0,
        created_at: at,
        created_by: by,
      });
      for (const label of ticket.labels) attach(id, label);
      return get(id);
    },
    backlog: (projectId, narrow) => {
      catalog.project(projectId);
      return narrowed(
        db
          .prepare(
            "SELECT * FROM tickets WHERE project = ? AND state = 'open' AND backlog = 1 ORDER BY number",
          )
          .all(projectId) as TicketRow[],
        narrow,
      ).map(toTicket);
    },
    setBacklog: (id, backlog) => {
      const found = open(id);
      if ((found.backlog === 1) === backlog) {
        throw new Refusal(
          "no-change",
          backlog ? `${id} is already in the backlog.` : `${id} is already on the board.`,
        );
      }
      const first = backlog ? undefined : catalog.firstColumn(found.project, "todo");
      rows.update("tickets", id, {
        backlog: backlog ? 1 : 0,
        ...(first ? { column_id: first.id } : {}),
      });
      return get(id);
    },
    setFeature: (id, featureId) => {
      const found = open(id);
      if (featureId !== null) featureOf(found.project, featureId);
      rows.update("tickets", id, { feature: featureId });
      return get(id);
    },
    features: (projectId, archived = false) => {
      catalog.project(projectId);
      return (
        db
          .prepare("SELECT * FROM features WHERE project = ? ORDER BY rowid")
          .all(projectId) as FeatureRow[]
      )
        .filter((f) => archived || f.archived === 0)
        .map(toFeature);
    },
    feature,
    createFeature: (projectId, name, description) => {
      catalog.project(projectId);
      freeFeatureName(projectId, name);
      const id = nextId(db, "f");
      rows.insert("features", {
        id,
        project: projectId,
        name,
        description,
        favourite: 0,
        archived: 0,
      });
      return feature(id);
    },
    editFeature: (id, patch) => {
      const found = feature(id);
      if (patch.name !== undefined) freeFeatureName(found.project, patch.name, id);
      rows.update("features", id, {
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.description === undefined ? {} : { description: patch.description }),
        ...(patch.favourite === undefined ? {} : { favourite: patch.favourite ? 1 : 0 }),
      });
      return feature(id);
    },
    archiveFeature: (id, archived) => {
      feature(id);
      rows.update("features", id, { archived: archived ? 1 : 0 });
      return feature(id);
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
      rows.update("tickets", id, { column_id: columnOn(onBoard(id).project, column).id });
      return get(id);
    },
    moveToKind: (id, kind) => {
      const { project } = onBoard(id);
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
    setLocation: (id, location) => {
      open(id);
      if (location !== null) activeLocation(location);
      rows.update("tickets", id, { location });
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
