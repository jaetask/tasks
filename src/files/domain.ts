import { realpathSync } from "node:fs";
import { basename, join } from "node:path";
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { OWNER } from "../catalog/catalog.js";
import { Refusal } from "../refusal.js";
import type { Tickets } from "../tickets/tickets.js";
import { File, type Files, MAX_BYTES, MAX_VIDEO_BYTES, mediaType, typeOfName } from "./files.js";

export type FilesDeps = Base & {
  tickets: Pick<Tickets, "get">;
  files: Files;
  stagedDir: string;
  now(): number;
};

export const fileList = defineCard({
  name: "files",
  version: 1,
  about: "A list of a ticket's files.",
  view: {
    kind: "list",
    title: "Files",
    fields: [
      { label: "Id", path: "id" },
      { label: "Name", path: "name" },
      { label: "Type", path: "type" },
      { label: "Bytes", path: "size" },
    ],
  },
});

export const fileChanged = defineCard({
  name: "file-changed",
  version: 1,
  about: "What a Call changed in a ticket's files.",
  view: { kind: "change", title: "Files changed" },
});

const name = z.string().trim().min(1).max(200);

const list = readAction({
  name: "file-list",
  description: "List a ticket's files: their names, types and sizes. The bytes are not included.",
  input: z.object({ ticket: z.string() }),
  output: z.array(File),
  card: fileList,
  run: ({ ticket }, { tickets, files }: FilesDeps) => {
    tickets.get(ticket);
    return files.list(ticket);
  },
});

const where = readAction({
  name: "file-locate",
  description:
    "Say where one file's bytes are on this machine, for an agent that runs here and wants to read it.",
  input: z.object({ file: z.string() }),
  output: File.extend({ path: z.string() }),
  run: ({ file }, { files }: FilesDeps) => ({ ...files.get(file), path: files.path(file) }),
});

type Add<Input extends z.ZodType> = Parameters<
  typeof writeAction<Input, typeof File, FilesDeps>
>[1];
const add = <Input extends z.ZodType>(definition: Omit<Add<Input>, "output" | "card">) =>
  writeAction<Input, typeof File, FilesDeps>("files", {
    ...definition,
    output: File,
    card: fileChanged,
  } as Add<Input>);

const attachUpload = add({
  name: "file-add",
  description:
    "Attach an uploaded file to a ticket. The page uploads the bytes first and names the upload here; an agent on this machine uses file-add-path.",
  input: z.object({
    ticket: z.string(),
    name,
    type: z.string().max(130).describe("Its media type, such as application/pdf."),
    upload: z
      .string()
      .regex(/^[a-f0-9]{32}$/, "an upload is named by 32 hex characters")
      .describe("The name the upload route gave the uploaded bytes."),
  }),
  run: ({ ticket, name, type, upload }, { tickets, files, stagedDir, principal, now, log }) => {
    tickets.get(ticket);
    const file = files.add(principal.id, new Date(now()).toISOString(), {
      ticket,
      name,
      type: mediaType(type),
      from: join(stagedDir, upload),
      move: true,
    });
    log(
      `attached the file ${name} to ${ticket}`,
      { kind: "created", subject: "file", id: file.id },
      ticket,
    );
    return file;
  },
});

const attachPath = add({
  name: "file-add-path",
  description: `Attach a file that is on this machine to a ticket, by its path, from any folder Tasks can read. The file is copied; the original stays. At most ${MAX_BYTES} bytes, or ${MAX_VIDEO_BYTES} for mp4, webm and mov video.`,
  input: z.object({
    ticket: z.string(),
    path: z.string().min(1).max(4000).describe("The file's full path on this machine."),
    name: name.optional().describe("What to call it. The file's own name if left out."),
  }),
  run: ({ ticket, path, name }, { tickets, files, principal, now, log }) => {
    tickets.get(ticket);
    let real: string;
    try {
      real = realpathSync(path);
    } catch {
      throw new Refusal("no-file", `There is no file at ${path}.`);
    }
    const called = name ?? basename(real);
    const file = files.add(principal.id, new Date(now()).toISOString(), {
      ticket,
      name: called,
      type: typeOfName(called),
      from: real,
      move: false,
    });
    log(
      `attached the file ${called} to ${ticket}`,
      { kind: "created", subject: "file", id: file.id },
      ticket,
    );
    return file;
  },
});

const remove = writeAction<z.ZodObject<{ file: z.ZodString }>, typeof File, FilesDeps>("files", {
  name: "file-remove",
  description: "Remove a file from a ticket. Whoever attached it or the owner can.",
  input: z.object({ file: z.string() }),
  output: File,
  card: fileChanged,
  run: ({ file: id }, { files, principal, log }) => {
    const { by } = files.get(id);
    if (by !== principal.id && principal.id !== OWNER) {
      throw new Refusal("not-yours", "Only whoever attached it or the owner can remove a file.");
    }
    const file = files.remove(id);
    log(
      `removed the file ${file.name} from ${file.ticket}`,
      { kind: "deleted", subject: "file", id },
      file.ticket,
    );
    return file;
  },
});

export const filesDomain = defineDomain<FilesDeps>({
  name: "files",
  version: "1.0.0",
  about: "Files attached to tickets, such as logs, documents and videos.",
  actions: [list, where, attachUpload, attachPath, remove],
  cards: [fileList, fileChanged],
});
