// Runs a Call script against Tasks' Domains on the Call pipeline, with the
// App's data and its Calls in one SQLite database in memory, and renders
// what happened and what the data is afterwards.
import { DatabaseSync } from "node:sqlite";
import { type ActionName, createCalls, type Outcome } from "@jaetask/open-agent-kit";
import { sqliteStore } from "@jaetask/open-agent-kit/sqlite";
import { table } from "@jaetask/snap";
import { sqliteCatalog } from "../src/catalog/catalog.js";
import { domains } from "../src/domains.js";
import { openJournal } from "../src/journal.js";

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

function said(outcome: Outcome, read: boolean): string {
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
  const catalog = sqliteCatalog(db, journal.rows).read();
  return [
    "### Actors",
    table(
      ["id", "name", "archived"],
      catalog.actors.map((a) => [a.id, a.name, a.archived ? "yes" : ""]),
    ),
    "### Projects",
    catalog.projects.length
      ? table(
          ["id", "name", "archived", "columns"],
          catalog.projects.map((p) => [
            p.id,
            p.name,
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
