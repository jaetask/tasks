// The images repository: pictures attached to a ticket, such as
// screenshots. The bytes are kept beside the image's row.
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { nextId } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

export const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
export const Type = z.enum(TYPES);
export type Type = z.infer<typeof Type>;

/** The largest image, in bytes. */
export const MAX_BYTES = 2 * 1024 * 1024;

export const Image = z.object({
  id: z.string(),
  ticket: z.string(),
  name: z.string(),
  type: Type,
  size: z.number().describe("In bytes."),
  by: z.string(),
  at: z.string(),
});
export type Image = z.infer<typeof Image>;

export type Images = {
  /** A ticket's images, oldest first. */
  list(ticket: string): Image[];
  get(id: string): Image;
  bytes(id: string): Uint8Array;
  add(
    by: string,
    at: string,
    image: { ticket: string; name: string; type: Type; bytes: Uint8Array },
  ): Image;
  remove(id: string): Image;
  /** Deletes every image of a ticket. They cannot be brought back. */
  purge(ticket: string): void;
};

export function migrateImages(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, ticket TEXT NOT NULL REFERENCES tickets (id), name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, by TEXT NOT NULL, at TEXT NOT NULL, removed INTEGER NOT NULL DEFAULT 0)",
  );
  db.exec("CREATE TABLE IF NOT EXISTS image_bytes (id TEXT PRIMARY KEY, bytes BLOB NOT NULL)");
}

type ImageRow = Image & { removed: number };

export function sqliteImages(db: DatabaseSync, rows: Rows): Images {
  const toImage = ({ removed: _, ...image }: ImageRow): Image => image;
  const row = (id: string) => {
    const found = db.prepare("SELECT * FROM images WHERE id = ? AND removed = 0").get(id) as
      | ImageRow
      | undefined;
    if (!found) throw new Refusal("unknown-image", `No image has id ${id}.`);
    return found;
  };
  return {
    list: (ticket) =>
      (
        db
          .prepare("SELECT * FROM images WHERE ticket = ? AND removed = 0 ORDER BY rowid")
          .all(ticket) as ImageRow[]
      ).map(toImage),
    get: (id) => toImage(row(id)),
    bytes: (id) => {
      row(id);
      const found = db.prepare("SELECT bytes FROM image_bytes WHERE id = ?").get(id) as {
        bytes: Uint8Array;
      };
      return found.bytes;
    },
    add: (by, at, image) => {
      if (image.bytes.length === 0) throw new Refusal("empty", "The image has no data.");
      if (image.bytes.length > MAX_BYTES) {
        throw new Refusal("too-large", `An image can be at most ${MAX_BYTES} bytes.`);
      }
      const id = nextId(db, "i");
      rows.insert("images", {
        id,
        ticket: image.ticket,
        name: image.name,
        type: image.type,
        size: image.bytes.length,
        by,
        at,
        removed: 0,
      });
      db.prepare("INSERT INTO image_bytes (id, bytes) VALUES (?, ?)").run(id, image.bytes);
      return toImage(row(id));
    },
    remove: (id) => {
      const found = toImage(row(id));
      rows.update("images", id, { removed: 1 });
      return found;
    },
    purge: (ticket) => {
      db.prepare(
        "DELETE FROM image_bytes WHERE id IN (SELECT id FROM images WHERE ticket = ?)",
      ).run(ticket);
      db.prepare("DELETE FROM images WHERE ticket = ?").run(ticket);
    },
  };
}
