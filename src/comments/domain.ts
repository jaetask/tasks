// The comments Domain: the conversation on a ticket. Comments with replies
// and reactions, and between them a line for each change to the ticket.
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { OWNER } from "../catalog/catalog.js";
import { Refusal } from "../refusal.js";
import type { Tickets } from "../tickets/tickets.js";
import { Comment, type Comments, Reply } from "./comments.js";

export type CommentsDeps = Base & {
  tickets: Pick<Tickets, "get">;
  comments: Comments;
  /** Tells the agents a new comment concerns: see the replies Domain. */
  said(comment: Reply, assignee: string | null, repliedTo: string | undefined): void;
  /** An actor's name, or its id when it has none. */
  nameOf(actor: string): string;
  now(): number;
};

const Line = z.object({
  id: z.string().describe("The id of the change, like h12."),
  at: z.string(),
  actor: z.string(),
  actorName: z.string(),
  summary: z.string(),
  undoable: z.boolean().describe("False once it was undone, or when it cannot be."),
});

const Conversation = z.object({
  ticket: z.string(),
  entries: z
    .array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("comment"), comment: Comment }),
        z.object({ type: z.literal("change"), change: Line }),
      ]),
    )
    .describe("Comments and changes to the ticket, oldest first."),
});

export const commentChanged = defineCard({
  name: "comment-changed",
  version: 1,
  about: "What a Call changed in a ticket's conversation.",
  view: { kind: "change", title: "Conversation changed" },
});

const text = z.string().trim().min(1).max(10_000);
const emoji = z.string().min(1).max(16).describe("One emoji, such as 👍.");

/** A write to one comment: its change is recorded on the comment's ticket. */
function write<Input extends z.ZodType>(definition: {
  name: string;
  description: string;
  input: Input;
  run(
    input: z.output<Input>,
    context: CommentsDeps & { actor: string; at: string },
  ): { comment: Reply; summary: string; kind?: "created" | "deleted" };
}) {
  const { run, ...rest } = definition;
  return writeAction<Input, typeof Reply, CommentsDeps>("comments", {
    ...rest,
    output: Reply,
    card: commentChanged,
    run: (input, context) => {
      const { comment, summary, kind } = run(input, {
        ...context,
        actor: context.principal.id,
        at: new Date(context.now()).toISOString(),
      });
      context.log(
        summary,
        { kind: kind ?? "updated", subject: "comment", id: comment.id },
        comment.ticket,
      );
      return comment;
    },
  });
}

const conversationRead = readAction({
  name: "conversation-read",
  description:
    "Read a ticket's conversation: its comments with replies and reactions, and a line for each change to the ticket, oldest first.",
  input: z.object({ ticket: z.string() }),
  output: Conversation,
  run: ({ ticket }, { tickets, comments, journal, nameOf }: CommentsDeps) => {
    tickets.get(ticket);
    const said = comments
      .thread(ticket)
      .map((comment) => ({ type: "comment" as const, at: comment.at, comment }));
    const done = journal
      .list({ ticket, limit: 500 })
      .filter((c) => !c.action.startsWith("comments."))
      .map(({ id, at, actor, summary, undoable }) => ({
        type: "change" as const,
        at,
        change: { id, at, actor, actorName: nameOf(actor), summary, undoable },
      }));
    const entries = [...done, ...said]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map(({ at: _, ...entry }) => entry);
    return { ticket, entries };
  },
});

const commentAdd = write({
  name: "comment-add",
  description:
    "Comment on a ticket: say what you did or found, or ask. With reply_to, it is a reply to that comment.",
  input: z.object({
    ticket: z.string(),
    text,
    reply_to: z.string().optional().describe("The id of the comment to reply to."),
  }),
  run: ({ ticket, text, reply_to }, { tickets, comments, said, actor, at }) => {
    const { assignee } = tickets.get(ticket);
    const comment = comments.add(actor, at, ticket, text, reply_to);
    said(comment, assignee, reply_to);
    return {
      comment,
      summary: comment.replyTo
        ? `replied to ${comment.replyTo} on ${ticket}`
        : `commented on ${ticket}`,
      kind: "created",
    };
  },
});

const commentEdit = write({
  name: "comment-edit",
  description: "Change the text of a comment you wrote.",
  input: z.object({ comment: z.string(), text }),
  run: ({ comment: id, text }, { comments, actor, at }) => {
    const { author, ticket } = comments.get(id);
    if (author !== actor) throw new Refusal("not-yours", "Only its author can edit a comment.");
    return { comment: comments.edit(id, at, text), summary: `edited ${id} on ${ticket}` };
  },
});

const commentRemove = write({
  name: "comment-remove",
  description: "Remove a comment. Its author or the owner can. Its replies stay.",
  input: z.object({ comment: z.string() }),
  run: ({ comment: id }, { comments, actor }) => {
    const { author, ticket } = comments.get(id);
    if (author !== actor && actor !== OWNER) {
      throw new Refusal("not-yours", "Only its author or the owner can remove a comment.");
    }
    return { comment: comments.remove(id), summary: `removed ${id} on ${ticket}`, kind: "deleted" };
  },
});

const reactionAdd = write({
  name: "reaction-add",
  description: "React to a comment with an emoji.",
  input: z.object({ comment: z.string(), emoji }),
  run: ({ comment: id, emoji }, { comments, actor }) => {
    const comment = comments.react(id, actor, emoji);
    return { comment, summary: `reacted ${emoji} to ${id} on ${comment.ticket}` };
  },
});

const reactionRemove = write({
  name: "reaction-remove",
  description: "Take back your reaction to a comment.",
  input: z.object({ comment: z.string(), emoji }),
  run: ({ comment: id, emoji }, { comments, actor }) => {
    const comment = comments.unreact(id, actor, emoji);
    return { comment, summary: `took back ${emoji} from ${id} on ${comment.ticket}` };
  },
});

export const commentsDomain = defineDomain<CommentsDeps>({
  name: "comments",
  version: "1.0.0",
  about:
    "The conversation on a ticket: comments, replies and reactions, with a line for each change to the ticket.",
  actions: [conversationRead, commentAdd, commentEdit, commentRemove, reactionAdd, reactionRemove],
  cards: [commentChanged],
});
