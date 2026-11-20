// The input Domain: an agent asks the owner a question on a ticket and
// waits; the owner answers. Only the owner answers.
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { OWNER } from "../catalog/catalog.js";
import { Refusal } from "../refusal.js";
import type { Tickets } from "../tickets/tickets.js";
import { InputRequest, type Inputs, RequestState } from "./input.js";

export type InputDeps = Base & {
  tickets: Pick<Tickets, "get">;
  inputs: Inputs;
  now(): number;
  /** Tells an agent that its question was answered. */
  answered(request: InputRequest, by: string, at: string): void;
};

export const requestList = defineCard({
  name: "input-requests",
  version: 1,
  about: "A list of questions asked of the owner.",
  view: {
    kind: "list",
    title: "Human input",
    fields: [
      { label: "Id", path: "id" },
      { label: "Ticket", path: "ticket" },
      { label: "Asked by", path: "askedByName" },
      { label: "Question", path: "question" },
      { label: "State", path: "state" },
    ],
  },
});

export const requestCard = defineCard({
  name: "input-request",
  version: 1,
  about: "One question asked of the owner, and its answer.",
  view: {
    kind: "record",
    title: "Input request",
    fields: [
      { label: "Ticket", path: "ticket" },
      { label: "Question", path: "question" },
      { label: "State", path: "state" },
      { label: "Answer", path: "answer" },
    ],
  },
});

const request = z.string().describe("An input request id, like q3.");

function write<Input extends z.ZodType>(definition: {
  name: string;
  description: string;
  input: Input;
  run(
    input: z.output<Input>,
    context: InputDeps & { actor: string; at: string },
  ): { request: InputRequest; summary: string; kind?: "created" };
}) {
  const { run, ...rest } = definition;
  return writeAction<Input, typeof InputRequest, InputDeps>("input", {
    ...rest,
    output: InputRequest,
    card: requestCard,
    run: (input, context) => {
      const result = run(input, {
        ...context,
        actor: context.principal.id,
        at: new Date(context.now()).toISOString(),
      });
      context.log(
        result.summary,
        { kind: result.kind ?? "updated", subject: "input-request", id: result.request.id },
        result.request.ticket,
      );
      return result.request;
    },
  });
}

const list = readAction({
  name: "input-list",
  description:
    "List the questions asked of the owner, oldest first: all of them, or by state, project or ticket.",
  input: z.object({
    state: RequestState.optional(),
    project: z.string().optional(),
    ticket: z.string().optional(),
  }),
  output: z.array(InputRequest),
  card: requestList,
  run: (filter, { inputs }: InputDeps) => inputs.list(filter),
});

const read = readAction({
  name: "input-read",
  description: "Read one input request, to see whether the owner has answered it.",
  input: z.object({ request }),
  output: InputRequest,
  card: requestCard,
  run: ({ request: id }, { inputs }: InputDeps) => inputs.get(id),
});

const ask = write({
  name: "input-request",
  description:
    "Ask the owner a question on a ticket when you cannot go on without a person's answer. Then wait: read the request again later, or look in your agent inbox.",
  input: z.object({
    ticket: z.string(),
    question: z.string().trim().min(1).max(2000),
    context: z
      .string()
      .trim()
      .max(5000)
      .default("")
      .describe("What the owner needs to know to answer."),
  }),
  run: ({ ticket, question, context }, { tickets, inputs, actor, at }) => {
    const found = tickets.get(ticket);
    if (found.state !== "open") {
      throw new Refusal("not-open", `${ticket} is ${found.state}. The owner can restore it.`);
    }
    return {
      request: inputs.ask(actor, at, { ticket, project: found.project, question, context }),
      summary: `asked the owner on ${ticket}: ${question}`,
      kind: "created",
    };
  },
});

const resolve = write({
  name: "input-resolve",
  description: "Answer an input request. Only the owner can.",
  input: z.object({ request, answer: z.string().trim().min(1).max(5000) }),
  run: ({ request: id, answer }, { inputs, answered, actor, at }) => {
    const resolved = inputs.resolve(id, at, answer);
    answered(resolved, actor, at);
    return { request: resolved, summary: `answered ${id} on ${resolved.ticket}: ${answer}` };
  },
});

const withdraw = write({
  name: "input-withdraw",
  description:
    "Take back an input request that no longer needs an answer. Whoever asked or the owner can.",
  input: z.object({ request }),
  run: ({ request: id }, { inputs, actor }) => {
    const found = inputs.get(id);
    if (found.askedBy !== actor && actor !== OWNER) {
      throw new Refusal("not-yours", "Only whoever asked or the owner can take back a request.");
    }
    return {
      request: inputs.withdraw(id),
      summary: `took back the question ${id} on ${found.ticket}`,
    };
  },
});

export const inputDomain = defineDomain<InputDeps>({
  name: "input",
  version: "1.0.0",
  about: "Human input: an agent asks the owner a question on a ticket and waits for the answer.",
  actions: [list, read, ask, resolve, withdraw],
  cards: [requestList, requestCard],
  authorise: (principal, action) => principal.id === OWNER || action.name !== resolve.name,
});
