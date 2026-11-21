import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { type Catalog, OWNER } from "../catalog/catalog.js";
import { Refusal } from "../refusal.js";
import type { Tickets } from "../tickets/tickets.js";
import { Condition, type Inbox, IntakeAction, Item, ItemState, Step, StepKind } from "./inbox.js";
import { Run } from "./runs.js";

export type InboxDeps = Base & {
  catalog: Catalog;
  tickets: Pick<Tickets, "get" | "create">;
  inbox: Inbox;
  runs(item: string): Run[];
  now(): number;
};

export const itemList = defineCard({
  name: "inbox-items",
  version: 1,
  about: "A list of inbox items.",
  view: {
    kind: "list",
    title: "Inbox",
    fields: [
      { label: "Id", path: "id" },
      { label: "Title", path: "title" },
      { label: "State", path: "state" },
      { label: "Category", path: "category" },
    ],
  },
});

export const inboxChanged = defineCard({
  name: "inbox-changed",
  version: 1,
  about: "What a Call changed in the inbox or its steps.",
  view: { kind: "change", title: "Inbox changed" },
});

const item = z.string().describe("An inbox item id, like n12.");
const tag = z.string().trim().min(1).max(40);
const reason = z.string().trim().min(1).max(500);

const read = <Input extends z.ZodType, Output extends z.ZodType>(
  definition: Parameters<typeof readAction<Input, Output, InboxDeps>>[0],
) => readAction<Input, Output, InboxDeps>(definition);

function write<Input extends z.ZodType>(definition: {
  name: string;
  description: string;
  input: Input;
  run(
    input: z.output<Input>,
    context: InboxDeps & { actor: string; at: string },
  ): { item: Item; summary: string; kind?: "created"; ticket?: string };
}) {
  const { run, ...rest } = definition;
  return writeAction<Input, typeof Item, InboxDeps>("inbox", {
    ...rest,
    output: Item,
    card: inboxChanged,
    run: (input, context) => {
      const result = run(input, {
        ...context,
        actor: context.principal.id,
        at: new Date(context.now()).toISOString(),
      });
      context.log(
        result.summary,
        { kind: result.kind ?? "updated", subject: "item", id: result.item.id },
        result.ticket,
      );
      return result.item;
    },
  });
}

const inboxRead = read({
  name: "inbox-read",
  description:
    "List inbox items, oldest first: all of them, those sent to one project, those in one state, or both.",
  input: z.object({ project: z.string().optional(), state: ItemState.optional() }),
  output: z.array(Item),
  card: itemList,
  run: ({ project, state }, { inbox, catalog }) => {
    if (project !== undefined) catalog.project(project);
    return inbox.items({ project, state });
  },
});

const itemRead = read({
  name: "item-read",
  description: "Read one inbox item, with the record of each run of the steps on it.",
  input: z.object({ item }),
  output: z.object({ item: Item, runs: z.array(Run) }),
  run: ({ item: id }, { inbox, runs }) => ({ item: inbox.item(id), runs: runs(id) }),
});

const itemCapture = write({
  name: "item-capture",
  description:
    "Put a new idea or request in a project's inbox. The owner's steps look at it before it lands there.",
  input: z.object({
    project: z.string().describe("The project it is for."),
    text: z.string().trim().min(1).max(20_000),
    title: z
      .string()
      .trim()
      .max(200)
      .optional()
      .describe("The first line of the text if left out."),
    source: z.string().trim().min(1).max(40).default("page").describe("Where it came from."),
  }),
  run: ({ project, text, title, source }, { inbox, catalog, actor, at }) => {
    if (catalog.project(project).archived) {
      throw new Refusal("archived-project", `Project ${project} is archived.`);
    }
    const first = (text.split("\n")[0] as string).slice(0, 200);
    const captured = inbox.capture(actor, at, { project, title: title || first, text, source });
    return {
      item: captured,
      summary: `captured ${captured.id} for ${project}: ${captured.title}`,
      kind: "created",
    };
  },
});

const itemTag = write({
  name: "item-tag",
  description: "Add tags to an inbox item.",
  input: z.object({ item, tags: z.array(tag).min(1).max(20) }),
  run: ({ item: id, tags }, { inbox }) => ({
    item: inbox.change(id, { tags: [...new Set([...inbox.item(id).tags, ...tags])] }),
    summary: `tagged ${id} ${tags.join(", ")}`,
  }),
});

const itemUntag = write({
  name: "item-untag",
  description: "Remove tags from an inbox item.",
  input: z.object({ item, tags: z.array(tag).min(1).max(20) }),
  run: ({ item: id, tags }, { inbox }) => ({
    item: inbox.change(id, { tags: inbox.item(id).tags.filter((t) => !tags.includes(t)) }),
    summary: `removed the tags ${tags.join(", ")} from ${id}`,
  }),
});

