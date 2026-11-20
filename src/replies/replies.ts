// The agent inbox repository: what an agent needs to hear about. A reply
// to its comment, a comment on a ticket assigned to it, or the owner's
// answer to its question.
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { OWNER } from "../catalog/catalog.js";
import { nextId } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const REPLY_KINDS = ["reply", "comment", "answer"] as const;
export const ReplyKind = z.enum(REPLY_KINDS);
export type ReplyKind = z.infer<typeof ReplyKind>;

export const REPLY_STATES = ["unread", "acknowledged"] as const;
export const ReplyState = z.enum(REPLY_STATES);
export type ReplyState = z.infer<typeof ReplyState>;

export const AgentReply = z.object({
  id: z.string(),
  to: z.string().describe("The actor it is for."),
  toName: z.string(),
  from: z.string(),
  fromName: z.string(),
  kind: ReplyKind.describe(
    "reply: to a comment you wrote. comment: on a ticket assigned to you. answer: to a question you asked.",
  ),
  ticket: z.string(),
  about: z.string().describe("The id of the comment or the input request it is about."),
  text: z.string(),
  at: z.string(),
  state: ReplyState,
});
export type AgentReply = z.infer<typeof AgentReply>;

export type Replies = {
  list(filter?: { to?: string | undefined; state?: ReplyState | undefined }): AgentReply[];
  get(id: string): AgentReply;
  /** Leaves a reply for an agent. Nothing is left for the owner, or for whoever wrote it. */
  leave(reply: {
    to: string;
    from: string;
    kind: ReplyKind;
    ticket: string;
    about: string;
    text: string;
    at: string;
  }): void;
  acknowledge(id: string): AgentReply;
  /** Deletes every reply about a ticket. They cannot be brought back. */
  purge(ticket: string): void;
};

export function migrateReplies(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS agent_replies (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, sender TEXT NOT NULL, kind TEXT NOT NULL, ticket TEXT NOT NULL, about TEXT NOT NULL, text TEXT NOT NULL, at TEXT NOT NULL, state TEXT NOT NULL)",
  );
}

type Row = {
  id: string;
  recipient: string;
  sender: string;
  kind: ReplyKind;
  ticket: string;
  about: string;
  text: string;
  at: string;
  state: ReplyState;
};

export function sqliteReplies(
  db: DatabaseSync,
  rows: Rows,
  nameOf: (actor: string) => string,
): Replies {
  const toReply = (r: Row): AgentReply => ({
    id: r.id,
    to: r.recipient,
    toName: nameOf(r.recipient),
    from: r.sender,
    fromName: nameOf(r.sender),
    kind: r.kind,
    ticket: r.ticket,
    about: r.about,
    text: r.text,
    at: r.at,
    state: r.state,
  });
  const row = (id: string) => {
    const found = db.prepare("SELECT * FROM agent_replies WHERE id = ?").get(id) as Row | undefined;
    if (!found) throw new Refusal("unknown-reply", `No reply has id ${id}.`);
    return found;
  };
  return {
    get: (id) => toReply(row(id)),
    list: (filter = {}) =>
      (db.prepare("SELECT * FROM agent_replies ORDER BY rowid").all() as Row[])
        .filter((r) => filter.to === undefined || r.recipient === filter.to)
        .filter((r) => filter.state === undefined || r.state === filter.state)
        .map(toReply),
    leave: (reply) => {
      if (reply.to === OWNER || reply.to === reply.from) return;
      rows.insert("agent_replies", {
        id: nextId(db, "r"),
        recipient: reply.to,
        sender: reply.from,
        kind: reply.kind,
        ticket: reply.ticket,
        about: reply.about,
        text: reply.text,
        at: reply.at,
        state: "unread",
      });
    },
    acknowledge: (id) => {
      const found = row(id);
      if (found.state === "acknowledged") {
        throw new Refusal("no-change", `${id} is already acknowledged.`);
      }
      rows.update("agent_replies", id, { state: "acknowledged" });
      return toReply(row(id));
    },
    purge: (ticket) => {
      db.prepare("DELETE FROM agent_replies WHERE ticket = ?").run(ticket);
    },
  };
}
