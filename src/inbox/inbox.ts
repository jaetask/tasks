// The inbox repository: items that arrive before they become tickets, and
// the steps the owner adds to look at each new item.
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { nextId } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const ITEM_STATES = [
  "received",
  "accepted",
  "rejected",
  "dismissed",
  "promoted",
  "linked",
] as const;
export const ItemState = z.enum(ITEM_STATES);
export type ItemState = z.infer<typeof ItemState>;

/** The states that end an item's time in the inbox. */
const ENDED: readonly ItemState[] = ["rejected", "dismissed", "promoted", "linked"];

export const Item = z.object({
  id: z.string(),
  project: z.string().describe("The project it was sent to."),
  title: z.string(),
  text: z.string(),
  original: z
    .object({ title: z.string(), text: z.string() })
    .describe("The item as it was captured. Edits never change it."),
  source: z.string().describe("Where it came from, such as page or email."),
  state: ItemState,
  tags: z.array(z.string()),
  category: z.string().nullable(),
  fields: z.record(z.string(), z.string()).describe("Details pulled out of the item."),
  reason: z.string().nullable().describe("Why it was accepted, rejected or dismissed."),
  ticket: z.string().nullable().describe("The ticket it became or was linked to."),
  at: z.string(),
  by: z.string(),
});
export type Item = z.infer<typeof Item>;

/** The Actions a step can be given. A step may ask for these and no others. */
export const INTAKE = [
  "item-tag",
  "item-untag",
  "item-category-set",
  "item-fields-set",
  "item-fields-clear",
  "item-edit",
  "item-accept",
  "item-reject",
  "item-dismiss",
  "item-promote",
  "item-link",
] as const;
export const IntakeAction = z.enum(INTAKE);
export type IntakeAction = z.infer<typeof IntakeAction>;

export const STEP_KINDS = ["classifier", "local-model", "hosted-model", "script", "app"] as const;
export const StepKind = z.enum(STEP_KINDS);
export type StepKind = z.infer<typeof StepKind>;

/** Which items a step runs on. Every part that is given must match. */
export const Condition = z
  .object({
    project: z.string().optional().describe("The item was sent to this project."),
    tag: z.string().optional().describe("The item has this tag."),
    category: z.string().optional().describe("The item is in this category."),
    source: z.string().optional().describe("The item came from this source."),
    word: z.string().optional().describe("The item's title or text has this word."),
  })
  .strict();
export type Condition = z.infer<typeof Condition>;

export const Step = z.object({
  id: z.string(),
  name: z.string(),
  kind: StepKind,
  actor: z.string().describe("The actor the step's changes show under."),
  actions: z.array(IntakeAction).describe("The Actions the step may ask for."),
  condition: Condition.nullable(),
  config: z.record(z.string(), z.unknown()).describe("What this kind of step needs."),
  on: z.boolean(),
});
export type Step = z.infer<typeof Step>;

export type Inbox = {
  /** Items, oldest first: of one state, of one project, or both. */
  items(filter?: { state?: ItemState | undefined; project?: string | undefined }): Item[];
  item(id: string): Item;
  capture(
    by: string,
    at: string,
    item: { project: string; title: string; text: string; source: string },
  ): Item;
  /** Changes an item still in the inbox. Refused once it was rejected, dismissed, promoted or linked. */
  change(
    id: string,
    patch: Partial<Pick<Item, "title" | "text" | "tags" | "category" | "fields">>,
  ): Item;
  /** Moves an item to another state, with why, and the ticket for promoted or linked. */
  settle(id: string, state: ItemState, reason: string | null, ticket?: string): Item;
  steps(): Step[];
  step(id: string): Step;
  addStep(step: Omit<Step, "id">, before?: string): Step;
  editStep(id: string, patch: Partial<Omit<Step, "id">>): Step;
  moveStep(id: string, before?: string): Step[];
  removeStep(id: string): Step;
};

export function migrateInbox(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS inbox_items (id TEXT PRIMARY KEY, title TEXT NOT NULL, text TEXT NOT NULL, original_title TEXT NOT NULL, original_text TEXT NOT NULL, source TEXT NOT NULL, state TEXT NOT NULL, tags TEXT NOT NULL, category TEXT, fields TEXT NOT NULL, reason TEXT, ticket TEXT, at TEXT NOT NULL, by TEXT NOT NULL)",
  );
  // Added after the first version: a database made before it gets the column
  // here, and its items go to the first project.
  const columns = db.prepare("PRAGMA table_info(inbox_items)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "project")) {
    db.exec("ALTER TABLE inbox_items ADD COLUMN project TEXT");
  }
  db.exec(
    "UPDATE inbox_items SET project = (SELECT id FROM projects ORDER BY position LIMIT 1) WHERE project IS NULL",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS inbox_steps (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, actor TEXT NOT NULL, actions TEXT NOT NULL, condition TEXT, config TEXT NOT NULL, enabled INTEGER NOT NULL, position INTEGER NOT NULL)",
  );
}

type ItemRow = {
  id: string;
  project: string | null;
  title: string;
  text: string;
  original_title: string;
  original_text: string;
  source: string;
  state: ItemState;
  tags: string;
  category: string | null;
  fields: string;
  reason: string | null;
  ticket: string | null;
  at: string;
  by: string;
};
type StepRow = {
  id: string;
  name: string;
  kind: StepKind;
  actor: string;
  actions: string;
  condition: string | null;
  config: string;
  enabled: number;
  position: number;
};

