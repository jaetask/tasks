// The catalog Domain: actors, projects with their columns, and labels.
// Anyone may read it; only the owner changes it.
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import {
  Actor,
  type Catalog,
  CatalogView,
  Colour,
  type Column,
  Kind,
  Label,
  OWNER,
  Project,
} from "./catalog.js";

export type CatalogDeps = Base & {
  catalog: Catalog;
  /** Moves every ticket in a column to another column of the same board. */
  vacate(from: string, to: Column): void;
};

const name = z.string().trim().min(1).max(60);
const prefix = z
  .string()
  .regex(/^[A-Z]{2,6}$/, "a prefix is 2 to 6 capital letters, like TLK")
  .describe("The project's id and the start of its ticket ids, like TLK.");

export const catalogChanged = defineCard({
  name: "catalog-changed",
  version: 1,
  about: "What a Call changed in the actors, projects, columns or labels.",
  view: { kind: "change", title: "Catalog changed" },
});

const write = <Input extends z.ZodType, Output extends z.ZodType>(
  definition: Parameters<typeof writeAction<Input, Output, CatalogDeps>>[1],
) => writeAction<Input, Output, CatalogDeps>("catalog", { card: catalogChanged, ...definition });

export const catalogRead = readAction({
  name: "catalog-read",
  description: "List the actors, the projects with their columns, and the labels.",
  input: z.object({}),
  output: CatalogView,
  run: (_input, { catalog }: CatalogDeps) => catalog.read(),
});

const actorCreate = write({
  name: "actor-create",
  description: "Add an actor for an agent. A Connection acts as an actor.",
  input: z.object({ name }),
  output: Actor,
  run: ({ name }, { catalog, log }) => {
    const actor = catalog.createActor(name);
    log(`added actor ${name}`, { kind: "created", subject: "actor", id: actor.id });
    return actor;
  },
});

const actorRename = write({
  name: "actor-rename",
  description: "Rename an actor. The owner's actor id is owner.",
  input: z.object({ actor: z.string(), name }),
  output: Actor,
  run: ({ actor: id, name }, { catalog, log }) => {
    const before = catalog.actor(id).name;
    const actor = catalog.renameActor(id, name);
    log(before ? `renamed actor ${before} to ${name}` : `named the owner ${name}`, {
      kind: "updated",
      subject: "actor",
      id,
    });
    return actor;
  },
});

const actorArchive = write({
  name: "actor-archive",
  description: "Archive an actor. It can no longer act; what it did stays visible.",
  input: z.object({ actor: z.string() }),
  output: Actor,
  run: ({ actor: id }, { catalog, log }) => {
    const actor = catalog.archiveActor(id, true);
    log(`archived actor ${actor.name}`, { kind: "updated", subject: "actor", id });
    return actor;
  },
});

const actorRestore = write({
  name: "actor-restore",
  description: "Restore an archived actor.",
  input: z.object({ actor: z.string() }),
  output: Actor,
  run: ({ actor: id }, { catalog, log }) => {
    const actor = catalog.archiveActor(id, false);
    log(`restored actor ${actor.name}`, { kind: "updated", subject: "actor", id });
    return actor;
  },
});

const projectCreate = write({
  name: "project-create",
  description: "Create a project. Its board starts with the columns To do, Doing, Review and Done.",
  input: z.object({ name, prefix }),
  output: Project,
  run: ({ name, prefix }, { catalog, log }) => {
    const project = catalog.createProject(name, prefix);
    log(`created project ${name} (${prefix})`, { kind: "created", subject: "project", id: prefix });
    return project;
  },
});

const projectEdit = write({
  name: "project-edit",
  description:
    "Change a project's name, its icon (an emoji, or empty for none) or its colour. Its prefix and ticket ids stay the same.",
  input: z.object({
    project: z.string(),
    name: name.optional(),
    icon: z.string().trim().max(16).optional(),
    colour: Colour.optional(),
  }),
  output: Project,
  run: ({ project: id, ...patch }, { catalog, log }) => {
    const before = catalog.project(id);
    const project = catalog.editProject(id, patch);
    const renamed = patch.name !== undefined && patch.name !== before.name;
    log(
      renamed
        ? `renamed project ${before.name} to ${project.name}`
        : `changed how project ${project.name} looks`,
      { kind: "updated", subject: "project", id },
    );
    return project;
  },
});

const projectMove = write({
  name: "project-move",
  description: "Move a project to another place in the list of projects.",
  input: z.object({
    project: z.string(),
    before: z
      .string()
      .optional()
      .describe("The id of the project to put it before. Last if left out."),
  }),
  output: z.array(Project),
  run: ({ project: id, before }, { catalog, log }) => {
    const projects = catalog.moveProject(id, before);
    log(`moved project ${catalog.project(id).name} in the list`, {
      kind: "updated",
      subject: "project",
      id,
    });
    return projects;
  },
});

const projectArchive = write({
  name: "project-archive",
  description: "Archive a project. Its tickets are kept and it can be restored.",
  input: z.object({ project: z.string() }),
  output: Project,
  run: ({ project: id }, { catalog, log }) => {
    const project = catalog.archiveProject(id, true);
    log(`archived project ${project.name}`, { kind: "updated", subject: "project", id });
    return project;
  },
});

