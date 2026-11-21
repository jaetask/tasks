import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { type Provided, provide } from "@jaetask/open-agent-kit";
import { sqliteConnections } from "@jaetask/open-agent-kit/sqlite";
import type { Base } from "./actions.js";
import { migrateCatalog, sqliteCatalog } from "./catalog/catalog.js";
import { catalogDomain } from "./catalog/domain.js";
import { migrateComments, sqliteComments } from "./comments/comments.js";
import { commentsDomain } from "./comments/domain.js";
import { connectionsDomain } from "./connections/domain.js";
import { filesDomain } from "./files/domain.js";
import { migrateFiles, sqliteFiles } from "./files/files.js";
import { historyDomain } from "./history/domain.js";
import { migrateIds } from "./ids.js";
import { imagesDomain } from "./images/domain.js";
import { migrateImages, sqliteImages } from "./images/images.js";
import { inboxDomain } from "./inbox/domain.js";
import { migrateInbox, sqliteInbox } from "./inbox/inbox.js";
import { migrateRuns, sqliteRuns } from "./inbox/runs.js";
import { inputDomain } from "./input/domain.js";
import { migrateInput, sqliteInputs } from "./input/input.js";
import { migrateJournal, openJournal } from "./journal.js";
import { repliesDomain } from "./replies/domain.js";
import { migrateReplies, sqliteReplies } from "./replies/replies.js";
import { stepsDomain } from "./steps/domain.js";
import { migrateSteps, sqliteSteps } from "./steps/steps.js";
import { ticketsDomain } from "./tickets/domain.js";
import { reprefix } from "./tickets/rekey.js";
import { migrateTickets, sqliteTickets } from "./tickets/tickets.js";

const migrated = new WeakSet<DatabaseSync>();

export function migrate(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  db.exec("PRAGMA foreign_keys = ON");
  migrateIds(db);
  migrateJournal(db);
  migrateCatalog(db);
  migrateTickets(db);
  migrateComments(db);
  migrateSteps(db);
  migrateImages(db);
  migrateFiles(db);
  migrateInput(db);
  migrateReplies(db);
  migrateInbox(db);
  migrateRuns(db);
  migrated.add(db);
}

export type FilesPlace = { dir: string };

function openWith(db: DatabaseSync, now: () => number, place: FilesPlace) {
  migrate(db);
  const journal = openJournal(db, now);
  const catalog = sqliteCatalog(db, journal.rows);
  const base: Base = {
    db,
    journal,
    actorName: (id) => {
      const found = catalog.read().actors.find((a) => a.id === id);
      return found && !found.archived ? found.name : undefined;
    },
  };
  const nameOf = (id: string) => catalog.read().actors.find((a) => a.id === id)?.name || id;
  const comments = sqliteComments(db, journal.rows, nameOf);
  const images = sqliteImages(db, journal.rows);
  const files = sqliteFiles(db, journal.rows, place.dir);
  const inputs = sqliteInputs(db, journal.rows, nameOf);
  const tickets = sqliteTickets(
    db,
    journal.rows,
    catalog,
    (ticket) => ({
      comments: comments.count(ticket),
      images: images.list(ticket).length,
      awaiting: inputs.awaiting(ticket),
    }),
    now,
  );
  const replies = sqliteReplies(db, journal.rows, nameOf);
  const steps = sqliteSteps(db, journal.rows, nameOf);
  return {
    ...base,
    catalog,
    tickets,
    comments,
    images,
    files,
    inputs,
    replies,
    steps,
    nameOf,
    now,
  };
}