const itemCategorySet = write({
  name: "item-category-set",
  description: "Sort an inbox item into a category, or out of its category with null.",
  input: z.object({ item, category: z.string().trim().min(1).max(40).nullable() }),
  run: ({ item: id, category }, { inbox }) => ({
    item: inbox.change(id, { category }),
    summary: category ? `sorted ${id} into ${category}` : `took ${id} out of its category`,
  }),
});

const itemFieldsSet = write({
  name: "item-fields-set",
  description: "Keep details pulled out of an inbox item, as named fields.",
  input: z.object({ item, fields: z.record(z.string().min(1).max(40), z.string().max(500)) }),
  run: ({ item: id, fields }, { inbox }) => ({
    item: inbox.change(id, { fields: { ...inbox.item(id).fields, ...fields } }),
    summary: `set ${Object.keys(fields).join(", ")} on ${id}`,
  }),
});

const itemFieldsClear = write({
  name: "item-fields-clear",
  description: "Remove fields from an inbox item: the ones named, or all of them.",
  input: z.object({ item, fields: z.array(z.string()).optional() }),
  run: ({ item: id, fields }, { inbox }) => {
    const kept = Object.entries(inbox.item(id).fields).filter(
      ([name]) => fields !== undefined && !fields.includes(name),
    );
    return {
      item: inbox.change(id, { fields: Object.fromEntries(kept) }),
      summary: `cleared ${fields ? fields.join(", ") : "the fields"} on ${id}`,
    };
  },
});

const itemEdit = write({
  name: "item-edit",
  description:
    "Change an inbox item's title, its text, or both, such as to tidy it. The item as captured is kept beside it.",
  input: z.object({
    item,
    title: z.string().trim().min(1).max(200).optional(),
    text: z.string().trim().min(1).max(20_000).optional(),
  }),
  run: ({ item: id, title, text }, { inbox }) => ({
    item: inbox.change(id, {
      ...(title === undefined ? {} : { title }),
      ...(text === undefined ? {} : { text }),
    }),
    summary: `edited ${id}`,
  }),
});

const itemAccept = write({
  name: "item-accept",
  description: "Accept an inbox item: it is worth keeping, and stays in the inbox as accepted.",
  input: z.object({ item, reason: reason.optional() }),
  run: ({ item: id, reason }, { inbox }) => ({
    item: inbox.settle(id, "accepted", reason ?? null),
    summary: `accepted ${id}`,
  }),
});

const itemReject = write({
  name: "item-reject",
  description: "Reject an inbox item, such as spam, with the reason.",
  input: z.object({ item, reason }),
  run: ({ item: id, reason }, { inbox }) => ({
    item: inbox.settle(id, "rejected", reason),
    summary: `rejected ${id}: ${reason}`,
  }),
});

const itemDismiss = write({
  name: "item-dismiss",
  description: "Dismiss an inbox item that needs nothing done, with the reason.",
  input: z.object({ item, reason }),
  run: ({ item: id, reason }, { inbox }) => ({
    item: inbox.settle(id, "dismissed", reason),
    summary: `dismissed ${id}: ${reason}`,
  }),
});

const itemPromote = write({
  name: "item-promote",
  description:
    "Turn an inbox item into a ticket in its project's backlog, or on the board in the first to-do column.",
  input: z.object({
    item,
    backlog: z.boolean().default(true).describe("False to put the ticket straight on the board."),
  }),
  run: ({ item: id, backlog }, { inbox, tickets, actor, at }) => {
    const found = inbox.item(id);
    const ticket = tickets.create(actor, at, {
      project: found.project,
      title: found.title,
      description: found.text,
      labels: [],
      backlog,
    });
    return {
      item: inbox.settle(id, "promoted", null, ticket.id),
      summary: `turned ${id} into ${ticket.id}: ${ticket.title}`,
      ticket: ticket.id,
    };
  },
});

const itemLink = write({
  name: "item-link",
  description: "Link an inbox item to a ticket that already covers it.",
  input: z.object({ item, ticket: z.string() }),
  run: ({ item: id, ticket }, { inbox, tickets }) => {
    tickets.get(ticket);
    return {
      item: inbox.settle(id, "linked", null, ticket),
      summary: `linked ${id} to ${ticket}`,
      ticket,
    };
  },
});

const itemRun = writeAction<z.ZodObject<{ item: typeof item }>, typeof Item, InboxDeps>("inbox", {
  name: "item-run",
  description: "Run the steps on an inbox item again, such as after changing the steps.",
  input: z.object({ item }),
  output: Item,
  run: ({ item: id }, { inbox, change }) => {
    const found = inbox.item(id);
    change({ kind: "updated", subject: "item-run", id });
    return found;
  },
});

