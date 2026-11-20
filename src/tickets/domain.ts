// The tickets Domain: what agents and the owner do with tickets. A ticket
// can move from any column to any other. Agents archive and cancel; only
// the owner restores a ticket or deletes it for good.
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { type Catalog, OWNER } from "../catalog/catalog.js";
import {
  Board,
  Feature,
  Find,
  Narrow,
  Overview,
  Priority,
  Ticket,
  type Tickets,
  Type,
} from "./tickets.js";

export type TicketsDeps = Base & {
  catalog: Catalog;
  tickets: Tickets;
  now(): number;
  /** Deletes what other Domains keep about a ticket, before it is deleted for good. */
  purge(ticket: string): void;
  /** Leaves the note of a handoff on the ticket as a comment, for whoever it was handed to. */
  handoff(ticket: string, from: string, to: string, note: string): void;
};

const id = z.string().describe("A ticket id, like TLK-529.");
const one = z.object({ ticket: id });
const url = z
  .string()
  .trim()
  .max(2000)
  .regex(/^https?:\/\/\S+$/, "a link is a web address that starts with http:// or https://");

export const ticketList = defineCard({
  name: "tickets",
  version: 1,
  about: "A list of tickets.",
  view: {
    kind: "list",
    title: "Tickets",
    fields: [
      { label: "Id", path: "id" },
      { label: "Title", path: "title" },
      { label: "Column", path: "column.name" },
      { label: "Assigned", path: "assigneeName" },
    ],
  },
});

export const ticketCard = defineCard({
  name: "ticket",
  version: 1,
  about: "One ticket.",
  view: {
    kind: "record",
    title: "Ticket",
    fields: [
      { label: "Id", path: "id" },
      { label: "Title", path: "title" },
      { label: "Column", path: "column.name" },
      { label: "Assigned", path: "assigneeName" },
      { label: "Blocked", path: "blocked" },
    ],
  },
});

export const ticketChanged = defineCard({
  name: "ticket-changed",
  version: 1,
  about: "What a Call changed on a ticket.",
  view: { kind: "change", title: "Ticket changed" },
});

const read = <Input extends z.ZodType, Output extends z.ZodType>(
  definition: Parameters<typeof readAction<Input, Output, TicketsDeps>>[0],
) => readAction<Input, Output, TicketsDeps>(definition);

/** A write to one ticket: its change is recorded on that ticket. */
function write<Input extends z.ZodType>(definition: {
  name: string;
  description: string;
  input: Input;
  run(
    input: z.output<Input>,
    context: TicketsDeps & { actor: string },
  ): { ticket: Ticket; summary: string; kind?: "created" | "deleted" };
}) {
  const { run, ...rest } = definition;
  return writeAction<Input, typeof Ticket, TicketsDeps>("tickets", {
    ...rest,
    output: Ticket,
    card: ticketChanged,
    run: (input, context) => {
      const { ticket, summary, kind } = run(input, { ...context, actor: context.principal.id });
      context.log(
        summary,
        { kind: kind ?? "updated", subject: "ticket", id: ticket.id },
        ticket.id,
      );
      return ticket;
    },
  });
}

const boardRead = read({
  name: "board-read",
  description:
    "Read a project's board: its columns in order, each with its open tickets. Can be narrowed by words or by who a ticket is assigned to.",
  input: Narrow.extend({ project: z.string().describe("A project id, like TLK.") }),
  output: Board,
  run: ({ project, ...narrow }, { tickets }) => tickets.board(project, narrow),
});

const overviewRead = read({
  name: "overview-read",
  description:
    "Read the open tickets of every project, lined up by column kind: to do, doing, waiting, done. Can be narrowed like a board.",
  input: Narrow,
  output: Overview,
  run: (narrow, { tickets }) => tickets.overview(narrow),
});

const ticketRead = read({
  name: "ticket-read",
  description: "Read one ticket.",
  input: one,
  output: Ticket,
  card: ticketCard,
  run: ({ ticket }, { tickets }) => tickets.get(ticket),
});

const ticketFind = read({
  name: "ticket-find",
  description:
    "Find tickets, oldest first. Every filter is optional; a column's kind says what the column means.",
  input: Find,
  output: z.array(Ticket),
  card: ticketList,
  run: (filter, { tickets }) => tickets.find(filter),
});

