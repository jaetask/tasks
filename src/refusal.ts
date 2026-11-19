// A refusal is a Domain saying no for a reason a person or an agent can act
// on: no such ticket, a name already taken. It is part of an Action's output.
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

/** Thrown inside a write to refuse it. Everything the write changed is put back. */
export class Refusal extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const Refused = z.object({
  refused: z.object({ code: z.string(), message: z.string() }),
});
export type Refused = z.infer<typeof Refused>;

/** An output schema that is either `schema` or a refusal. */
export const orRefused = <T extends z.ZodType>(schema: T) => z.union([schema, Refused]);

/** For a read: a Refusal thrown inside `work` becomes the output. */
export function answer<T>(work: () => T): T | Refused {
  try {
    return work();
  } catch (error) {
    if (error instanceof Refusal) return { refused: { code: error.code, message: error.message } };
    throw error;
  }
}

export const isRefused = (value: unknown): value is Refused =>
  typeof value === "object" && value !== null && "refused" in value;

/**
 * Runs `work`. A Refusal thrown inside it becomes the output, and whatever
 * `work` wrote before refusing is rolled back.
 */
export function attempt<T>(db: DatabaseSync, work: () => T): T | Refused {
  db.exec("SAVEPOINT attempt");
  try {
    const value = work();
    db.exec("RELEASE attempt");
    return value;
  } catch (error) {
    db.exec("ROLLBACK TO attempt");
    db.exec("RELEASE attempt");
    if (error instanceof Refusal) return { refused: { code: error.code, message: error.message } };
    throw error;
  }
}
