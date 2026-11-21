import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

export const StepRun = z.object({
  step: z.string(),
  name: z.string(),
  ran: z.boolean().describe("False when the step was skipped."),
  reason: z.string().describe("Why the step did what it did, or why it was skipped."),
  calls: z.array(
    z.object({
      action: z.string(),
      input: z.unknown(),
      outcome: z.string().describe("done, or why it was not."),
    }),
  ),
});
export type StepRun = z.infer<typeof StepRun>;

export const Run = z.object({
  id: z.string(),
  item: z.string(),
  at: z.string(),
  steps: z.array(StepRun),
  ended: z.string().describe("How the run ended."),
});
export type Run = z.infer<typeof Run>;

export function migrateRuns(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS inbox_runs (seq INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT NOT NULL, at TEXT NOT NULL, steps TEXT NOT NULL, ended TEXT NOT NULL)",
  );
}

type Row = { seq: number; item: string; at: string; steps: string; ended: string };
const toRun = (r: Row): Run => ({
  id: `r${r.seq}`,
  item: r.item,
  at: r.at,
  steps: JSON.parse(r.steps) as StepRun[],
  ended: r.ended,
});

export function sqliteRuns(db: DatabaseSync) {
  return {
    start: (item: string, at: string): string => {
      const made = db
        .prepare("INSERT INTO inbox_runs (item, at, steps, ended) VALUES (?, ?, '[]', 'running')")
        .run(item, at);
      return `r${made.lastInsertRowid}`;
    },
    save: (id: string, steps: StepRun[], ended: string): void => {
      db.prepare("UPDATE inbox_runs SET steps = ?, ended = ? WHERE seq = ?").run(
        JSON.stringify(steps),
        ended,
        Number(id.slice(1)),
      );
    },
    of: (item: string): Run[] =>
      (db.prepare("SELECT * FROM inbox_runs WHERE item = ? ORDER BY seq").all(item) as Row[]).map(
        toRun,
      ),
    waiting: (): string[] =>
      (
        db
          .prepare(
            "SELECT id FROM inbox_items WHERE state = 'received' AND id NOT IN (SELECT item FROM inbox_runs) ORDER BY rowid",
          )
          .all() as { id: string }[]
      ).map((r) => r.id),
  };
}
