#!/usr/bin/env node
// Drives Tasks' page in headless Chromium, as the owner would use it, with an
// agent connecting and working over MCP beside it. Prints each step, and
// retakes the screenshots in docs/img. Needs Chromium once:
//   npx playwright-core install chromium
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const PORT = process.env.CHECK_PORT ?? "18083";
const SECRET = "check-page-secret";
const base = `http://127.0.0.1:${PORT}`;
const data = mkdtempSync(join(tmpdir(), "tasks-page-"));
// The owner's script steps are in the data folder.
cpSync("expect/inbox/steps", join(data, "steps"), { recursive: true });
const server = spawn("node", ["--import", "tsx", "src/main.ts"], {
  env: { ...process.env, PORT, DATA_DIR: data, KIT_SETUP_SECRET: SECRET },
  stdio: "ignore",
});
for (let i = 0; i < 50; i++) {
  if (
    await fetch(`${base}/health`).then(
      (r) => r.ok,
      () => false,
    )
  )
    break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
});
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("dialog", (d) => d.accept("waiting on the API key"));

const shot = (name) => page.screenshot({ path: `docs/img/${name}.png` });
const count = (selector) => page.locator(selector).count();
const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 5000 });
async function step(name, run) {
  try {
    await run();
    console.log(`ok    ${name}`);
  } catch (error) {
    console.log(`FAIL  ${name}: ${error.message.split("\n")[0]}`);
    problems.push(name);
  }
}

// An agent's side: it asks to connect, collects its key, and calls tools over MCP.
const json = { "content-type": "application/json" };
const post = (path, body, headers = {}) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { ...json, ...headers },
    body: JSON.stringify(body),
  });
let key = "";
let calls = 0;
async function agent(tool, args) {
  const response = await post(
    "/mcp",
    {
      jsonrpc: "2.0",
      id: ++calls,
      method: "tools/call",
      params: { name: tool, arguments: args },
    },
    { accept: "application/json, text/event-stream", authorization: `Bearer ${key}` },
  );
  if (!response.ok) throw new Error(`MCP answered ${response.status}`);
}

