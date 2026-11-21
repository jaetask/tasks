import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { nextId } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const OWNER = "owner";

export const KINDS = ["todo", "doing", "waiting", "done"] as const;
export const Kind = z.enum(KINDS).describe("What a column means: todo, doing, waiting or done.");
export type Kind = z.infer<typeof Kind>;

export const COLOURS = ["blue", "teal", "green", "amber", "purple", "pink"] as const;
export const Colour = z.enum(COLOURS);
export type Colour = z.infer<typeof Colour>;

export const PROJECT_ICONS = [
  "folder",
  "robot",
  "code",
  "checklist",
  "layout",
  "rocket",
  "bolt",
  "flame",
  "star",
  "heart",
  "bulb",
  "target",
  "flag",
  "chart",
  "wallet",
  "dollar",
  "person",
  "table",
  "brand-x",
  "globe",
  "cloud",
  "database",
  "terminal",
  "tool",
  "bug",
  "palette",
  "book",
  "coffee",
] as const;

export const ProjectColour = z
  .string()
  .refine(
    (v) => (COLOURS as readonly string[]).includes(v) || /^#[0-9a-fA-F]{6}$/.test(v),
    `a colour is one of ${COLOURS.join(", ")}, or six-digit hex such as #48b685`,
  )
  .transform((v) => v.toLowerCase());
export type ProjectColour = z.infer<typeof ProjectColour>;

export const CARD_PROPERTIES = [
  "id",
  "type",
  "priority",
  "status",
  "actor",
  "feature",
  "location",
  "labels",
  "links",
  "reactions",
  "due",
  "time-in-status",
  "created",
  "updated",
] as const;
export const CardProperty = z.enum(CARD_PROPERTIES);
export type CardProperty = z.infer<typeof CardProperty>;
export const DEFAULT_CARD: readonly CardProperty[] = [
  "id",
  "type",
  "priority",
  "status",
  "actor",
  "feature",
  "updated",
];

export const ORDERINGS = ["created", "priority", "due", "updated"] as const;
export const Ordering = z.enum(ORDERINGS);
export type Ordering = z.infer<typeof Ordering>;

export const Actor = z.object({
  id: z.string(),
  name: z.string(),
  icon: z
    .string()
    .describe("The actor's mark: an icon name such as robot, or an emoji. Empty for none."),
  colour: z.string().describe("The colour of its icon, as six-digit hex. Empty for the usual one."),
  archived: z.boolean(),
});
export type Actor = z.infer<typeof Actor>;

export const Column = z.object({ id: z.string(), name: z.string(), kind: Kind });
export type Column = z.infer<typeof Column>;

export const Project = z.object({
  id: z.string(),
  name: z.string(),
  icon: z
    .string()
    .describe(
      "The icon shown beside the project's name: an icon name such as globe, or an emoji. Empty for none.",
    ),
  colour: z.string().describe("One of the six named colours, or six-digit hex such as #48b685."),
  archived: z.boolean(),
  columns: z.array(Column),
  card: z
    .array(CardProperty)
    .describe("What a ticket's card shows on this project's board and backlog, besides its title."),
  ordering: Ordering.describe(
    "How the cards of a column are ordered: created (oldest first), priority (most urgent first), due (soonest first) or updated (latest first).",
  ),
});
export type Project = z.infer<typeof Project>;

export const Label = z.object({ id: z.string(), name: z.string(), colour: Colour });
export type Label = z.infer<typeof Label>;

export const Location = z.object({ id: z.string(), name: z.string(), archived: z.boolean() });
export type Location = z.infer<typeof Location>;

export const CatalogView = z.object({
  actors: z.array(Actor),
  locations: z.array(Location),
  projects: z.array(Project),
  labels: z.array(Label),
});
export type CatalogView = z.infer<typeof CatalogView>;

export const FIRST_COLUMNS: readonly (readonly [string, Kind])[] = [
  ["To do", "todo"],
  ["Doing", "doing"],
  ["Review", "waiting"],
  ["Done", "done"],
];