const workFind = read({
  name: "work-find",
  description:
    "Find work to do: open tickets on a board, in to-do columns, that are not blocked and are assigned to you or to nobody, oldest first.",
  input: z.object({ project: z.string().optional() }),
  output: z.array(Ticket),
  card: ticketList,
  run: ({ project }, { tickets, principal }) =>
    tickets
      .find({ project, kind: "todo", blocked: false, backlog: false })
      .filter((t) => t.assignee === null || t.assignee === principal.id),
});

const ticketCreate = write({
  name: "ticket-create",
  description:
    "Create a ticket. It starts in the project's first to-do column unless you name a column.",
  input: z.object({
    project: z.string(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(20_000).default(""),
    column: z.string().optional().describe("A column id on the project's board."),
    labels: z.array(z.string()).max(20).default([]).describe("Label ids."),
    assignee: z.string().optional().describe("An actor id."),
    feature: z.string().optional().describe("The id of a feature of the project."),
    location: z.string().optional().describe("The id of the location its work is done at."),
    type: Type.optional().describe("task if left out."),
    priority: Priority.optional().describe("none if left out."),
    links: z.array(url).max(50).optional(),
    backlog: z
      .boolean()
      .default(false)
      .describe("True to put it in the backlog, to wait there until it is put on the board."),
  }),
  run: (input, { tickets, actor, now }) => {
    const ticket = tickets.create(actor, new Date(now()).toISOString(), input);
    return {
      ticket,
      summary: `created ${ticket.id} in ${ticket.backlog ? "the backlog" : ticket.column.name}: ${ticket.title}`,
      kind: "created",
    };
  },
});

const ticketEdit = write({
  name: "ticket-edit",
  description: "Change a ticket's title, its description, or both.",
  input: z.object({
    ticket: id,
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(20_000).optional(),
  }),
  run: ({ ticket, title, description }, { tickets }) => {
    const parts = [
      title === undefined ? "" : "title",
      description === undefined ? "" : "description",
    ];
    return {
      ticket: tickets.edit(ticket, { title, description }),
      summary: `edited the ${parts.filter(Boolean).join(" and ") || "ticket"} of ${ticket}`,
    };
  },
});

const ticketMove = write({
  name: "ticket-move",
  description: "Move a ticket to any column of its board.",
  input: z.object({ ticket: id, column: z.string().describe("A column id.") }),
  run: ({ ticket, column }, { tickets }) => {
    const from = tickets.get(ticket).column.name;
    const moved = tickets.move(ticket, column);
    return { ticket: moved, summary: `moved ${ticket} from ${from} to ${moved.column.name}` };
  },
});

const ticketClaim = write({
  name: "ticket-claim",
  description: "Claim a ticket: assign it to yourself and move it to the first doing column.",
  input: one,
  run: ({ ticket }, { tickets, actor }) => {
    tickets.assign(ticket, actor);
    const claimed = tickets.moveToKind(ticket, "doing");
    return { ticket: claimed, summary: `claimed ${ticket} and moved it to ${claimed.column.name}` };
  },
});

const ticketReviewRequest = write({
  name: "ticket-review-request",
  description: "Ask for review: move a ticket to the first waiting column.",
  input: one,
  run: ({ ticket }, { tickets }) => {
    const moved = tickets.moveToKind(ticket, "waiting");
    return {
      ticket: moved,
      summary: `asked for review of ${ticket}; it is in ${moved.column.name}`,
    };
  },
});

const ticketFinish = write({
  name: "ticket-finish",
  description: "Finish a ticket: move it to the first done column.",
  input: one,
  run: ({ ticket }, { tickets }) => {
    const moved = tickets.moveToKind(ticket, "done");
    return { ticket: moved, summary: `finished ${ticket}; it is in ${moved.column.name}` };
  },
});

const ticketAssign = write({
  name: "ticket-assign",
  description:
    "Assign a ticket to an actor, to hand it on, or to nobody with null. A note says what the next actor needs to know; it is left as a comment on the ticket.",
  input: z.object({
    ticket: id,
    actor: z.string().nullable(),
    note: z.string().trim().min(1).max(5000).optional().describe("A handoff note."),
  }),
  run: ({ ticket, actor, note }, { tickets, handoff, actor: from }) => {
    const assigned = tickets.assign(ticket, actor);
    if (note && actor) handoff(ticket, from, actor, note);
    return {
      ticket: assigned,
      summary: actor
        ? `assigned ${ticket} to ${assigned.assigneeName}`
        : `assigned ${ticket} to nobody`,
    };
  },
});

const ticketLocationSet = write({
  name: "ticket-location-set",
  description: "Set the location a ticket's work is done at, such as a machine, or none with null.",
  input: z.object({ ticket: id, location: z.string().nullable() }),
  run: ({ ticket, location }, { tickets }) => {
    const changed = tickets.setLocation(ticket, location);
    return {
      ticket: changed,
      summary: location
        ? `set the location of ${ticket} to ${changed.locationName}`
        : `removed the location of ${ticket}`,
    };
  },
});

const ticketTypeSet = write({
  name: "ticket-type-set",
  description: "Set what kind of work a ticket is: task, bug, improvement or specification.",
  input: z.object({ ticket: id, type: Type }),
  run: ({ ticket, type }, { tickets }) => ({
    ticket: tickets.setType(ticket, type),
    summary: `set the type of ${ticket} to ${type}`,
  }),
});

const ticketPrioritySet = write({
  name: "ticket-priority-set",
  description: "Set a ticket's priority: none, urgent, high, medium or low.",
  input: z.object({ ticket: id, priority: Priority }),
  run: ({ ticket, priority }, { tickets }) => ({
    ticket: tickets.setPriority(ticket, priority),
    summary: `set the priority of ${ticket} to ${priority}`,
  }),
});

const emoji = z.string().min(1).max(16).describe("One emoji, such as 👍.");

const ticketReactionAdd = write({
  name: "ticket-reaction-add",
  description:
    "React to a ticket with an emoji. An actor can add several different emoji to one ticket, each one once.",
  input: z.object({ ticket: id, emoji }),
  run: ({ ticket, emoji }, { tickets, actor }) => ({
    ticket: tickets.react(ticket, actor, emoji),
    summary: `reacted ${emoji} to ${ticket}`,
  }),
});

const ticketReactionRemove = write({
  name: "ticket-reaction-remove",
  description: "Take back your reaction to a ticket.",
  input: z.object({ ticket: id, emoji }),
  run: ({ ticket, emoji }, { tickets, actor }) => ({
    ticket: tickets.unreact(ticket, actor, emoji),
    summary: `took back ${emoji} from ${ticket}`,
  }),
});

const ticketLinkAdd = write({
  name: "ticket-link-add",
  description: "Add a link to a ticket: a web address that belongs to it, such as a pull request.",
  input: z.object({ ticket: id, url }),
  run: ({ ticket, url }, { tickets }) => ({
    ticket: tickets.addLink(ticket, url),
    summary: `added a link to ${ticket}: ${url}`,
  }),
});

const ticketLinkRemove = write({
  name: "ticket-link-remove",
  description: "Remove a link from a ticket.",
  input: z.object({ ticket: id, link: z.string().describe("The id of the link.") }),
  run: ({ ticket, link }, { tickets }) => ({
    ticket: tickets.removeLink(ticket, link),
    summary: `removed a link from ${ticket}`,
  }),
});

const backlogRead = read({
  name: "backlog-read",
  description:
    "Read a project's backlog: open tickets that wait off the board, oldest first. Can be narrowed like a board.",
  input: Narrow.extend({ project: z.string() }),
  output: z.array(Ticket),
  card: ticketList,
  run: ({ project, ...narrow }, { tickets }) => tickets.backlog(project, narrow),
});

const ticketBacklogSend = write({
  name: "ticket-backlog-send",
  description: "Send a ticket to its project's backlog, off the board.",
  input: one,
  run: ({ ticket }, { tickets }) => ({
    ticket: tickets.setBacklog(ticket, true),
    summary: `sent ${ticket} to the backlog`,
  }),
});

const ticketBoardSend = write({
  name: "ticket-board-send",
  description: "Put a backlog ticket on the board, in the first to-do column.",
  input: one,
  run: ({ ticket }, { tickets }) => {
    const sent = tickets.setBacklog(ticket, false);
    return { ticket: sent, summary: `put ${ticket} on the board in ${sent.column.name}` };
  },
});

const ticketFeatureSet = write({
  name: "ticket-feature-set",
  description: "Put a ticket in a feature of its project, or in no feature with null.",
  input: z.object({ ticket: id, feature: z.string().nullable() }),
  run: ({ ticket, feature }, { tickets }) => {
    const changed = tickets.setFeature(ticket, feature);
    return {
      ticket: changed,
      summary: feature
        ? `put ${ticket} in the feature ${changed.featureName}`
        : `took ${ticket} out of its feature`,
    };
  },
});

// ---- features ----

export const featureList = defineCard({
  name: "features",
  version: 1,
  about: "A list of a project's features.",
  view: {
    kind: "list",
    title: "Features",
    fields: [
      { label: "Id", path: "id" },
      { label: "Feature", path: "name" },
      { label: "Open tickets", path: "tickets" },
    ],
  },
});

export const featureChanged = defineCard({
  name: "feature-changed",
  version: 1,
  about: "What a Call changed in a project's features.",
  view: { kind: "change", title: "Features changed" },
});

const featureName = z.string().trim().min(1).max(80);

const featureWrite = <Input extends z.ZodType>(
  definition: Omit<Parameters<typeof writeAction<Input, typeof Feature, TicketsDeps>>[1], "output">,
) =>
  writeAction<Input, typeof Feature, TicketsDeps>("tickets", {
    card: featureChanged,
    output: Feature,
    ...definition,
  });

const featureFind = read({
  name: "feature-find",
  description: "List a project's features, each with how many open tickets belong to it.",
  input: z.object({
    project: z.string(),
    archived: z.boolean().default(false).describe("True to include archived features."),
  }),
  output: z.array(Feature),
  card: featureList,
  run: ({ project, archived }, { tickets }) => tickets.features(project, archived),
});

const featureCreate = featureWrite({
  name: "feature-create",
  description: "Create a feature: one part of a project, which groups the tickets for that part.",
  input: z.object({
    project: z.string(),
    name: featureName,
    description: z.string().max(2000).default(""),
  }),
  run: ({ project, name, description }, { tickets, log }) => {
    const feature = tickets.createFeature(project, name, description);
    log(`created the feature ${name} in ${project}`, {
      kind: "created",
      subject: "feature",
      id: feature.id,
    });
    return feature;
  },
});

const featureEdit = featureWrite({
  name: "feature-edit",
  description: "Change a feature's name or description, or mark it as a favourite.",
  input: z.object({
    feature: z.string(),
    name: featureName.optional(),
    description: z.string().max(2000).optional(),
    favourite: z.boolean().optional(),
  }),
  run: ({ feature: featureId, ...patch }, { tickets, log }) => {
    const feature = tickets.editFeature(featureId, patch);
    log(`changed the feature ${feature.name}`, {
      kind: "updated",
      subject: "feature",
      id: featureId,
    });
    return feature;
  },
});

const featureArchive = featureWrite({
  name: "feature-archive",
  description: "Archive a feature. Its tickets keep it; no new ticket can be put in it.",
  input: z.object({ feature: z.string() }),
  run: ({ feature: featureId }, { tickets, log }) => {
    const feature = tickets.archiveFeature(featureId, true);
    log(`archived the feature ${feature.name}`, {
      kind: "updated",
      subject: "feature",
      id: featureId,
    });
    return feature;
  },
});

const featureRestore = featureWrite({
  name: "feature-restore",
  description: "Restore an archived feature.",
  input: z.object({ feature: z.string() }),
  run: ({ feature: featureId }, { tickets, log }) => {
    const feature = tickets.archiveFeature(featureId, false);
    log(`restored the feature ${feature.name}`, {
      kind: "updated",
      subject: "feature",
      id: featureId,
    });
    return feature;
  },
});

const ticketLabelAdd = write({
  name: "ticket-label-add",
  description: "Add a label to a ticket.",
  input: z.object({ ticket: id, label: z.string().describe("A label id.") }),
  run: ({ ticket, label }, { tickets, catalog }) => ({
    ticket: tickets.addLabel(ticket, label),
    summary: `added the label ${catalog.label(label).name} to ${ticket}`,
  }),
});

const ticketLabelRemove = write({
  name: "ticket-label-remove",
  description: "Remove a label from a ticket.",
  input: z.object({ ticket: id, label: z.string().describe("A label id.") }),
  run: ({ ticket, label }, { tickets, catalog }) => ({
    ticket: tickets.removeLabel(ticket, label),
    summary: `removed the label ${catalog.label(label).name} from ${ticket}`,
  }),
});

const ticketBlock = write({
  name: "ticket-block",
  description:
    "Mark a ticket blocked, with a note saying why. It stays in its column; agents looking for work skip it.",
  input: z.object({ ticket: id, note: z.string().trim().min(1).max(500) }),
  run: ({ ticket, note }, { tickets }) => ({
    ticket: tickets.block(ticket, note),
    summary: `marked ${ticket} blocked: ${note}`,
  }),
});

const ticketUnblock = write({
  name: "ticket-unblock",
  description: "Mark a ticket no longer blocked.",
  input: one,
  run: ({ ticket }, { tickets }) => ({
    ticket: tickets.block(ticket, null),
    summary: `unblocked ${ticket}`,
  }),
});

const ticketArchive = write({
  name: "ticket-archive",
  description:
    "Archive a ticket. It leaves the board and keeps its column; the owner can restore it.",
  input: one,
  run: ({ ticket }, { tickets }) => ({
    ticket: tickets.setState(ticket, "archived"),
    summary: `archived ${ticket}`,
  }),
});

const ticketCancel = write({
  name: "ticket-cancel",
  description: "Cancel a ticket. It goes to the Archive as canceled; the owner can restore it.",
  input: one,
  run: ({ ticket }, { tickets }) => ({
    ticket: tickets.setState(ticket, "canceled"),
    summary: `canceled ${ticket}`,
  }),
});

const ticketRestore = write({
  name: "ticket-restore",
  description:
    "Restore an archived or canceled ticket to the column it was in. Only the owner can.",
  input: one,
  run: ({ ticket }, { tickets }) => {
    const restored = tickets.setState(ticket, "open");
    return { ticket: restored, summary: `restored ${ticket} to ${restored.column.name}` };
  },
});

const ticketDelete = writeAction<typeof one, z.ZodObject<{ deleted: z.ZodString }>, TicketsDeps>(
  "tickets",
  {
    name: "ticket-delete",
    description:
      "Delete a ticket for good, with its comments and images. It cannot be undone. Only the owner can.",
    input: one,
    output: z.object({ deleted: z.string() }),
    card: ticketChanged,
    run: ({ ticket }, { tickets, purge, journal, principal, change }) => {
      const { title } = tickets.get(ticket);
      purge(ticket);
      tickets.purge(ticket);
      journal.seal(ticket);
      journal.record({
        actor: principal.id,
        action: "tickets.ticket-delete",
        summary: `deleted ${ticket} for good: ${title}`,
        ticket,
        final: true,
      });
      change({ kind: "deleted", subject: "ticket", id: ticket });
      return { deleted: ticket };
    },
  },
);

const OWNER_ONLY: readonly string[] = [ticketRestore.name, ticketDelete.name];

export const ticketsDomain = defineDomain<TicketsDeps>({
  name: "tickets",
  version: "1.0.0",
  about:
    "Tickets on project boards: find work, claim it, move it on, hand it on. Every change is recorded with its actor.",
  actions: [
    workFind,
    ticketFind,
    ticketRead,
    boardRead,
    overviewRead,
    backlogRead,
    ticketCreate,
    ticketClaim,
    ticketMove,
    ticketReviewRequest,
    ticketFinish,
    ticketAssign,
    ticketEdit,
    ticketBacklogSend,
    ticketBoardSend,
    ticketFeatureSet,
    ticketLocationSet,
    ticketTypeSet,
    ticketPrioritySet,
    ticketLinkAdd,
    ticketLinkRemove,
    ticketReactionAdd,
    ticketReactionRemove,
    ticketLabelAdd,
    ticketLabelRemove,
    ticketBlock,
    ticketUnblock,
    ticketArchive,
    ticketCancel,
    ticketRestore,
    ticketDelete,
    featureFind,
    featureCreate,
    featureEdit,
    featureArchive,
    featureRestore,
  ],
  cards: [ticketList, ticketCard, ticketChanged, featureList, featureChanged],
  // Only the owner restores a ticket. Deleting one for good is for the owner
  // on the page: no Connection or step can do it, whoever it acts as.
  authorise: (principal, action, from) => {
    if (action.name === ticketDelete.name) return principal.id === OWNER && from?.caller === "ui";
    return principal.id === OWNER || !OWNER_ONLY.includes(action.name);
  },
});
