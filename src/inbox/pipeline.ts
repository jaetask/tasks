// Runs the owner's steps on an inbox item, in order. Each step's Calls go
// through the Call pipeline as the step's actor, limited to the Actions the
// step was given. A reject, dismiss or promote ends the run. Every run is
// recorded.
import type { DatabaseSync } from "node:sqlite";
import { type ActionName, type Calls, contract } from "@jaetask/open-agent-kit";
import { openJournal } from "../journal.js";
import { inboxDomain } from "./domain.js";
import { type Condition, INTAKE, type Item, sqliteInbox } from "./inbox.js";
import { type Run, type StepRun, sqliteRuns } from "./runs.js";
import { ask } from "./steps.js";

export type PipelineOptions = {
  db: DatabaseSync;
  calls: Calls;
  now: () => number;
  stepsDir: string;
  env?: Record<string, string | undefined>;
};

export type Pipeline = {
  /** Runs the steps on an item and returns the run's record. Runs take turns. */
  run(item: string): Promise<Run>;
  /** Runs the steps on every received item no run has looked at yet. */
  catchUp(): Promise<void>;
  /** Resolves when no run is under way or waiting. */
  idle(): Promise<void>;
};

const ENDING = ["rejected", "dismissed", "promoted"];

function matches(condition: Condition | null, item: Item): string | null {
  if (!condition) return null;
  if (condition.project !== undefined && item.project !== condition.project) {
    return `only runs on items for ${condition.project}`;
  }
  if (condition.tag !== undefined && !item.tags.includes(condition.tag)) {
    return `only runs on items tagged ${condition.tag}`;
  }
  if (condition.category !== undefined && item.category !== condition.category) {
    return `only runs on items in the category ${condition.category}`;
  }
  if (condition.source !== undefined && item.source !== condition.source) {
    return `only runs on items from ${condition.source}`;
  }
  const words = `${item.title} ${item.text}`.toLowerCase();
  if (condition.word !== undefined && !words.includes(condition.word.toLowerCase())) {
    return `only runs on items with the word ${condition.word}`;
  }
  return null;
}

export function createPipeline(options: PipelineOptions): Pipeline {
  const { db, calls, now } = options;
  const inbox = sqliteInbox(db, openJournal(db, now).rows);
  const runs = sqliteRuns(db);
  const actions = contract(inboxDomain).actions;
  const context = { stepsDir: options.stepsDir, calls, env: options.env ?? process.env, actions };

  const runOnce = async (id: string): Promise<Run> => {
    const run = runs.start(id, new Date(now()).toISOString());
    const done: StepRun[] = [];
    let ended = "";
    for (const step of inbox.steps()) {
      const item = inbox.item(id);
      const record: StepRun = { step: step.id, name: step.name, ran: false, reason: "", calls: [] };
      done.push(record);
      const skip = step.on ? matches(step.condition, item) : "switched off";
      if (skip) {
        record.reason = `skipped: ${skip}`;
        continue;
      }
      record.ran = true;
      try {
        const answer = await ask(
          step,
          { item, earlier: done.slice(0, -1), actions: step.actions },
          context,
        );
        record.reason = answer.reason;
        for (const [n, call] of answer.calls.entries()) {
          const made = { action: call.action, input: call.input as unknown, outcome: "" };
          record.calls.push(made);
          const known = (INTAKE as readonly string[]).includes(call.action);
          if (!known || !step.actions.includes(call.action as (typeof INTAKE)[number])) {
            made.outcome = "refused: the step was not given this Action";
            continue;
          }
          const outcome = await calls.invoke({
            id: `${run}.${step.id}.${n + 1}`,
            action: `inbox.${call.action}` as ActionName,
            input: { ...call.input, item: id },
            principal: { id: step.actor },
            caller: "app",
          });
          if (outcome.state !== "succeeded") {
            made.outcome = `${outcome.state}${"reason" in outcome ? `: ${outcome.reason.message}` : ""}`;
          } else {
            made.outcome = "done";
          }
        }
      } catch (error) {
        record.reason = `failed: ${(error as Error).message}`;
      }
      runs.save(run, done, "running");
      const { state } = inbox.item(id);
      if (ENDING.includes(state)) {
        ended = `${step.name} ended the run: the item was ${state}`;
        break;
      }
    }
    const { state } = inbox.item(id);
    const turn = done.length === 0 ? "there are no steps" : "every step had its turn";
    runs.save(run, done, ended || `${turn}: the item is ${state}`);
    return runs.of(id).at(-1) as Run;
  };

  let tail: Promise<unknown> = Promise.resolve();
  const run = (id: string) => {
    const result = tail.then(() => runOnce(id));
    tail = result.catch(() => undefined);
    return result;
  };
  return {
    run,
    catchUp: async () => {
      await Promise.all(runs.waiting().map(run));
    },
    idle: async () => {
      let seen: Promise<unknown> | undefined;
      while (seen !== tail) {
        seen = tail;
        await seen;
      }
    },
  };
}
