import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createTasks } from "../app.js";
import type { Ticket } from "./tickets.js";

test("a change marked as imported does not count as the last time a ticket changed", async () => {
  let clock = Date.parse("2026-01-01T09:00:00Z");
  const app = await createTasks({
    file: ":memory:",
    stepsDir: mkdtempSync(join(tmpdir(), "tasks-steps-")),
    now: () => clock,
    log: () => {},
    sweepEvery: 0,
    syncEvery: 0,
  });
  let n = 0;
  const call = async (action: string, input: unknown) => {
    const outcome = await app.calls.invoke({
      id: `t${++n}`,
      action: action as `${string}.${string}`,
      input,
      principal: { id: "owner" },
      caller: "ui",
    });
    assert.equal(outcome.state, "succeeded", action);
    return (outcome as unknown as { output: Ticket }).output;
  };
  try {
    await call("catalog.project-create", { name: "Talk", prefix: "TLK" });
    const made = await call("tickets.ticket-create", { project: "TLK", title: "Voice notes" });
    clock = Date.parse("2026-03-01T09:00:00Z");
    await call("tickets.ticket-priority-set", { ticket: "TLK-1", priority: "high" });
    const edited = await call("tickets.ticket-read", { ticket: "TLK-1" });
    assert.equal(edited.updatedAt, "2026-03-01T09:00:00.000Z");
    app.db
      .prepare("UPDATE changes SET imported = 1 WHERE action = 'tickets.ticket-priority-set'")
      .run();
    const read = await call("tickets.ticket-read", { ticket: "TLK-1" });
    assert.equal(read.updatedAt, made.updatedAt);
  } finally {
    await app.close();
  }
});