const stepFields = {
  name: z.string().trim().min(1).max(60),
  kind: StepKind,
  actor: z.string().describe("The id of the actor the step's changes show under. Never the owner."),
  actions: z.array(IntakeAction).min(1).describe("The Actions the step may ask for."),
  condition: Condition.nullable().describe("Which items it runs on. Null for every item."),
  config: z
    .record(z.string(), z.unknown())
    .describe(
      "What its kind needs. script: file. local-model and hosted-model: url, model, instructions, and key_env for hosted. classifier: url, model, labels. app: action.",
    ),
  on: z.boolean(),
};

const stepWrite = <Input extends z.ZodType, Output extends z.ZodType>(
  definition: Parameters<typeof writeAction<Input, Output, InboxDeps>>[1],
) => writeAction<Input, Output, InboxDeps>("inbox", { card: inboxChanged, ...definition });

function checkActor(catalog: Catalog, id: string) {
  const actor = catalog.actor(id);
  if (actor.id === OWNER) {
    throw new Refusal("owner", "A step cannot act as the owner. Pick another actor.");
  }
  if (actor.archived) throw new Refusal("archived-actor", `${actor.name} is archived.`);
}

const pipelineRead = read({
  name: "pipeline-read",
  description: "List the inbox steps, in the order they run.",
  input: z.object({}),
  output: z.array(Step),
  run: (_input, { inbox }) => inbox.steps(),
});

const stepAdd = stepWrite({
  name: "step-add",
  description:
    "Add a step that looks at each new inbox item. It may ask only for the Actions you give it.",
  input: z.object({
    ...stepFields,
    condition: stepFields.condition.default(null),
    config: stepFields.config.default({}),
    on: stepFields.on.default(true),
    before: z
      .string()
      .optional()
      .describe("The id of the step to put it before. Last if left out."),
  }),
  output: Step,
  run: ({ before, ...step }, { inbox, catalog, log }) => {
    checkActor(catalog, step.actor);
    const added = inbox.addStep(step, before);
    log(`added the inbox step ${added.name}`, { kind: "created", subject: "step", id: added.id });
    return added;
  },
});

const stepEdit = stepWrite({
  name: "step-edit",
  description:
    "Change an inbox step: its name, kind, actor, Actions, condition, settings, or whether it is on.",
  input: z.object(stepFields).partial().extend({ step: z.string() }),
  output: Step,
  run: ({ step: id, ...patch }, { inbox, catalog, log }) => {
    if (patch.actor !== undefined) checkActor(catalog, patch.actor);
    const given = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const edited = inbox.editStep(id, given);
    log(`changed the inbox step ${edited.name}`, { kind: "updated", subject: "step", id });
    return edited;
  },
});

const stepMove = stepWrite({
  name: "step-move",
  description: "Move an inbox step to another place in the order.",
  input: z.object({
    step: z.string(),
    before: z
      .string()
      .optional()
      .describe("The id of the step to put it before. Last if left out."),
  }),
  output: z.array(Step),
  run: ({ step: id, before }, { inbox, log }) => {
    const steps = inbox.moveStep(id, before);
    log(`moved the inbox step ${inbox.step(id).name}`, { kind: "updated", subject: "step", id });
    return steps;
  },
});

const stepRemove = stepWrite({
  name: "step-remove",
  description: "Remove an inbox step.",
  input: z.object({ step: z.string() }),
  output: Step,
  run: ({ step: id }, { inbox, log }) => {
    const removed = inbox.removeStep(id);
    log(`removed the inbox step ${removed.name}`, { kind: "deleted", subject: "step", id });
    return removed;
  },
});

const OWNER_ONLY: readonly string[] = [
  stepAdd.name,
  stepEdit.name,
  stepMove.name,
  stepRemove.name,
  itemRun.name,
];

export const inboxDomain = defineDomain<InboxDeps>({
  name: "inbox",
  version: "1.0.0",
  about:
    "The inbox: new ideas and requests before they become tickets, and the owner's steps that look at each one.",
  actions: [
    inboxRead,
    itemRead,
    itemCapture,
    itemTag,
    itemUntag,
    itemCategorySet,
    itemFieldsSet,
    itemFieldsClear,
    itemEdit,
    itemAccept,
    itemReject,
    itemDismiss,
    itemPromote,
    itemLink,
    itemRun,
    pipelineRead,
    stepAdd,
    stepEdit,
    stepMove,
    stepRemove,
  ],
  cards: [itemList, inboxChanged],
  authorise: (principal, action) => principal.id === OWNER || !OWNER_ONLY.includes(action.name),
});
