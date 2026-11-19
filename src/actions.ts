// How Tasks defines its Actions. A read may answer with a refusal; a write
// also checks its actor, rolls back if it refuses, and records its change.
import type { DatabaseSync } from "node:sqlite";
import { type Card, type Change, defineAction, type RunContext } from "@jaetask/open-agent-kit";
import type { z } from "zod";
import type { Journal } from "./journal.js";
import { answer, attempt, orRefused, Refusal } from "./refusal.js";

/** What every Domain's Actions get: the database, the record of changes, and who the actors are. */
export type Base = {
  db: DatabaseSync;
  journal: Journal;
  /** The name of an actor that may act now, or undefined. */
  actorName(id: string): string | undefined;
};

export type WriteContext<Deps> = RunContext<Deps> & {
  /** Records this Call's change, with the actor who made it. */
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
  const { run, output, ...rest } = definition;
  return defineAction<Input, ReturnType<typeof orRefused<Output>>, Deps>({
    ...rest,
    effect: "read",
    output: orRefused(output),
    // The union's inferred output is too deep for a generic; the schema checks it at run time.
    run: (input, context) => answer(() => run(input, context)) as never,
  });
}

export function writeAction<Input extends z.ZodType, Output extends z.ZodType, Deps extends Base>(
  domain: string,
  definition: Definition<Input, Output, WriteContext<Deps>>,
) {
  const { run, output, ...rest } = definition;
  return defineAction<Input, ReturnType<typeof orRefused<Output>>, Deps>({
    ...rest,
    effect: "write",
    output: orRefused(output),
    run: (input, context) =>
      attempt(context.db, () => {
        const actor = context.principal.id;
        if (context.actorName(actor) === undefined) {
          throw new Refusal("unknown-actor", `${actor} is not an actor that may act.`);
        }
        return run(input, {
          ...context,
          log: (summary, change, ticket) => {
            context.journal.record({
              actor,
              action: `${domain}.${definition.name}`,
              summary,
              ticket,
            });
            context.change(change);
          },
        });
      }) as never,
  });
}