export type Catalog = {
  read(): CatalogView;
  actor(id: string): Actor;
  project(id: string): Project;
  column(id: string): Column & { project: string };
  label(id: string): Label;
  location(id: string): Location;
  firstColumn(project: string, kind: Kind): Column | undefined;
  createActor(name: string, icon: string, colour?: string): Actor;
  renameActor(id: string, name: string): Actor;
  setActorIcon(id: string, icon: string, colour?: string): Actor;
  archiveActor(id: string, archived: boolean): Actor;
  deleteActor(id: string): Actor;
  createProject(name: string, prefix: string): Project;
  archiveProject(id: string, archived: boolean): Project;
  deleteProject(id: string): Project;
  editProject(
    id: string,
    patch: {
      name?: string | undefined;
      icon?: string | undefined;
      colour?: ProjectColour | undefined;
    },
  ): Project;
  setCard(id: string, show: CardProperty[] | null): Project;
  setOrdering(id: string, ordering: Ordering): Project;
  moveProject(id: string, before?: string): Project[];
  addColumn(project: string, name: string, kind: Kind, before?: string): Column;
  renameColumn(id: string, name: string): Column;
  setColumnKind(id: string, kind: Kind): Column;
  moveColumn(id: string, before?: string): Project;
  removeColumn(
    id: string,
    vacate: (from: string, to: Column) => void,
  ): { removed: Column; next: Column };
  createLabel(name: string, colour: Colour): Label;
  renameLabel(id: string, name: string): Label;
  setLabelColour(id: string, colour: Colour): Label;
  removeLabel(id: string): Label;
  createLocation(name: string): Location;
  renameLocation(id: string, name: string): Location;
  archiveLocation(id: string, archived: boolean): Location;
  deleteLocation(id: string): Location;
};

export function migrateCatalog(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS actors (id TEXT PRIMARY KEY, name TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0)",
  );
  const actorColumns = db.prepare("PRAGMA table_info(actors)").all() as { name: string }[];
  if (!actorColumns.some((c) => c.name === "icon")) {
    db.exec("ALTER TABLE actors ADD COLUMN icon TEXT NOT NULL DEFAULT ''");
  }
  if (!actorColumns.some((c) => c.name === "colour")) {
    db.exec("ALTER TABLE actors ADD COLUMN colour TEXT NOT NULL DEFAULT ''");
  }
  db.exec(
    "CREATE TABLE IF NOT EXISTS locations (id TEXT PRIMARY KEY, name TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0)",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL, archived INTEGER NOT NULL DEFAULT 0)",
  );
  const columns = db.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "icon")) {
    db.exec("ALTER TABLE projects ADD COLUMN icon TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.some((c) => c.name === "card")) {
    db.exec("ALTER TABLE projects ADD COLUMN card TEXT");
  }
  if (!columns.some((c) => c.name === "ordering")) {
    db.exec("ALTER TABLE projects ADD COLUMN ordering TEXT NOT NULL DEFAULT 'created'");
  }
  if (!columns.some((c) => c.name === "colour")) {
    db.exec("ALTER TABLE projects ADD COLUMN colour TEXT NOT NULL DEFAULT 'teal'");
  }
  db.exec(
    "CREATE TABLE IF NOT EXISTS columns (id TEXT PRIMARY KEY, project TEXT NOT NULL REFERENCES projects (id), name TEXT NOT NULL, kind TEXT NOT NULL, position INTEGER NOT NULL)",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS labels (id TEXT PRIMARY KEY, name TEXT NOT NULL, colour TEXT NOT NULL, removed INTEGER NOT NULL DEFAULT 0)",
  );
  const renamed: [string, string][] = [
    ["plum", "purple"],
    ["red", "pink"],
    ["grey", "blue"],
  ];
  for (const [was, now] of renamed) {
    db.prepare("UPDATE labels SET colour = ? WHERE colour = ?").run(now, was);
    db.prepare("UPDATE projects SET colour = ? WHERE colour = ?").run(now, was);
  }
  db.prepare("INSERT OR IGNORE INTO actors (id, name) VALUES (?, '')").run(OWNER);
}

