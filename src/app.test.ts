import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createTasks } from "./app.js";

const start = async () => {
  const app = await createTasks({
    file: ":memory:",
    stepsDir: mkdtempSync(join(tmpdir(), "tasks-steps-")),
    log: () => {},
    sweepEvery: 0,
    syncEvery: 0,
  });
  return { app, base: await app.listen(0) };
};

const statusAs = (base: string, path: string, host: string) =>
  new Promise<number>((resolve, reject) => {
    const asked = request(`${base}${path}`, { headers: { host } }, (answer) => {
      answer.resume();
      resolve(answer.statusCode ?? 0);
    });
    asked.on("error", reject);
    asked.end();
  });

test("the page reaches Tasks as its owner with no sign-in", async () => {
  const { app, base } = await start();
  try {
    const answer = await fetch(`${base}/api/calls`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-kit-request": "1" },
      body: JSON.stringify({
        action: "catalog.project-create",
        input: { name: "Talk", prefix: "TLK" },
      }),
    });
    assert.equal(((await answer.json()) as { state: string }).state, "succeeded");
    assert.equal((await fetch(`${base}/api/session`)).status, 404);
    const events = await fetch(`${base}/events`);
    assert.equal(events.status, 200);
    await events.body?.cancel();
  } finally {
    await app.close();
  }
});

test("Tasks answers only requests addressed to this computer", async () => {
  const { app, base } = await start();
  try {
    const port = new URL(base).port;
    assert.equal(await statusAs(base, "/health", `127.0.0.1:${port}`), 200);
    assert.equal(await statusAs(base, "/health", `localhost:${port}`), 200);
    assert.equal(await statusAs(base, "/api/connections", `evil.example:${port}`), 403);
  } finally {
    await app.close();
  }
});