export function sqliteInbox(db: DatabaseSync, rows: Rows): Inbox {
  const toItem = (r: ItemRow): Item => ({
    id: r.id,
    project: r.project ?? "",
    title: r.title,
    text: r.text,
    original: { title: r.original_title, text: r.original_text },
    source: r.source,
    state: r.state,
    tags: JSON.parse(r.tags) as string[],
    category: r.category,
    fields: JSON.parse(r.fields) as Record<string, string>,
    reason: r.reason,
    ticket: r.ticket,
    at: r.at,
    by: r.by,
  });
  const toStep = (r: StepRow): Step => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    actor: r.actor,
    actions: JSON.parse(r.actions) as IntakeAction[],
    condition: r.condition === null ? null : (JSON.parse(r.condition) as Condition),
    config: JSON.parse(r.config) as Record<string, unknown>,
    on: r.enabled === 1,
  });
  const itemRow = (id: string) => {
    const found = db.prepare("SELECT * FROM inbox_items WHERE id = ?").get(id) as
      | ItemRow
      | undefined;
    if (!found) throw new Refusal("unknown-item", `No inbox item has id ${id}.`);
    return found;
  };
  const inInbox = (id: string) => {
    const found = itemRow(id);
    if (ENDED.includes(found.state)) {
      throw new Refusal("ended", `${id} was ${found.state}. It is no longer in the inbox.`);
    }
    return found;
  };
  const stepRows = () =>
    db.prepare("SELECT * FROM inbox_steps ORDER BY position").all() as StepRow[];
  const step = (id: string) => {
    const found = stepRows().find((s) => s.id === id);
    if (!found) throw new Refusal("unknown-step", `No step has id ${id}.`);
    return toStep(found);
  };
  const order = (ids: string[]) => {
    for (const [i, id] of ids.entries()) rows.update("inbox_steps", id, { position: i + 1 });
  };
  const placed = (ids: string[], id: string, before?: string) => {
    const rest = ids.filter((x) => x !== id);
    if (before === undefined) return [...rest, id];
    const at = rest.indexOf(before);
    if (at < 0) throw new Refusal("unknown-step", `No step has id ${before}.`);
    return [...rest.slice(0, at), id, ...rest.slice(at)];
  };
  const stored = (patch: Partial<Omit<Step, "id">>) => ({
    ...(patch.name === undefined ? {} : { name: patch.name }),
    ...(patch.kind === undefined ? {} : { kind: patch.kind }),
    ...(patch.actor === undefined ? {} : { actor: patch.actor }),
    ...(patch.actions === undefined ? {} : { actions: JSON.stringify(patch.actions) }),
    ...(patch.condition === undefined
      ? {}
      : { condition: patch.condition === null ? null : JSON.stringify(patch.condition) }),
    ...(patch.config === undefined ? {} : { config: JSON.stringify(patch.config) }),
    ...(patch.on === undefined ? {} : { enabled: patch.on ? 1 : 0 }),
  });

  return {
    items: (filter = {}) =>
      (db.prepare("SELECT * FROM inbox_items ORDER BY rowid").all() as ItemRow[])
        .filter((r) => filter.state === undefined || r.state === filter.state)
        .filter((r) => filter.project === undefined || r.project === filter.project)
        .map(toItem),
    item: (id) => toItem(itemRow(id)),
    capture: (by, at, item) => {
      const id = nextId(db, "n");
      rows.insert("inbox_items", {
        id,
        project: item.project,
        title: item.title,
        text: item.text,
        original_title: item.title,
        original_text: item.text,
        source: item.source,
        state: "received",
        tags: "[]",
        category: null,
        fields: "{}",
        reason: null,
        ticket: null,
        at,
        by,
      });
      return toItem(itemRow(id));
    },
    change: (id, patch) => {
      inInbox(id);
      rows.update("inbox_items", id, {
        ...(patch.title === undefined ? {} : { title: patch.title }),
        ...(patch.text === undefined ? {} : { text: patch.text }),
        ...(patch.tags === undefined ? {} : { tags: JSON.stringify(patch.tags) }),
        ...(patch.category === undefined ? {} : { category: patch.category }),
        ...(patch.fields === undefined ? {} : { fields: JSON.stringify(patch.fields) }),
      });
      return toItem(itemRow(id));
    },
    settle: (id, state, reason, ticket) => {
      const found = inInbox(id);
      if (found.state === state) throw new Refusal("no-change", `${id} is already ${state}.`);
      rows.update("inbox_items", id, { state, reason, ...(ticket ? { ticket } : {}) });
      return toItem(itemRow(id));
    },
    steps: () => stepRows().map(toStep),
    step,
    addStep: (added, before) => {
      const ids = stepRows().map((s) => s.id);
      const id = nextId(db, "s");
      const next = placed(ids, id, before);
      rows.insert("inbox_steps", {
        id,
        name: added.name,
        kind: added.kind,
        actor: added.actor,
        actions: JSON.stringify(added.actions),
        condition: added.condition === null ? null : JSON.stringify(added.condition),
        config: JSON.stringify(added.config),
        enabled: added.on ? 1 : 0,
        position: ids.length + 1,
      });
      order(next);
      return step(id);
    },
    editStep: (id, patch) => {
      step(id);
      rows.update("inbox_steps", id, stored(patch));
      return step(id);
    },
    moveStep: (id, before) => {
      step(id);
      order(
        placed(
          stepRows().map((s) => s.id),
          id,
          before,
        ),
      );
      return stepRows().map(toStep);
    },
    removeStep: (id) => {
      const found = step(id);
      rows.remove("inbox_steps", id);
      order(
        stepRows()
          .filter((s) => s.id !== id)
          .map((s) => s.id),
      );
      return found;
    },
  };
}
