// Tasks' Domains, each paired with its dependencies on the App database.
import type { DatabaseSync } from "node:sqlite";
import { type Provided, provide } from "@jaetask/open-agent-kit";
import type { Base } from "./actions.js";
import { migrateCatalog, sqliteCatalog } from "./catalog/catalog.js";
import { catalogDomain } from "./catalog/domain.js";
import { historyDomain } from "./history/domain.js";
import { migrateIds } from "./ids.js";
import { migrateJournal, openJournal } from "./journal.js";
import { ticketsDomain } from "./tickets/domain.js";
import { migrateTickets, sqliteTickets } from "./tickets/tickets.js";

const migrated = new WeakSet<DatabaseSync>();

/** Creates Tasks' tables in `db`, once per open database. */
export function migrate(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  db.exec("PRAGMA foreign_keys = ON");
  migrateIds(db);
  migrateJournal(db);
  migrateCatalog(db);
  migrateTickets(db);
  migrated.add(db);
}

/** Everything one Call needs, built on the store's connection. */
function open(db: DatabaseSync, now: () => number) {
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
  const tickets = sqliteTickets(db, journal.rows, catalog);
  return { ...base, catalog, tickets, now };
}

export function domains(now: () => number = Date.now): Provided<DatabaseSync>[] {
  return [
    provide(catalogDomain, (db: DatabaseSync) => {
      const deps = open(db, now);
      return { ...deps, vacate: (from, to) => deps.tickets.vacate(from, to.id) };
    }),
    provide(ticketsDomain, (db: DatabaseSync) => ({ ...open(db, now), purge: () => {} })),
    provide(historyDomain, (db: DatabaseSync) => open(db, now)),
  ];
}