export function domains(
  now: () => number = Date.now,
  place: FilesPlace = { dir: join(tmpdir(), "tasks-files") },
): Provided<DatabaseSync>[] {
  const open = (db: DatabaseSync, at: () => number) => openWith(db, at, place);
  return [
    provide(catalogDomain, (db: DatabaseSync) => {
      const deps = open(db, now);
      const n = (sql: string, id: string) => (db.prepare(sql).get(id) as { n: number }).n;
      const some = (count: number, one: string, many: string) =>
        count === 0 ? null : `${count} ${count === 1 ? one : many}`;
      return {
        ...deps,
        vacate: (from, to) => deps.tickets.vacate(from, to.id),
        reprefix: (from, to) => reprefix(db, from, to),
        used: (what, id) => {
          if (what === "location") {
            return some(
              n("SELECT count(*) AS n FROM tickets WHERE location = ?", id),
              "ticket has it",
              "tickets have it",
            );
          }
          if (what === "project") {
            return (
              some(
                n("SELECT count(*) AS n FROM tickets WHERE project = ?", id),
                "ticket is in it",
                "tickets are in it",
              ) ??
              some(
                n("SELECT count(*) AS n FROM features WHERE project = ?", id),
                "feature is in it",
                "features are in it",
              ) ??
              some(
                n("SELECT count(*) AS n FROM inbox_items WHERE project = ?", id),
                "inbox item was sent to it",
                "inbox items were sent to it",
              )
            );
          }
          return (
            some(
              n("SELECT count(*) AS n FROM tickets WHERE assignee = ?1 OR created_by = ?1", id),
              "ticket is or was its",
              "tickets are or were its",
            ) ??
            some(
              n("SELECT count(*) AS n FROM changes WHERE actor = ?", id),
              "change was made as it",
              "changes were made as it",
            ) ??
            some(
              n("SELECT count(*) AS n FROM inbox_steps WHERE actor = ?", id),
              "intake step acts as it",
              "intake steps act as it",
            ) ??
            (n("SELECT count(*) AS n FROM sqlite_master WHERE name = ?", "kit_connections") === 0
              ? null
              : some(
                  n(
                    "SELECT count(*) AS n FROM kit_connections WHERE json_extract(record, '$.principal.id') = ? AND json_extract(record, '$.state') != 'revoked'",
                    id,
                  ),
                  "Connection acts as it",
                  "Connections act as it",
                ))
          );
        },
      };
    }),
    provide(ticketsDomain, (db: DatabaseSync) => {
      const deps = open(db, now);
      const purge = (ticket: string) => {
        deps.comments.purge(ticket);
        deps.steps.purge(ticket);
        deps.inputs.purge(ticket);
        deps.replies.purge(ticket);
        deps.images.purge(ticket);
        deps.files.purge(ticket);
      };
      const handoff = (ticket: string, from: string, to: string, note: string) => {
        const at = new Date(now()).toISOString();
        const comment = deps.comments.add(from, at, ticket, note);
        deps.replies.leave({
          to,
          from,
          kind: "comment",
          ticket,
          about: comment.id,
          text: note,
          at,
        });
      };
      return { ...deps, purge, handoff };
    }),
    provide(commentsDomain, (db: DatabaseSync) => {
      const deps = open(db, now);
      return {
        ...deps,
        said: (comment, assignee, repliedTo) => {
          const about = { ticket: comment.ticket, about: comment.id, text: comment.text };
          const from = { from: comment.author, at: comment.at };
          if (repliedTo) {
            const to = deps.comments.get(repliedTo).author;
            deps.replies.leave({ ...about, ...from, to, kind: "reply" });
            if (assignee && assignee !== to) {
              deps.replies.leave({ ...about, ...from, to: assignee, kind: "comment" });
            }
          } else if (assignee) {
            deps.replies.leave({ ...about, ...from, to: assignee, kind: "comment" });
          }
        },
      };
    }),
    provide(stepsDomain, (db: DatabaseSync) => open(db, now)),
    provide(imagesDomain, (db: DatabaseSync) => open(db, now)),
    provide(filesDomain, (db: DatabaseSync) => ({
      ...open(db, now),
      stagedDir: join(place.dir, "staged"),
    })),
    provide(inboxDomain, (db: DatabaseSync) => {
      const deps = open(db, now);
      return { ...deps, inbox: sqliteInbox(db, deps.journal.rows), runs: sqliteRuns(db).of };
    }),
    provide(inputDomain, (db: DatabaseSync) => {
      const deps = open(db, now);
      return {
        ...deps,
        answered: (request, by, at) =>
          deps.replies.leave({
            to: request.askedBy,
            from: by,
            kind: "answer",
            ticket: request.ticket,
            about: request.id,
            text: request.answer ?? "",
            at,
          }),
      };
    }),
    provide(repliesDomain, (db: DatabaseSync) => open(db, now)),
    provide(connectionsDomain, (db: DatabaseSync) => ({
      ...open(db, now),
      connections: sqliteConnections(db, now),
    })),
    provide(historyDomain, (db: DatabaseSync) => open(db, now)),
  ];
}
