import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createTasks } from "../app.js";

const SECRET = "a-setup-secret-for-the-test";

async function start(filesFrom: string[] = []) {
  const filesDir = mkdtempSync(join(tmpdir(), "tasks-files-"));
  const app = await createTasks({
    file: ":memory:",
    setupSecret: SECRET,
    stepsDir: mkdtempSync(join(tmpdir(), "tasks-steps-")),
    filesDir,
    filesFrom,
    log: () => {},
    sweepEvery: 0,
    syncEvery: 0,
  });
  const base = await app.listen(0);
  const signIn = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-kit-request": "1" },
    body: JSON.stringify({ secret: SECRET }),
  });
  const cookie = (signIn.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  let n = 0;
  const call = async (action: string, input: unknown, actor = "owner") => {
    const outcome = await app.calls.invoke({
      id: `t${++n}`,
      action: action as `${string}.${string}`,
      input,
      principal: { id: actor },
      caller: actor === "owner" ? "ui" : "plugin",
    });
    return outcome as { state: string; output?: unknown; reason?: { code: string } };
  };
  await call("catalog.project-create", { name: "Talk", prefix: "TLK" });
  await call("tickets.ticket-create", { project: "TLK", title: "Voice notes" });
  return { app, base, cookie, filesDir, call };
}

const upload = (base: string, cookie: string, name: string, type: string, body: Uint8Array) =>
  fetch(`${base}/api/files?ticket=TLK-1&name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { cookie, "x-kit-request": "1", "content-type": type },
    body,
  });

test("a file is uploaded, listed, and read back whole or in part", async () => {
  const { app, base, cookie, filesDir, call } = await start();
  try {
    const bytes = Uint8Array.from({ length: 5000 }, (_, i) => i % 251);
    const sent = await upload(base, cookie, "clip.mp4", "video/mp4", bytes);
    assert.equal(sent.status, 200);
    const outcome = (await sent.json()) as { state: string; output: { id: string; size: number } };
    assert.equal(outcome.state, "succeeded");
    assert.equal(outcome.output.size, 5000);
    const id = outcome.output.id;

    const listed = await call("files.file-list", { ticket: "TLK-1" });
    assert.equal((listed.output as { name: string }[])[0]?.name, "clip.mp4");
    // Nothing is left waiting among the uploads.
    assert.deepEqual(readdirSync(join(filesDir, "staged")), []);

    const whole = await fetch(`${base}/api/files/${id}`, { headers: { cookie } });
    assert.equal(whole.status, 200);
    assert.equal(whole.headers.get("content-type"), "video/mp4");
    assert.equal(whole.headers.get("accept-ranges"), "bytes");
    assert.deepEqual(new Uint8Array(await whole.arrayBuffer()), bytes);

    const part = await fetch(`${base}/api/files/${id}`, {
      headers: { cookie, range: "bytes=100-199" },
    });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get("content-range"), "bytes 100-199/5000");
    assert.deepEqual(new Uint8Array(await part.arrayBuffer()), bytes.slice(100, 200));

    const tail = await fetch(`${base}/api/files/${id}`, {
      headers: { cookie, range: "bytes=-10" },
    });
    assert.equal(tail.headers.get("content-range"), "bytes 4990-4999/5000");
    const past = await fetch(`${base}/api/files/${id}`, {
      headers: { cookie, range: "bytes=9000-" },
    });
    assert.equal(past.status, 416);
  } finally {
    await app.close();
  }
});

test("bytes are only for the signed-in person, from this page", async () => {
  const { app, base, cookie } = await start();
  try {
    const bytes = new TextEncoder().encode("<script>alert(1)</script>");
    const noCookie = await upload(base, "", "a.txt", "text/plain", bytes);
    assert.equal(noCookie.status, 401);
    const noHeader = await fetch(`${base}/api/files?ticket=TLK-1&name=a.txt`, {
      method: "POST",
      headers: { cookie },
      body: bytes,
    });
    assert.equal(noHeader.status, 403);
    const elsewhere = await fetch(`${base}/api/files?ticket=TLK-1&name=a.txt`, {
      method: "POST",
      headers: { cookie, "x-kit-request": "1", origin: "https://elsewhere.example" },
      body: bytes,
    });
    assert.equal(elsewhere.status, 403);

    const sent = await upload(base, cookie, "page.html", "text/html", bytes);
    const id = ((await sent.json()) as { output: { id: string } }).output.id;
    assert.equal((await fetch(`${base}/api/files/${id}`)).status, 401);
    // A file a browser could run is only ever handed over as a download.
    const got = await fetch(`${base}/api/files/${id}`, { headers: { cookie } });
    assert.equal(got.headers.get("content-type"), "application/octet-stream");
    assert.match(got.headers.get("content-disposition") ?? "", /^attachment/);
    assert.equal(got.headers.get("x-content-type-options"), "nosniff");
    assert.equal((await fetch(`${base}/api/files/../app.db`, { headers: { cookie } })).status, 404);
    assert.equal((await fetch(`${base}/api/files/fl999`, { headers: { cookie } })).status, 404);
  } finally {
    await app.close();
  }
});

test("a file over the limit for its type is refused and not kept", async () => {
  const { app, base, cookie, filesDir, call } = await start();
  try {
    const big = new Uint8Array(25 * 1024 * 1024 + 1);
    const sent = await upload(base, cookie, "big.bin", "application/zip", big);
    assert.equal(sent.status, 413);
    // The same bytes as a video are within the video limit.
    const video = await upload(base, cookie, "big.mp4", "video/mp4", big);
    assert.equal(((await video.json()) as { state: string }).state, "succeeded");
    const listed = await call("files.file-list", { ticket: "TLK-1" });
    assert.equal((listed.output as unknown[]).length, 1);
    assert.deepEqual(readdirSync(join(filesDir, "staged")), []);
  } finally {
    await app.close();
  }
});

test("an agent attaches by path only from a folder the owner allows", async () => {
  const allowed = mkdtempSync(join(tmpdir(), "tasks-allowed-"));
  const other = mkdtempSync(join(tmpdir(), "tasks-other-"));
  writeFileSync(join(allowed, "notes.log"), "line one\n");
  writeFileSync(join(other, "secret.txt"), "not for tickets");
  symlinkSync(join(other, "secret.txt"), join(allowed, "link.txt"));

  const closed = await start();
  try {
    const refused = await closed.call("files.file-add-path", {
      ticket: "TLK-1",
      path: join(allowed, "notes.log"),
    });
    assert.equal(refused.reason?.code, "no-folder-allowed");
  } finally {
    await closed.app.close();
  }

  const { app, call } = await start([allowed]);
  try {
    const added = await call("files.file-add-path", {
      ticket: "TLK-1",
      path: join(allowed, "notes.log"),
    });
    assert.equal(added.state, "succeeded");
    assert.equal((added.output as { type: string; size: number }).type, "text/plain");
    for (const path of [
      join(other, "secret.txt"),
      join(allowed, "link.txt"),
      join(allowed, "..", "tasks-other-missing"),
      join(allowed, "missing.txt"),
      allowed,
    ]) {
      const outcome = await call("files.file-add-path", { ticket: "TLK-1", path });
      assert.notEqual(outcome.state, "succeeded", path);
    }
  } finally {
    await app.close();
  }
});
