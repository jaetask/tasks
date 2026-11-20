// The catalog Domain: actors, projects with their columns, labels and locations.
// Anyone may read it; only the owner changes it.
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import {
  Actor,
  CardProperty,
  type Catalog,
  CatalogView,
  Colour,
  type Column,
  Kind,
  Label,
  Location,
  OWNER,
  PROJECT_ICONS,
  Project,
  ProjectColour,
} from "./catalog.js";

export type CatalogDeps = Base & {
  catalog: Catalog;
  /** Moves every ticket in a column to another column of the same board. */
  vacate(from: string, to: Column): void;
};

const name = z.string().trim().min(1).max(60);
const icon = z.string().trim().max(16).describe("An emoji, or empty for none.");
// A word in small letters must be one of the icon names; anything else is an emoji.
const projectIcon = z
  .string()
  .trim()
  .max(16)
  .refine(
    (v) => !/^[a-z-]+$/.test(v) || (PROJECT_ICONS as readonly string[]).includes(v),
    `an icon is one of: ${PROJECT_ICONS.join(", ")}`,
  )
  .describe(`An icon name (${PROJECT_ICONS.join(", ")}), an emoji, or empty for none.`);
const prefix = z
  .string()
  .regex(/^[A-Z]{1,6}$/, "a prefix is 1 to 6 capital letters, like TLK")
  .describe("The project's id and the start of its ticket ids, like TLK.");

export const catalogChanged = defineCard({
  name: "catalog-changed",
  version: 1,
  about: "What a Call changed in the actors, projects, columns, labels or locations.",
  view: { kind: "change", title: "Catalog changed" },
});

const write = <Input extends z.ZodType, Output extends z.ZodType>(
  definition: Parameters<typeof writeAction<Input, Output, CatalogDeps>>[1],
) => writeAction<Input, Output, CatalogDeps>("catalog", { card: catalogChanged, ...definition });

export const catalogRead = readAction({
  name: "catalog-read",
  description: "List the actors, the projects with their columns, the labels and the locations.",
  input: z.object({}),
  output: CatalogView,
  run: (_input, { catalog }: CatalogDeps) => catalog.read(),
});

const actorCreate = write({
  name: "actor-create",
  description: "Add an actor for an agent. A Connection acts as an actor.",
  input: z.object({ name, icon: icon.default("") }),
  output: Actor,
  run: ({ name, icon }, { catalog, log }) => {
    const actor = catalog.createActor(name, icon);
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

const actorIconSet = write({
  name: "actor-icon-set",
  description: "Set the icon shown beside an actor's name: an emoji, or empty for none.",
  input: z.object({ actor: z.string(), icon }),
  output: Actor,
  run: ({ actor: id, icon }, { catalog, log }) => {
    const actor = catalog.setActorIcon(id, icon);
    log(
      icon
        ? `set the icon of actor ${actor.name} to ${icon}`
        : `removed the icon of actor ${actor.name}`,
      { kind: "updated", subject: "actor", id },
    );
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
    "Change a project's name, its icon or its colour. Its prefix and ticket ids stay the same.",
  input: z.object({
    project: z.string(),
    name: name.optional(),
    icon: projectIcon.optional(),
    colour: ProjectColour.optional(),
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

const projectCardSet = write({
  name: "project-card-set",
  description:
    "Choose what a ticket's card shows on a project's board and backlog, besides its title. With null, the usual set.",
  input: z.object({ project: z.string(), show: z.array(CardProperty).nullable() }),
  output: Project,
  run: ({ project: id, show }, { catalog, log }) => {
    const project = catalog.setCard(id, show === null ? null : [...new Set(show)]);
    log(`chose what cards show on the board of ${project.name}`, {
      kind: "updated",
      subject: "project",
      id,
    });
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

const locationCreate = write({
  name: "location-create",
  description: "Add a location: a place where a ticket's work is done, such as a machine.",
  input: z.object({ name }),
  output: Location,
  run: ({ name }, { catalog, log }) => {
    const location = catalog.createLocation(name);
    log(`added location ${name}`, { kind: "created", subject: "location", id: location.id });
    return location;
  },
});

const locationRename = write({
  name: "location-rename",
  description: "Rename a location.",
  input: z.object({ location: z.string(), name }),
  output: Location,
  run: ({ location: id, name }, { catalog, log }) => {
    const was = catalog.location(id).name;
    const location = catalog.renameLocation(id, name);
    log(`renamed location ${was} to ${name}`, { kind: "updated", subject: "location", id });
    return location;
  },
});

const locationArchive = write({
  name: "location-archive",
  description:
    "Archive a location. No more tickets can be given it; tickets that have it keep showing it.",
  input: z.object({ location: z.string() }),
  output: Location,
  run: ({ location: id }, { catalog, log }) => {
    const location = catalog.archiveLocation(id, true);
    log(`archived location ${location.name}`, { kind: "updated", subject: "location", id });
    return location;
  },
});

const locationRestore = write({
  name: "location-restore",
  description: "Restore an archived location.",
  input: z.object({ location: z.string() }),
  output: Location,
  run: ({ location: id }, { catalog, log }) => {
    const location = catalog.archiveLocation(id, false);
    log(`restored location ${location.name}`, { kind: "updated", subject: "location", id });
    return location;
  },
});

export const catalogDomain = defineDomain<CatalogDeps>({
  name: "catalog",
  version: "1.0.0",
  about:
    "The actors, the projects with their columns, the labels and the locations. Only the owner changes them.",
  actions: [
    catalogRead,
    actorCreate,
    actorRename,
    actorIconSet,
    actorArchive,
    actorRestore,
    projectCreate,
    projectEdit,
    projectCardSet,
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
    locationCreate,
    locationRename,
    locationArchive,
    locationRestore,
  ],
  cards: [catalogChanged],
  authorise: (principal, action) => action.effect === "read" || principal.id === OWNER,
});
