// The tickets Domain: what agents and the owner do with tickets. A ticket
// can move from any column to any other. Agents archive and cancel; only
// the owner restores a ticket or deletes it for good.
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { type Catalog, OWNER } from "../catalog/catalog.js";
import { Board, Find, Ticket, type Tickets } from "./tickets.js";

export type TicketsDeps = Base & {
  catalog: Catalog;
  tickets: Tickets;
  now(): number;
  /** Deletes what other Domains keep about a ticket, before it is deleted for good. */
  purge(ticket: string): void;
};

const id = z.string().describe("A ticket id, like TLK-529.");
const one = z.object({ ticket: id });

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
  description: "Read a project's board: its columns in order, each with its open tickets.",
  input: z.object({ project: z.string().describe("A project id, like TLK.") }),
  output: Board,
  run: ({ project }, { tickets }) => tickets.board(project),
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
    "Find work to do: open tickets in to-do columns that are not blocked and are assigned to you or to nobody, oldest first.",
  input: z.object({ project: z.string().optional() }),
  output: z.array(Ticket),
  card: ticketList,
  run: ({ project }, { tickets, principal }) =>
    tickets
      .find({ project, kind: "todo", blocked: false })
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
  }),
  run: (input, { tickets, actor, now }) => {
    const ticket = tickets.create(actor, new Date(now()).toISOString(), input);
    return {
      ticket,
      summary: `created ${ticket.id} in ${ticket.column.name}: ${ticket.title}`,
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
  description: "Assign a ticket to an actor, to hand it on, or to nobody with null.",
  input: z.object({ ticket: id, actor: z.string().nullable() }),
  run: ({ ticket, actor }, { tickets }) => {
    const assigned = tickets.assign(ticket, actor);
    return {
      ticket: assigned,
      summary: actor
        ? `assigned ${ticket} to ${assigned.assigneeName}`
        : `assigned ${ticket} to nobody`,
    };
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
    ticketCreate,
    ticketClaim,
    ticketMove,
    ticketReviewRequest,
    ticketFinish,
    ticketAssign,
    ticketEdit,
    ticketLabelAdd,
    ticketLabelRemove,
    ticketBlock,
    ticketUnblock,
    ticketArchive,
    ticketCancel,
    ticketRestore,
    ticketDelete,
  ],
  cards: [ticketList, ticketCard, ticketChanged],
  authorise: (principal, action) => principal.id === OWNER || !OWNER_ONLY.includes(action.name),
});
