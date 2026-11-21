import { defineCard, defineDomain, type RunContext } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { OWNER } from "../catalog/catalog.js";
import { Refusal } from "../refusal.js";
import { AgentReply, type Replies, ReplyState } from "./replies.js";

export type RepliesDeps = Base & { replies: Replies };

export const replyList = defineCard({
  name: "agent-replies",
  version: 1,
  about: "What was said to an agent: replies, comments on its tickets, and answers.",
  view: {
    kind: "list",
    title: "Agent inbox",
    fields: [
      { label: "Id", path: "id" },
      { label: "For", path: "toName" },
      { label: "From", path: "fromName" },
      { label: "Ticket", path: "ticket" },
      { label: "Text", path: "text" },
      { label: "State", path: "state" },
    ],
  },
});

export const replyChanged = defineCard({
  name: "agent-reply-changed",
  version: 1,
  about: "What a Call changed in an agent inbox.",
  view: { kind: "change", title: "Agent inbox changed" },
});

const list = readAction({
  name: "reply-list",
  description:
    "Read your agent inbox, oldest first: replies to your comments, comments on tickets assigned to you, and the owner's answers to your questions. The owner can read any agent's, or everyone's.",
  input: z.object({
    state: ReplyState.optional().describe("unread or acknowledged. Both if left out."),
    actor: z.string().optional().describe("Whose inbox. Only the owner may name another actor."),
  }),
  output: z.array(AgentReply),
  card: replyList,
  run: ({ state, actor }, { replies, principal }: RunContext<RepliesDeps>) => {
    const mine = principal.id !== OWNER;
    if (mine && actor !== undefined && actor !== principal.id) {
      throw new Refusal("not-yours", "You can read only your own agent inbox.");
    }
    return replies.list({ state, to: mine ? principal.id : actor });
  },
});

const acknowledge = writeAction<
  z.ZodObject<{ reply: z.ZodString }>,
  typeof AgentReply,
  RepliesDeps
>("replies", {
  name: "reply-acknowledge",
  description: "Mark a reply in your agent inbox as read and dealt with.",
  input: z.object({ reply: z.string().describe("A reply id, like r4.") }),
  output: AgentReply,
  card: replyChanged,
  run: ({ reply: id }, { replies, principal, log }) => {
    const found = replies.get(id);
    if (found.to !== principal.id && principal.id !== OWNER) {
      throw new Refusal("not-yours", "Only the actor it is for, or the owner, can acknowledge it.");
    }
    const done = replies.acknowledge(id);
    log(`acknowledged ${id} on ${done.ticket}`, { kind: "updated", subject: "reply", id });
    return done;
  },
});

export const repliesDomain = defineDomain<RepliesDeps>({
  name: "replies",
  version: "1.0.0",
  about: "The agent inbox: what was said to each agent, for it to read and acknowledge.",
  actions: [list, acknowledge],
  cards: [replyList, replyChanged],
});