const projectRestore = write({
  name: "project-restore",
  description: "Restore an archived project.",
  input: z.object({ project: z.string() }),
  output: Project,
  run: ({ project: id }, { catalog, log }) => {
    const project = catalog.archiveProject(id, false);
    log(`restored project ${project.name}`, { kind: "updated", subject: "project", id });
    return project;
  },
});

const before = z
  .string()
  .optional()
  .describe("The id of the column to put it before. Left out, it goes last.");

const columnAdd = write({
  name: "column-add",
  description: "Add a column to a project's board.",
  input: z.object({ project: z.string(), name, kind: Kind, before }),
  output: Project,
  run: ({ project, name, kind, before }, { catalog, log }) => {
    const column = catalog.addColumn(project, name, kind, before);
    log(`added column ${name} (${kind}) to ${project}`, {
      kind: "created",
      subject: "column",
      id: column.id,
    });
    return catalog.project(project);
  },
});

const columnRename = write({
  name: "column-rename",
  description: "Rename a column.",
  input: z.object({ column: z.string(), name }),
  output: Project,
  run: ({ column: id, name }, { catalog, log }) => {
    const was = catalog.column(id);
    catalog.renameColumn(id, name);
    log(`renamed column ${was.name} to ${name} in ${was.project}`, {
      kind: "updated",
      subject: "column",
      id,
    });
    return catalog.project(was.project);
  },
});

const columnKindSet = write({
  name: "column-kind-set",
  description: "Set what a column means: todo, doing, waiting or done.",
  input: z.object({ column: z.string(), kind: Kind }),
  output: Project,
  run: ({ column: id, kind }, { catalog, log }) => {
    const was = catalog.column(id);
    catalog.setColumnKind(id, kind);
    log(`set column ${was.name} in ${was.project} to ${kind}`, {
      kind: "updated",
      subject: "column",
      id,
    });
    return catalog.project(was.project);
  },
});

const columnMove = write({
  name: "column-move",
  description: "Move a column to another place on its board.",
  input: z.object({ column: z.string(), before }),
  output: Project,
  run: ({ column: id, before }, { catalog, log }) => {
    const was = catalog.column(id);
    const project = catalog.moveColumn(id, before);
    log(`moved column ${was.name} in ${was.project}`, { kind: "updated", subject: "column", id });
    return project;
  },
});

const columnRemove = write({
  name: "column-remove",
  description:
    "Remove a column. Its tickets move to the column before it, or after it for the first column.",
  input: z.object({ column: z.string() }),
  output: Project,
  run: ({ column: id }, { catalog, vacate, log }) => {
    const was = catalog.column(id);
    const { next } = catalog.removeColumn(id, vacate);
    log(`removed column ${was.name} from ${was.project}; its tickets moved to ${next.name}`, {
      kind: "deleted",
      subject: "column",
      id,
    });
    return catalog.project(was.project);
  },
});

const labelCreate = write({
  name: "label-create",
  description: "Create a label.",
  input: z.object({ name, colour: Colour }),
  output: Label,
  run: ({ name, colour }, { catalog, log }) => {
    const label = catalog.createLabel(name, colour);
    log(`created label ${name}`, { kind: "created", subject: "label", id: label.id });
    return label;
  },
});

const labelRename = write({
  name: "label-rename",
  description: "Rename a label.",
  input: z.object({ label: z.string(), name }),
  output: Label,
  run: ({ label: id, name }, { catalog, log }) => {
    const was = catalog.label(id).name;
    const label = catalog.renameLabel(id, name);
    log(`renamed label ${was} to ${name}`, { kind: "updated", subject: "label", id });
    return label;
  },
});

const labelColourSet = write({
  name: "label-colour-set",
  description: "Set a label's colour.",
  input: z.object({ label: z.string(), colour: Colour }),
  output: Label,
  run: ({ label: id, colour }, { catalog, log }) => {
    const label = catalog.setLabelColour(id, colour);
    log(`set label ${label.name} to ${colour}`, { kind: "updated", subject: "label", id });
    return label;
  },
});

const labelRemove = write({
  name: "label-remove",
  description: "Remove a label. Tickets no longer show it.",
  input: z.object({ label: z.string() }),
  output: Label,
  run: ({ label: id }, { catalog, log }) => {
    const label = catalog.removeLabel(id);
    log(`removed label ${label.name}`, { kind: "deleted", subject: "label", id });
    return label;
  },
});

export const catalogDomain = defineDomain<CatalogDeps>({
  name: "catalog",
  version: "1.0.0",
  about:
    "The actors, the projects with their columns, and the labels. Only the owner changes them.",
  actions: [
    catalogRead,
    actorCreate,
    actorRename,
    actorArchive,
    actorRestore,
    projectCreate,
    projectEdit,
    projectMove,
    projectArchive,
    projectRestore,
    columnAdd,
    columnRename,
    columnKindSet,
    columnMove,
    columnRemove,
    labelCreate,
    labelRename,
    labelColourSet,
    labelRemove,
  ],
  cards: [catalogChanged],
  authorise: (principal, action) => action.effect === "read" || principal.id === OWNER,
});
