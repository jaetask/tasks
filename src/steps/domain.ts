// The steps Domain: a ticket's checklist. Anyone who may change tickets
// adds steps, ticks them off and leaves a note on what was checked.
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { Refusal } from "../refusal.js";
import type { Tickets } from "../tickets/tickets.js";
import { TicketStep, type TicketSteps } from "./steps.js";

export type StepsDeps = Base & {
  tickets: Pick<Tickets, "get">;
  steps: TicketSteps;
  now(): number;
};

export const stepChanged = defineCard({
  name: "ticket-step-changed",
  version: 1,
  about: "What a Call changed in a ticket's steps.",
  view: { kind: "change", title: "Steps changed" },
});

const title = z.string().trim().min(1).max(200);
const one = z.object({ step: z.string().describe("A ticket step id, like t4.") });

/** A write to one ticket's steps: its change is recorded on that ticket. */
function write<Input extends z.ZodType>(definition: {
  name: string;
  description: string;
  input: Input;
  run(
    input: z.output<Input>,
    context: StepsDeps & { actor: string; at: string },
  ): { step: TicketStep; summary: string; kind?: "created" | "deleted" };
}) {
  const { run, ...rest } = definition;
  return writeAction<Input, typeof TicketStep, StepsDeps>("steps", {
    ...rest,
    output: TicketStep,
    card: stepChanged,
    run: (input, context) => {
      const { step, summary, kind } = run(input, {
        ...context,
        actor: context.principal.id,
        at: new Date(context.now()).toISOString(),
      });
      context.log(
        summary,
        { kind: kind ?? "updated", subject: "ticket-step", id: step.id },
        step.ticket,
      );
      return step;
    },
  });
}

/** An open ticket's id, or a refusal. */
const open = (tickets: Pick<Tickets, "get">, id: string) => {
  const ticket = tickets.get(id);
  if (ticket.state !== "open") {
    throw new Refusal("not-open", `${id} is ${ticket.state}. The owner can restore it.`);
  }
  return ticket.id;
};

const stepList = readAction({
  name: "ticket-step-list",
  description: "List a ticket's steps in order, each with whether it is done and its notes.",
  input: z.object({ ticket: z.string() }),
  output: z.array(TicketStep),
  run: ({ ticket }, { tickets, steps }: StepsDeps) => steps.list(tickets.get(ticket).id),
});

const stepAdd = write({
  name: "ticket-step-add",
  description: "Add a step to the end of a ticket's checklist.",
  input: z.object({ ticket: z.string(), title }),
  run: ({ ticket, title }, { tickets, steps }) => {
    const step = steps.add(open(tickets, ticket), title);
    return { step, summary: `added the step "${title}" to ${ticket}`, kind: "created" };
  },
});

const stepCheck = write({
  name: "ticket-step-check",
  description:
    "Tick a step as done. With a note, say what was checked or found, or link to a result.",
  input: one.extend({ note: z.string().trim().min(1).max(5000).optional() }),
  run: ({ step: id, note }, { steps, actor, at }) => {
    let step = steps.setDone(id, true);
    if (note) step = steps.note(id, actor, at, note);
    return { step, summary: `ticked the step "${step.title}" on ${step.ticket}` };
  },
});

const stepUncheck = write({
  name: "ticket-step-uncheck",
  description: "Untick a step that was done.",
  input: one,
  run: ({ step: id }, { steps }) => {
    const step = steps.setDone(id, false);
    return { step, summary: `unticked the step "${step.title}" on ${step.ticket}` };
  },
});

const stepNote = write({
  name: "ticket-step-note",
  description: "Leave a note on a step: what was checked or found, or a link to a result.",
  input: one.extend({ text: z.string().trim().min(1).max(5000) }),
  run: ({ step: id, text }, { steps, actor, at }) => {
    const step = steps.note(id, actor, at, text);
    return { step, summary: `left a note on the step "${step.title}" on ${step.ticket}` };
  },
});

const stepRename = write({
  name: "ticket-step-rename",
  description: "Change a step's title.",
  input: one.extend({ title }),
  run: ({ step: id, title }, { steps }) => {
    const was = steps.get(id).title;
    const step = steps.rename(id, title);
    return { step, summary: `renamed the step "${was}" to "${title}" on ${step.ticket}` };
  },
});

const stepMove = write({
  name: "ticket-step-move",
  description: "Move a step to another place in its ticket's checklist.",
  input: one.extend({
    before: z
      .string()
      .optional()
      .describe("The id of the step to put it before. Last if left out."),
  }),
  run: ({ step: id, before }, { steps }) => {
    steps.move(id, before);
    const step = steps.get(id);
    return { step, summary: `moved the step "${step.title}" on ${step.ticket}` };
  },
});

const stepRemove = write({
  name: "ticket-step-remove",
  description: "Remove a step and its notes from a ticket's checklist.",
  input: one,
  run: ({ step: id }, { steps }) => {
    const step = steps.remove(id);
    return {
      step,
      summary: `removed the step "${step.title}" from ${step.ticket}`,
      kind: "deleted",
    };
  },
});

export const stepsDomain = defineDomain<StepsDeps>({
  name: "steps",
  version: "1.0.0",
  about: "A ticket's checklist: steps to tick off, each with notes on what was checked.",
  actions: [stepList, stepAdd, stepCheck, stepUncheck, stepNote, stepRename, stepMove, stepRemove],
  cards: [stepChanged],
});
