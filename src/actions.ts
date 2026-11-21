import type { DatabaseSync } from "node:sqlite";
import { type Card, type Change, defineAction, type RunContext } from "@jaetask/open-agent-kit";
import type { z } from "zod";
import type { Journal } from "./journal.js";
import { Refusal } from "./refusal.js";

export type Base = {
  db: DatabaseSync;
  journal: Journal;
  actorName(id: string): string | undefined;
};

export type WriteContext<Deps> = RunContext<Deps> & {
  log(summary: string, change: Change, ticket?: string): void;
};

type Definition<Input extends z.ZodType, Output extends z.ZodType, Context> = {
  name: string;
  description: string;
  input: Input;
  output: Output;
  card?: Card;
  run(input: z.output<Input>, context: Context): z.output<Output>;
};

export function readAction<Input extends z.ZodType, Output extends z.ZodType, Deps extends Base>(
  definition: Definition<Input, Output, RunContext<Deps>>,
) {
  return defineAction<Input, Output, Deps>({ ...definition, effect: "read" });
}

export function writeAction<Input extends z.ZodType, Output extends z.ZodType, Deps extends Base>(
  domain: string,
  definition: Definition<Input, Output, WriteContext<Deps>>,
) {
  const { run, ...rest } = definition;
  return defineAction<Input, Output, Deps>({
    ...rest,
    effect: "write",
    run: (input, context) => {
      const actor = context.principal.id;
      if (context.actorName(actor) === undefined) {
        throw new Refusal("unknown-actor", `${actor} is not an actor that may act.`);
      }
      return run(input, {
        ...context,
        log: (summary, change, ticket) => {
          if (context.journal.pending() === 0) return;
          context.journal.record({
            actor,
            action: `${domain}.${definition.name}`,
            summary,
            ticket,
          });
          context.change(change);
        },
      });
    },
  });
}