type ActorRow = { id: string; name: string; icon: string; colour: string; archived: number };
type LocationRow = { id: string; name: string; archived: number };
type ProjectRow = {
  id: string;
  name: string;
  icon: string;
  colour: ProjectColour;
  position: number;
  archived: number;
  card: string | null;
  ordering: Ordering;
};
type ColumnRow = { id: string; project: string; name: string; kind: Kind; position: number };
type LabelRow = { id: string; name: string; colour: Colour; removed: number };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function sqliteCatalog(db: DatabaseSync, rows: Rows): Catalog {
  const actorRows = () => db.prepare("SELECT * FROM actors ORDER BY rowid").all() as ActorRow[];
  const projectRows = () =>
    db.prepare("SELECT * FROM projects ORDER BY position").all() as ProjectRow[];
  const columnRows = (project: string) =>
    db
      .prepare("SELECT * FROM columns WHERE project = ? ORDER BY position")
      .all(project) as ColumnRow[];
  const labelRows = () =>
    db.prepare("SELECT * FROM labels WHERE removed = 0 ORDER BY rowid").all() as LabelRow[];

  const locationRows = () =>
    db.prepare("SELECT * FROM locations ORDER BY rowid").all() as LocationRow[];

  const toActor = (r: ActorRow): Actor => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    colour: r.colour,
    archived: r.archived === 1,
  });
  const toLocation = (r: LocationRow): Location => ({
    id: r.id,
    name: r.name,
    archived: r.archived === 1,
  });
  const toColumn = (r: ColumnRow): Column => ({ id: r.id, name: r.name, kind: r.kind });
  const toProject = (r: ProjectRow): Project => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    colour: r.colour,
    archived: r.archived === 1,
    columns: columnRows(r.id).map(toColumn),
    card: r.card
      ? (JSON.parse(r.card) as string[]).filter((p): p is CardProperty =>
          (CARD_PROPERTIES as readonly string[]).includes(p),
        )
      : [...DEFAULT_CARD],
    ordering: (ORDERINGS as readonly string[]).includes(r.ordering) ? r.ordering : "created",
  });
  const toLabel = (r: LabelRow): Label => ({ id: r.id, name: r.name, colour: r.colour });

  const actor = (id: string) => {
    const found = actorRows().find((a) => a.id === id);
    if (!found) throw new Refusal("unknown-actor", `No actor has id ${id}.`);
    return toActor(found);
  };
  const project = (id: string) => {
    const found = projectRows().find((p) => p.id === id);
    if (!found) throw new Refusal("unknown-project", `No project has id ${id}.`);
    return toProject(found);
  };
  const columnRow = (id: string) => {
    const found = db.prepare("SELECT * FROM columns WHERE id = ?").get(id) as ColumnRow | undefined;
    if (!found) throw new Refusal("unknown-column", `No column has id ${id}.`);
    return found;
  };
  const label = (id: string) => {
    const found = labelRows().find((l) => l.id === id);
    if (!found) throw new Refusal("unknown-label", `No label has id ${id}.`);
    return toLabel(found);
  };

  const location = (id: string) => {
    const found = locationRows().find((l) => l.id === id);
    if (!found) throw new Refusal("unknown-location", `No location has id ${id}.`);
    return toLocation(found);
  };
  const freeLocationName = (name: string, except?: string) => {
    if (locationRows().some((l) => l.id !== except && same(l.name, name))) {
      throw new Refusal("name-taken", `A location is already named ${name}.`);
    }
  };

  const freeActorName = (name: string, except?: string) => {
    if (actorRows().some((a) => a.id !== except && same(a.name, name))) {
      throw new Refusal("name-taken", `An actor is already named ${name}.`);
    }
  };
  const freeColumnName = (projectId: string, name: string, except?: string) => {
    if (columnRows(projectId).some((c) => c.id !== except && same(c.name, name))) {
      throw new Refusal("name-taken", `This board already has a column named ${name}.`);
    }
  };
  const freeLabelName = (name: string, except?: string) => {
    if (labelRows().some((l) => l.id !== except && same(l.name, name))) {
      throw new Refusal("name-taken", `A label is already named ${name}.`);
    }
  };

  const order = (ids: string[]) => {
    for (const [i, id] of ids.entries()) rows.update("columns", id, { position: i + 1 });
  };
  const placed = (ids: string[], id: string, before?: string) => {
    const rest = ids.filter((x) => x !== id);
    if (before === undefined) return [...rest, id];
    const at = rest.indexOf(before);
    if (at < 0) throw new Refusal("unknown-column", `No column ${before} is on this board.`);
    return [...rest.slice(0, at), id, ...rest.slice(at)];
  };

  return {
    read: () => ({
      actors: actorRows().map(toActor),
      locations: locationRows().map(toLocation),
      projects: projectRows().map(toProject),
      labels: labelRows().map(toLabel),
    }),
    actor,
    project,
    column: (id) => {
      const row = columnRow(id);
      return { ...toColumn(row), project: row.project };
    },
    label,
    location,
    firstColumn: (projectId, kind) => project(projectId).columns.find((c) => c.kind === kind),

    createActor: (name, icon, colour = "") => {
      freeActorName(name);
      const id = nextId(db, "a");
      rows.insert("actors", { id, name, icon, colour, archived: 0 });
      return actor(id);
    },
    renameActor: (id, name) => {
      actor(id);
      freeActorName(name, id);
      rows.update("actors", id, { name });
      return actor(id);
    },
    setActorIcon: (id, icon, colour) => {
      actor(id);
      rows.update("actors", id, { icon, ...(colour === undefined ? {} : { colour }) });
      return actor(id);
    },
    deleteActor: (id) => {
      const found = actor(id);
      if (id === OWNER) throw new Refusal("owner", "The owner cannot be deleted.");
      rows.remove("actors", id);
      return found;
    },
    archiveActor: (id, archived) => {
      actor(id);
      if (id === OWNER) throw new Refusal("owner", "The owner cannot be archived.");
      rows.update("actors", id, { archived: archived ? 1 : 0 });
      return actor(id);
    },

    createProject: (name, prefix) => {
      if (projectRows().some((p) => p.id === prefix)) {
        throw new Refusal("prefix-taken", `A project already has the prefix ${prefix}.`);
      }
      rows.insert("projects", {
        id: prefix,
        name,
        position: projectRows().length + 1,
        archived: 0,
      });
      for (const [i, [columnName, kind]] of FIRST_COLUMNS.entries()) {
        rows.insert("columns", {
          id: nextId(db, "c"),
          project: prefix,
          name: columnName,
          kind,
          position: i + 1,
        });
      }
      return project(prefix);
    },
    editProject: (id, patch) => {
      project(id);
      rows.update("projects", id, {
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.icon === undefined ? {} : { icon: patch.icon }),
        ...(patch.colour === undefined ? {} : { colour: patch.colour }),
      });
      return project(id);
    },
    setOrdering: (id, ordering) => {
      project(id);
      rows.update("projects", id, { ordering });
      return project(id);
    },
    setCard: (id, show) => {
      project(id);
      rows.update("projects", id, { card: show === null ? null : JSON.stringify(show) });
      return project(id);
    },
    moveProject: (id, before) => {
      project(id);
      const rest = projectRows()
        .map((p) => p.id)
        .filter((p) => p !== id);
      const at = before === undefined ? rest.length : rest.indexOf(before);
      if (at < 0) throw new Refusal("unknown-project", `No project has id ${before}.`);
      for (const [i, p] of [...rest.slice(0, at), id, ...rest.slice(at)].entries()) {
        rows.update("projects", p, { position: i + 1 });
      }
      return projectRows().map(toProject);
    },
    archiveProject: (id, archived) => {
      project(id);
      rows.update("projects", id, { archived: archived ? 1 : 0 });
      return project(id);
    },

    deleteProject: (id) => {
      const found = project(id);
      for (const column of found.columns) rows.remove("columns", column.id);
      rows.remove("projects", id);
      for (const [i, p] of projectRows().entries())
        rows.update("projects", p.id, { position: i + 1 });
      return found;
    },

    addColumn: (projectId, name, kind, before) => {
      const ids = project(projectId).columns.map((c) => c.id);
      freeColumnName(projectId, name);
      const id = nextId(db, "c");
      const next = placed(ids, id, before);
      rows.insert("columns", { id, project: projectId, name, kind, position: ids.length + 1 });
      order(next);
      return toColumn(columnRow(id));
    },
    renameColumn: (id, name) => {
      freeColumnName(columnRow(id).project, name, id);
      rows.update("columns", id, { name });
      return toColumn(columnRow(id));
    },
    setColumnKind: (id, kind) => {
      columnRow(id);
      rows.update("columns", id, { kind });
      return toColumn(columnRow(id));
    },
    moveColumn: (id, before) => {
      const row = columnRow(id);
      order(
        placed(
          columnRows(row.project).map((c) => c.id),
          id,
          before,
        ),
      );
      return project(row.project);
    },
    removeColumn: (id, vacate) => {
      const row = columnRow(id);
      const all = columnRows(row.project);
      if (all.length === 1) {
        throw new Refusal("last-column", "A board needs at least one column.");
      }
      const at = all.findIndex((c) => c.id === id);
      const next = (all[at - 1] ?? all[at + 1]) as ColumnRow;
      vacate(id, toColumn(next));
      rows.remove("columns", id);
      order(all.filter((c) => c.id !== id).map((c) => c.id));
      return { removed: toColumn(row), next: toColumn(next) };
    },

    createLabel: (name, colour) => {
      freeLabelName(name);
      const id = nextId(db, "l");
      rows.insert("labels", { id, name, colour, removed: 0 });
      return label(id);
    },
    renameLabel: (id, name) => {
      label(id);
      freeLabelName(name, id);
      rows.update("labels", id, { name });
      return label(id);
    },
    setLabelColour: (id, colour) => {
      label(id);
      rows.update("labels", id, { colour });
      return label(id);
    },
    removeLabel: (id) => {
      const found = label(id);
      rows.update("labels", id, { removed: 1 });
      return found;
    },

    createLocation: (name) => {
      freeLocationName(name);
      const id = nextId(db, "p");
      rows.insert("locations", { id, name, archived: 0 });
      return location(id);
    },
    renameLocation: (id, name) => {
      location(id);
      freeLocationName(name, id);
      rows.update("locations", id, { name });
      return location(id);
    },
    archiveLocation: (id, archived) => {
      location(id);
      rows.update("locations", id, { archived: archived ? 1 : 0 });
      return location(id);
    },
    deleteLocation: (id) => {
      const found = location(id);
      rows.remove("locations", id);
      return found;
    },
  };
}
