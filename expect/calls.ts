// Runs a Call script against Tasks' Domains on the Call pipeline, with the
// App's data and its Calls in one SQLite database in memory, and renders
// what happened and what the data is afterwards.
import { DatabaseSync } from "node:sqlite";
import { type ActionName, createCalls, type Outcome } from "@jaetask/open-agent-kit";
import { sqliteStore } from "@jaetask/open-agent-kit/sqlite";
import { table } from "@jaetask/snap";
import { sqliteCatalog } from "../src/catalog/catalog.js";
import { domains } from "../src/domains.js";
import { sqliteComments } from "../src/comments/comments.js";
import { sqliteImages } from "../src/images/images.js";
import { openJournal } from "../src/journal.js";
import { sqliteTickets } from "../src/tickets/tickets.js";

type Step = {
  /** The actor id the Call acts as. Defaults to the owner. */
  as?: string;
  call: string;
  input?: unknown;
  /** The Call id. Defaults to c1, c2, and so on. */
  id?: string;
};

const START = Date.parse("2026-01-01T09:00:00Z");
const json = (value: unknown) => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;

export function said(outcome: Outcome, read: boolean): string {
  if (outcome.state === "held") return "held";
  if (outcome.state !== "succeeded") {
    return `${outcome.state}: ${outcome.reason.code}: ${outcome.reason.message}`;
  }
  const output = outcome.output as { refused?: { code: string; message: string } } | null;
  if (output && typeof output === "object" && "refused" in output && output.refused) {
    return `refused: ${output.refused.code}: ${output.refused.message}`;
  }
  if (read) return `succeeded:\n\n${json(outcome.output)}\n`;
  const changes = outcome.changes.map((c) => `${c.kind} ${c.subject} ${c.id}`).join(", ");
  return `succeeded${changes ? `; ${changes}` : ""}`;
}

/** The data after the script, one section per part of Tasks. */
export function renderData(db: DatabaseSync): string[] {
  const journal = openJournal(db, () => START);
  const repository = sqliteCatalog(db, journal.rows);
  const catalog = repository.read();
  const tickets = sqliteTickets(db, journal.rows, repository, () => ({ comments: 0, images: 0 }));
  const all = (["open", "archived", "canceled"] as const).flatMap((state) =>
    tickets.find({ state }),
  );
  const features = catalog.projects.flatMap((p) => tickets.features(p.id, true));
  const nameOf = (id: string) => catalog.actors.find((a) => a.id === id)?.name || id;
  const comments = all.flatMap((t) =>
    sqliteComments(db, journal.rows, nameOf)
      .thread(t.id)
      .flatMap((c) => [c, ...c.replies]),
  );
  const images = all.flatMap((t) => sqliteImages(db, journal.rows).list(t.id));
  return [
    "### Actors",
    table(
      ["id", "name", "archived"],
      catalog.actors.map((a) => [a.id, a.name, a.archived ? "yes" : ""]),
    ),
    "### Projects",
    catalog.projects.length
      ? table(
          ["id", "name", "icon", "archived", "columns"],
          catalog.projects.map((p) => [
            p.id,
            p.name,
            `${p.icon} ${p.colour}`.trim(),
            p.archived ? "yes" : "",
            p.columns.map((c) => `${c.id} ${c.name} (${c.kind})`).join(" · "),
          ]),
        )
      : "None.",
    "### Labels",
    catalog.labels.length
      ? table(
          ["id", "name", "colour"],
          catalog.labels.map((l) => [l.id, l.name, l.colour]),
        )
      : "None.",
    "### Features",
    features.length
      ? table(
          ["id", "project", "name", "favourite", "archived", "open tickets"],
          features.map((f) => [
            f.id,
            f.project,
            f.name,
            f.favourite ? "yes" : "",
            f.archived ? "yes" : "",
            f.tickets,
          ]),
        )
      : "None.",
    "### Tickets",
    all.length
      ? table(
          ["id", "title", "feature", "column", "assigned", "labels", "blocked", "state"],
          all.map((t) => [
            t.id,
            t.title,
            t.featureName,
            t.backlog ? "(backlog)" : t.column.name,
            t.assigneeName,
            t.labels.map((l) => l.name).join(", "),
            t.blocked ?? "",
            t.state,
          ]),
        )
      : "None.",
    "### Comments",
    comments.length
      ? table(
          ["id", "ticket", "reply to", "author", "text", "reactions"],
          comments.map((c) => [
            c.id,
            c.ticket,
            c.replyTo ?? "",
            c.authorName,
            c.removed ? "(removed)" : c.text + (c.editedAt ? " (edited)" : ""),
            c.reactions.map((r) => `${r.emoji} ${r.actors.join(" ")}`).join(", "),
          ]),
        )
      : "None.",
    "### Images",
    images.length
      ? table(
          ["id", "ticket", "name", "type", "bytes", "by"],
          images.map((i) => [i.id, i.ticket, i.name, i.type, i.size, i.by]),
        )
      : "None.",
    "### Changes",
    table(
      ["id", "at", "actor", "action", "summary", "ticket", "undone by"],
      journal
        .list({ limit: 500 })
        .map((c) => [
          c.id,
          c.at.slice(11, 16),
          c.actor,
          c.action,
          c.summary,
          c.ticket ?? "",
          c.undoneBy ?? "",
        ]),
    ),
  ];
}

export async function renderScript(input: string): Promise<string> {
  const { steps } = JSON.parse(input) as { steps: Step[] };
  const db = new DatabaseSync(":memory:");
  let clock = START;
  const provided = domains(() => clock);
  const effects = new Map(
    provided.flatMap(({ domain }) =>
      domain.actions.map((a) => [`${domain.name}.${a.name}`, a.effect]),
    ),
  );
  const calls = createCalls({ store: sqliteStore(db), domains: provided, now: () => clock });
  const lines: string[] = [];
  for (const [i, step] of steps.entries()) {
    clock = START + (i + 1) * 60_000;
    const actor = step.as ?? "owner";
    const outcome = await calls.invoke({
      id: step.id ?? `c${i + 1}`,
      action: step.call as ActionName,
      input: step.input ?? {},
      principal: { id: actor },
      caller: actor === "owner" ? "ui" : "plugin",
    });
    const shown = step.input === undefined ? "" : ` ${JSON.stringify(step.input)}`;
    lines.push(
      `${i + 1}. ${actor} calls ${step.call}${shown} → ${said(outcome, effects.get(step.call) === "read")}`,
    );
  }
  const data = renderData(db);
  db.close();
  return ["### Steps", lines.join("\n"), ...data].join("\n\n");
}
