// The files repository: any file attached to a ticket, such as a log, a PDF or a video. A row
// in the database says what it is; its bytes are a file in the files folder, named by its id.
import { createHash } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { nextId } from "../ids.js";
import type { Rows } from "../journal.js";
import { Refusal } from "../refusal.js";

/** Video types a browser plays. They may be larger than other files. */
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
/** The largest file, in bytes, and the largest video. */
export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
/** The most bytes a file of a type may have. */
export const limitFor = (type: string) =>
  (VIDEO_TYPES as readonly string[]).includes(type) ? MAX_VIDEO_BYTES : MAX_BYTES;

const TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,60}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,60}$/;
/** A media type such as application/pdf; anything else becomes application/octet-stream. */
export const mediaType = (type: string | null | undefined) => {
  const bare = (type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  return TYPE.test(bare) ? bare : "application/octet-stream";
};

const BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  log: "text/plain",
  md: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  zip: "application/zip",
};
/** The media type a file's name suggests. */
export const typeOfName = (name: string) =>
  BY_EXTENSION[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

export const File = z.object({
  id: z.string(),
  ticket: z.string(),
  name: z.string(),
  type: z.string().describe("Its media type, such as application/pdf or video/mp4."),
  size: z.number().describe("In bytes."),
  hash: z.string().describe("The SHA-256 of its bytes, in hex."),
  by: z.string(),
  at: z.string(),
});
export type File = z.infer<typeof File>;

export type Files = {
  /** A ticket's files, oldest first. */
  list(ticket: string): File[];
  get(id: string): File;
  /** Where a file's bytes are on disk. */
  path(id: string): string;
  /**
   * Takes the file at `from` as a ticket's file. With `move` the file at `from` becomes the
   * stored one; otherwise it is copied and left where it was.
   */
  add(
    by: string,
    at: string,
    file: { ticket: string; name: string; type: string; from: string; move: boolean },
  ): File;
  remove(id: string): File;
  /** Deletes every file of a ticket, bytes included. They cannot be brought back. */
  purge(ticket: string): void;
};

export function migrateFiles(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, ticket TEXT NOT NULL REFERENCES tickets (id), name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, hash TEXT NOT NULL, by TEXT NOT NULL, at TEXT NOT NULL, removed INTEGER NOT NULL DEFAULT 0)",
  );
}

/** The SHA-256 of a file on disk, read a piece at a time. */
function hashOf(path: string): string {
  const hash = createHash("sha256");
  const piece = Buffer.alloc(1024 * 1024);
  const fd = openSync(path, "r");
  try {
    for (let read = readSync(fd, piece); read > 0; read = readSync(fd, piece)) {
      hash.update(piece.subarray(0, read));
    }
  } finally {
    closeSync(fd);
  }
  return hash.digest("hex");
}

type FileRow = File & { removed: number };

export function sqliteFiles(db: DatabaseSync, rows: Rows, dir: string): Files {
  const toFile = ({ removed: _, ...file }: FileRow): File => file;
  const row = (id: string) => {
    const found = db.prepare("SELECT * FROM files WHERE id = ? AND removed = 0").get(id) as
      | FileRow
      | undefined;
    if (!found) throw new Refusal("unknown-file", `No file has id ${id}.`);
    return found;
  };
  return {
    list: (ticket) =>
      (
        db
          .prepare("SELECT * FROM files WHERE ticket = ? AND removed = 0 ORDER BY rowid")
          .all(ticket) as FileRow[]
      ).map(toFile),
    get: (id) => toFile(row(id)),
    path: (id) => join(dir, id),
    add: (by, at, file) => {
      const stat = existsSync(file.from) ? statSync(file.from) : undefined;
      if (!stat?.isFile()) throw new Refusal("no-file", "There is no file there to attach.");
      if (stat.size === 0) throw new Refusal("empty", "The file has no data.");
      const limit = limitFor(file.type);
      if (stat.size > limit) {
        throw new Refusal(
          "too-large",
          `A file of type ${file.type} can be at most ${limit} bytes; this one has ${stat.size}.`,
        );
      }
      const hash = hashOf(file.from);
      const id = nextId(db, "fl");
      mkdirSync(dir, { recursive: true });
      if (file.move) renameSync(file.from, join(dir, id));
      else copyFileSync(file.from, join(dir, id));
      rows.insert("files", {
        id,
        ticket: file.ticket,
        name: file.name,
        type: file.type,
        size: stat.size,
        hash,
        by,
        at,
        removed: 0,
      });
      return toFile(row(id));
    },
    remove: (id) => {
      const found = toFile(row(id));
      rows.update("files", id, { removed: 1 });
      return found;
    },
    purge: (ticket) => {
      const ids = db.prepare("SELECT id FROM files WHERE ticket = ?").all(ticket) as {
        id: string;
      }[];
      for (const { id } of ids) rmSync(join(dir, id), { force: true });
      db.prepare("DELETE FROM files WHERE ticket = ?").run(ticket);
    },
  };
}
