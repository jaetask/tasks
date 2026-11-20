// The comments repository: a ticket's conversation. A comment can have
// replies, one level deep, and reactions.
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { nextId } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const Reaction = z.object({
  emoji: z.string(),
  actors: z.array(z.string()).describe("The ids of the actors who reacted with it."),
});

export const Reply = z.object({
  id: z.string(),
  ticket: z.string(),
  replyTo: z.string().nullable().describe("The comment this replies to, or null."),
  author: z.string(),
  authorName: z.string(),
  text: z.string().describe("Empty when the comment was removed."),
  at: z.string(),
  editedAt: z.string().nullable(),
  removed: z.boolean(),
  resolved: z
    .boolean()
    .describe("True on a comment whose thread was resolved. Always false on a reply."),
  reactions: z.array(Reaction),
});
export type Reply = z.infer<typeof Reply>;

export const Comment = Reply.extend({ replies: z.array(Reply) });
export type Comment = z.infer<typeof Comment>;

export type Comments = {
  /** How many comments a ticket has, replies included, removed ones not. */
  count(ticket: string): number;
  /** A ticket's comments, oldest first, each with its replies. */
  thread(ticket: string): Comment[];
  get(id: string): Reply;
  add(by: string, at: string, ticket: string, text: string, replyTo?: string): Reply;
  edit(id: string, at: string, text: string): Reply;
  remove(id: string): Reply;
  /** Marks a comment's thread resolved, or open again. Only a comment that starts a thread can be. */
  resolve(id: string, resolved: boolean): Reply;
  react(id: string, actor: string, emoji: string): Reply;
  unreact(id: string, actor: string, emoji: string): Reply;
  /** Deletes every comment and reaction of a ticket. They cannot be brought back. */
  purge(ticket: string): void;
};

export function migrateComments(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, ticket TEXT NOT NULL REFERENCES tickets (id), parent TEXT REFERENCES comments (id), author TEXT NOT NULL, text TEXT NOT NULL, at TEXT NOT NULL, edited_at TEXT, removed INTEGER NOT NULL DEFAULT 0)",
  );
  // Added after the first version: a database made before it gets the column here.
  const columns = db.prepare("PRAGMA table_info(comments)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "resolved")) {
    db.exec("ALTER TABLE comments ADD COLUMN resolved INTEGER NOT NULL DEFAULT 0");
  }
  db.exec(
    "CREATE TABLE IF NOT EXISTS reactions (id TEXT PRIMARY KEY, comment TEXT NOT NULL REFERENCES comments (id), actor TEXT NOT NULL, emoji TEXT NOT NULL)",
  );
}

type CommentRow = {
  id: string;
  ticket: string;
  parent: string | null;
  author: string;
  text: string;
  at: string;
  edited_at: string | null;
  removed: number;
  resolved: number;
};

export function sqliteComments(
  db: DatabaseSync,
  rows: Rows,
  nameOf: (actor: string) => string,
): Comments {
  const toReply = (r: CommentRow): Reply => {
    const reacted = db
      .prepare("SELECT actor, emoji FROM reactions WHERE comment = ? ORDER BY rowid")
      .all(r.id) as { actor: string; emoji: string }[];
    const emojis = [...new Set(reacted.map((x) => x.emoji))];
    return {
      id: r.id,
      ticket: r.ticket,
      replyTo: r.parent,
      author: r.author,
      authorName: nameOf(r.author),
      text: r.removed ? "" : r.text,
      at: r.at,
      editedAt: r.edited_at,
      removed: r.removed === 1,
      resolved: r.resolved === 1,
      reactions: emojis.map((emoji) => ({
        emoji,
        actors: reacted.filter((x) => x.emoji === emoji).map((x) => x.actor),
      })),
    };
  };
  const row = (id: string) => {
    const found = db.prepare("SELECT * FROM comments WHERE id = ?").get(id) as
      | CommentRow
      | undefined;
    if (!found) throw new Refusal("unknown-comment", `No comment has id ${id}.`);
    return found;
  };
  const live = (id: string) => {
    const found = row(id);
    if (found.removed) throw new Refusal("removed", `Comment ${id} was removed.`);
    return found;
  };
  const get = (id: string) => toReply(row(id));

  return {
    get,
    count: (ticket) =>
      (
        db
          .prepare("SELECT count(*) AS n FROM comments WHERE ticket = ? AND removed = 0")
          .get(ticket) as { n: number }
      ).n,
    thread: (ticket) => {
      const all = (
        db
          .prepare("SELECT * FROM comments WHERE ticket = ? ORDER BY rowid")
          .all(ticket) as CommentRow[]
      ).map(toReply);
      return all
        .filter((c) => c.replyTo === null)
        .map((c) => ({ ...c, replies: all.filter((r) => r.replyTo === c.id) }));
    },
    add: (by, at, ticket, text, replyTo) => {
      let parent: string | null = null;
      if (replyTo !== undefined) {
        const to = row(replyTo);
        if (to.ticket !== ticket) {
          throw new Refusal("other-ticket", `Comment ${replyTo} is not on ${ticket}.`);
        }
        // A reply to a reply joins the same thread.
        parent = to.parent ?? to.id;
      }
      const id = nextId(db, "m");
      rows.insert("comments", {
        id,
        ticket,
        parent,
        author: by,
        text,
        at,
        edited_at: null,
        removed: 0,
        resolved: 0,
      });
      return get(id);
    },
    edit: (id, at, text) => {
      live(id);
      rows.update("comments", id, { text, edited_at: at });
      return get(id);
    },
    remove: (id) => {
      live(id);
      rows.update("comments", id, { removed: 1 });
      return get(id);
    },
    resolve: (id, resolved) => {
      const found = live(id);
      if (found.parent !== null) {
        throw new Refusal("a-reply", `${id} is a reply. Resolve the comment it replies to.`);
      }
      if ((found.resolved === 1) === resolved) {
        throw new Refusal(
          "no-change",
          `The thread of ${id} is already ${resolved ? "resolved" : "open"}.`,
        );
      }
      rows.update("comments", id, { resolved: resolved ? 1 : 0 });
      return get(id);
    },
    react: (id, actor, emoji) => {
      live(id);
      const key = `${id}:${actor}:${emoji}`;
      if (!rows.get("reactions", key)) {
        rows.insert("reactions", { id: key, comment: id, actor, emoji });
      }
      return get(id);
    },
    unreact: (id, actor, emoji) => {
      row(id);
      rows.remove("reactions", `${id}:${actor}:${emoji}`);
      return get(id);
    },
    purge: (ticket) => {
      db.prepare(
        "DELETE FROM reactions WHERE comment IN (SELECT id FROM comments WHERE ticket = ?)",
      ).run(ticket);
      db.prepare("DELETE FROM comments WHERE ticket = ? AND parent IS NOT NULL").run(ticket);
      db.prepare("DELETE FROM comments WHERE ticket = ?").run(ticket);
    },
  };
}