try {
  await page.goto(base);
  await step("sign in with the setup secret", async () => {
    await page.fill("#secret", SECRET);
    await page.click("#sign-in-form button");
    await page.waitForSelector("#setup:not([hidden])");
  });
  await step("name the owner", async () => {
    await page.fill("#owner-name", "Sam");
    await page.click("#setup-form button");
    await page.waitForSelector("text=Create your first project");
  });
  await step("create a project; its board has four columns", async () => {
    await page.fill('[aria-label="Project name"]', "Talk");
    await page.fill('[aria-label="Prefix"]', "tlk");
    await page.click("text=Create project");
    await page.waitForSelector(".column");
    if ((await count(".column")) !== 4) throw new Error("not four columns");
  });
  await step("settings: add an actor and two labels", async () => {
    await page.click('a[data-view="settings"]');
    await page.waitForSelector("text=Actors");
    await page.fill('[aria-label="New actor\'s name, such as Coder"]', "Coder");
    await page.click("text=Add actor");
    await until(() => document.querySelectorAll("#view .avatar").length === 2);
    await page.fill('[aria-label="New label, such as bug"]', "voice");
    await page.click("text=Add label");
    await page.waitForSelector(".label.teal");
    await page.selectOption('[aria-label="Colour of the new label"]', "red");
    await page.fill('[aria-label="New label, such as bug"]', "bug");
    await page.click("text=Add label");
    await page.waitForSelector(".label.red");
  });
  await step("add two tickets on the board", async () => {
    await page.click('a[data-view="board"]');
    await page.waitForSelector(".column");
    for (const [i, title] of ["Voice notes on the phone", "Fix the crash on send"].entries()) {
      await page.fill('[aria-label="New ticket"]', title);
      await page.press('[aria-label="New ticket"]', "Enter");
      await until((n) => document.querySelectorAll(".card").length === n, i + 1);
    }
  });
  await step("open a ticket: describe, label, comment, react, reply", async () => {
    await page.click(".card >> nth=0");
    await page.waitForSelector("#ticket[open] h2");
    await page.click("#tk-head >> text=Edit");
    await page.fill(
      '[aria-label="Description"]',
      "Record a voice note from the phone and attach it to a chat. It should work with the screen locked.",
    );
    await page.click("text=Save");
    await page.waitForSelector("text=Record a voice note");
    await page.selectOption('[aria-label="Add a label"]', { label: "voice" });
    await page.waitForSelector("#tk-labels .label");
    await page.fill("#tk-text", "Keep the record button big on the lock screen.");
    await page.press("#tk-text", "Enter");
    await page.waitForSelector(".comment");
    await page.click('[aria-label="React with 👀"]');
    await page.waitForSelector('.reactions button[aria-pressed="true"]');
  });
  await step("attach an image", async () => {
    await page.setInputFiles('[aria-label="Add an image"]', {
      name: "record-button.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
    await page.waitForSelector(".thumb img");
  });
  await step("mark it blocked, then undo that from its line", async () => {
    await page.click("text=Mark blocked");
    await page.waitForSelector(".blocked-box");
    await page.click(".line >> text=Undo >> nth=-1");
    await until(() => document.querySelector(".blocked-box") === null);
    await page.click("#tk-close");
  });
  await step("an agent asks to connect; approve it as Coder", async () => {
    const asked = await (
      await post("/pair", { host: "Coding agent", effects: ["read", "write"] })
    ).json();
    await page.click('a[data-view="connections"]');
    await page.waitForSelector("text=Coding agent");
    await shot("connections");
    await page.click("text=Approve");
    await page.waitForSelector("text=Revoke");
    key = (await (await post(`/pair/${asked.id}/claim`, { claim: asked.claim })).json()).token;
  });
  await step("the agent's work shows on the board as it happens", async () => {
    await page.click('a[data-view="board"]');
    await page.waitForSelector(".column");
    await agent("tickets__ticket-claim", { ticket: "TLK-1" });
    await agent("comments__comment-add", {
      ticket: "TLK-1",
      text: "Recording works in the app. Next: recording with the screen locked.",
    });
    await agent("tickets__ticket-create", { project: "TLK", title: "Show the recording length" });
    await agent("tickets__ticket-block", { ticket: "TLK-2", note: "needs a crash report" });
    await until(
      () => document.querySelectorAll(".column")[1].querySelectorAll(".card").length === 1,
    );
    await page.waitForSelector("text=Show the recording length");
    await page.waitForSelector(".card.blocked");
  });
  await shot("board");
  await step("the ticket shows the agent's comment and its changes", async () => {
    await page.click("text=Voice notes on the phone");
    await page.waitForSelector(".agent");
    await page.waitForSelector("text=Coder claimed TLK-1 and moved it to Doing");
    await page.click(".reactions >> text=Reply >> nth=-1");
    await page.fill("#tk-text", "Good. Ask for review when the lock screen works.");
    await page.press("#tk-text", "Enter");
    await page.waitForSelector(".comment.reply");
  });
  await page.evaluate(() => document.getElementById("ticket").scrollTo(0, 0));
  await shot("ticket");
  await step("drag a ticket to another column", async () => {
    await page.click("#tk-close");
    await page.dragAndDrop("text=Show the recording length", ".column >> nth=3");
    await until(
      () => document.querySelectorAll(".column")[3].querySelectorAll(".card").length === 1,
    );
  });
  await step("edit the columns: rename, add, move, remove", async () => {
    await page.click("text=Edit columns");
    await page.waitForSelector('[aria-label="Column name"]');
    // True when the column name at `index` is `name`, and there are `length` columns.
    const columns = ([index, name, length]) => {
      const names = [...document.querySelectorAll('.column-edit [aria-label="Column name"]')].map(
        (input) => input.value,
      );
      return names[index] === name && names.length === length;
    };
    await page.fill('[aria-label="Column name"] >> nth=2', "Code review");
    await page.press('[aria-label="Column name"] >> nth=2', "Tab");
    await until(columns, [2, "Code review", 4]);
    await page.fill('[aria-label="Column name"] >> nth=4', "Sign-off");
    await page.press('[aria-label="Column name"] >> nth=4', "Enter");
    await until(columns, [4, "Sign-off", 5]);
    await page.click('[aria-label="Move column left"] >> nth=4');
    await until(columns, [3, "Sign-off", 5]);
    await shot("columns");
    await page.click(".column >> nth=3 >> text=Remove");
    await until(columns, [3, "Done", 4]);
    await page.click("text=Done editing");
    await page.waitForSelector(".column-head");
  });
  await step("inbox: capture an item; with no steps it lands as received", async () => {
    await page.click('a[data-view="inbox"]');
    await page.waitForSelector("text=No steps yet");
    await page.fill(
      '[aria-label="A new idea or request"]',
      "Need export to CSV for the Money app pls!!",
    );
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.waitForSelector(".items li");
  });
  await step("inbox: add a spam check step; spam is rejected, with the run recorded", async () => {
    await page.fill('[aria-label="Step name"]', "Spam check");
    await page.fill('[aria-label^="File in the steps folder"]', "spam-check.mjs");
    await page.check("label.check >> text=reject");
    await page.click("text=Add step");
    await page.waitForSelector("ol.list >> text=Spam check");
    await page.fill('[aria-label="A new idea or request"]', "CHEAP WATCHES click here now");
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.fill(
      '[aria-label="A new idea or request"]',
      "the board crashes when I drag a ticket",
    );
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.waitForSelector(".items >> text=bug");
    if ((await count(".items > li")) !== 2) throw new Error("the spam is in the inbox");
    await page.click(".items > li >> nth=1 >> text=What the steps did");
    await page.waitForSelector(".runs >> text=not spam; a bug");
    await shot("inbox");
    await page.click("button >> text=rejected");
    await page.waitForSelector("text=Reason: looks like spam");
  });
  await step("inbox: turn an item into a ticket", async () => {
    await page.click("button >> text=received");
    await page.waitForSelector(".items li");
    await page.selectOption('[aria-label="Turn into a ticket"] >> nth=0', { label: "Talk" });
    await until(() => document.querySelectorAll(".items > li").length === 1);
    await page.click("button >> text=promoted");
    await page.waitForSelector("text=Open TLK-4");
  });
  await step("archive a ticket, then restore it from the Archive", async () => {
    await page.click('a[data-view="board"]');
    await page.waitForSelector(".column");
    await page.click("text=Show the recording length");
    await page.waitForSelector("#ticket[open]");
    await page.click("#tk-actions >> text=Archive");
    await page.waitForSelector("#tk-actions >> text=Restore");
    await page.click("#tk-close");
    await page.click('a[data-view="archive"]');
    await page.waitForSelector("td >> text=Show the recording length");
    await page.click("td >> text=Restore");
    await page.waitForSelector("text=Nothing here");
  });
  await step("the Changes screen lists who did what", async () => {
    await page.click('a[data-view="changes"]');
    await page.waitForSelector("text=restored TLK-3");
    await page.waitForSelector("td >> text=Coder");
  });
  await step("revoke the agent; it is cut off", async () => {
    await page.click('a[data-view="connections"]');
    await page.click("text=Revoke");
    await page.waitForSelector("td >> text=revoked");
    const cut = await agent("tickets__work-find", {}).then(
      () => false,
      () => true,
    );
    if (!cut) throw new Error("the agent can still call");
  });
  await step("at phone width the page does not scroll sideways", async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.click('a[data-view="board"]');
    await page.waitForSelector(".column");
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    if (wide) throw new Error("the page scrolls sideways");
  });
} finally {
  await browser.close();
  server.kill();
  rmSync(data, { recursive: true, force: true });
}
console.log(
  problems.length
    ? `\n${problems.length} problems:\n${problems.join("\n")}`
    : "\nAll steps passed.",
);
process.exit(problems.length ? 1 : 0);
