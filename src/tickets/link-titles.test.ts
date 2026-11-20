import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createTasks } from "../app.js";
import type { Ticket } from "./tickets.js";

test("a new link gets its page's title once; a page with none keeps its address", async () => {
  const asked: string[] = [];
  const app = await createTasks({
    file: ":memory:",
    stepsDir: mkdtempSync(join(tmpdir(), "tasks-steps-")),
    log: () => {},
    sweepEvery: 0,
    syncEvery: 0,
    readTitle: async (url) => {
      asked.push(url);
      return url.endsWith("/guide")
        ? { title: "The Talk guide", description: "Voice notes" }
        : null;
    },
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
    assert.equal(outcome.state, "succeeded", `${action}: ${JSON.stringify(outcome)}`);
    return (outcome as { output: unknown }).output;
  };
  await call("catalog.project-create", { name: "Talk", prefix: "TLK" });
  await call("tickets.ticket-create", {
    project: "TLK",
    title: "Write the guide",
    links: ["https://example.com/guide"],
  });
  await call("tickets.ticket-link-add", { ticket: "TLK-1", url: "https://example.com/none" });
  // Changing the ticket in other ways asks no page anything.
  await call("tickets.ticket-edit", { ticket: "TLK-1", title: "Write the Talk guide" });
  await app.close();
  assert.deepEqual(asked.sort(), ["https://example.com/guide", "https://example.com/none"]);
});

test("the title read is recorded on the link", async () => {
  const app = await createTasks({
    file: ":memory:",
    stepsDir: mkdtempSync(join(tmpdir(), "tasks-steps-")),
    log: () => {},
    sweepEvery: 0,
    syncEvery: 0,
    readTitle: async () => ({ title: "Pull request 7", description: "" }),
  });
  const invoke = (id: string, action: string, input: unknown) =>
    app.calls.invoke({
      id,
      action: action as `${string}.${string}`,
      input,
      principal: { id: "owner" },
      caller: "ui",
    });
  await invoke("a", "catalog.project-create", { name: "Talk", prefix: "TLK" });
  await invoke("b", "tickets.ticket-create", { project: "TLK", title: "Voice notes" });
  await invoke("c", "tickets.ticket-link-add", {
    ticket: "TLK-1",
    url: "https://example.com/pull/7",
  });
  // The title arrives after the Call that added the link has answered.
  for (let i = 0; i < 50; i += 1) {
    const read = await invoke(`r${i}`, "tickets.ticket-read", { ticket: "TLK-1" });
    const ticket = (read as unknown as { output: Ticket }).output;
    if (ticket.links[0]?.title) {
      assert.equal(ticket.links[0].title, "Pull request 7");
      await app.close();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await app.close();
  assert.fail("the link never got its title");
});
