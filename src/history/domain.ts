import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { OWNER } from "../catalog/catalog.js";

export const ChangeEntry = z.object({
  id: z.string(),
  at: z.string(),
  actor: z.string(),
  action: z.string(),
  summary: z.string(),
  ticket: z.string().nullable(),
  undoes: z.string().nullable(),
  undoneBy: z.string().nullable(),
  undoable: z.boolean(),
  imported: z.boolean().describe("True for a change made by bringing data in from another app."),
});

export const changeList = defineCard({
  name: "changes",
  version: 1,
  about: "A list of recorded changes: who made each one, and what it was.",
  view: {
    kind: "list",
    title: "Changes",
    fields: [
      { label: "Id", path: "id" },
      { label: "Actor", path: "actor" },
      { label: "Change", path: "summary" },
      { label: "At", path: "at" },
    ],
  },
});

export const changeUndone = defineCard({
  name: "change-undone",
  version: 1,
  about: "The change that an undo recorded.",
  view: {
    kind: "record",
    title: "Undone",
    fields: [
      { label: "Change", path: "summary" },
      { label: "Id", path: "id" },
    ],
  },
});

const list = readAction({
  name: "change-list",
  description:
    "List recorded changes, oldest first: all of them, or those about one ticket, about one project's tickets, or made by one actor.",
  input: z.object({
    ticket: z.string().optional(),
    project: z.string().optional().describe("Only changes to tickets of this project."),
    actor: z.string().optional().describe("Only changes made by this actor."),
    imported: z
      .boolean()
      .optional()
      .describe("False to leave out changes made by bringing data in from another app."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("The newest this many. 100 if left out."),
  }),
  output: z.array(ChangeEntry),
  card: changeList,
  run: (filter, { journal }: Base) => journal.list(filter),
});

const undo = writeAction<z.ZodObject<{ change: z.ZodString }>, typeof ChangeEntry, Base>(
  "history",
  {
    name: "change-undo",
    description:
      "Undo a recorded change. Refused if what it changed has changed again since. An undo can itself be undone.",
    input: z.object({ change: z.string().describe("The id of the change, like h12.") }),
    output: ChangeEntry,
    card: changeUndone,
    run: ({ change: id }, { journal, principal, change }) => {
      const entry = journal.undo(id, principal.id);
      change({ kind: "updated", subject: "change", id });
      return entry;
    },
  },
);

export const historyDomain = defineDomain<Base>({
  name: "history",
  version: "1.0.0",
  about: "Every change, with who made it. The owner can undo a change.",
  actions: [list, undo],
  cards: [changeList, changeUndone],
  authorise: (principal, action) => action.effect === "read" || principal.id === OWNER,
});
