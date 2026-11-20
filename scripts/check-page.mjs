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
  await step("create a project; the Overview shows the four kinds", async () => {
    await page.fill('[aria-label="Project name"]', "Talk");
    await page.fill('[aria-label="Prefix"]', "tlk");
    await page.click("text=Create project");
    await page.waitForSelector(".column");
    if ((await count(".column")) !== 4) throw new Error("not four columns");
  });
  await step("the project's board has its four columns", async () => {
    await page.click('.side-row a[href="#/board/TLK"]');
    await page.waitForSelector(".column-head >> text=Review");
    if ((await count(".column")) !== 4) throw new Error("not four columns");
  });
  await step("settings: add an actor and two labels", async () => {
    await page.click('a[href="#/settings"]');
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
    await page.click('.side-row a[href="#/board/TLK"]');
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
    await page.click('a[href="#/connections"]');
    await page.waitForSelector("text=Coding agent");
    await shot("connections");
    await page.click("text=Approve");
    await page.waitForSelector("text=Revoke");
    key = (await (await post(`/pair/${asked.id}/claim`, { claim: asked.claim })).json()).token;
  });
  await step("the agent's work shows on the board as it happens", async () => {
    await page.click('.side-row a[href="#/board/TLK"]');
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
  await step(
    "the Overview lines up every project's tickets by kind; search narrows it",
    async () => {
      await page.click('a[href="#/overview"]');
      await page.waitForSelector(".column-head >> text=waiting");
      if ((await count(".card")) !== 3) throw new Error("not three tickets");
      await page.fill('[aria-label="Search tickets"]', "crash");
      await page.press('[aria-label="Search tickets"]', "Enter");
      await until(() => document.querySelectorAll(".card").length === 1);
      await shot("overview");
      await page.fill('[aria-label="Search tickets"]', "");
      await page.press('[aria-label="Search tickets"]', "Enter");
      await until(() => document.querySelectorAll(".card").length === 3);
      await page.click('.side-row a[href="#/board/TLK"]');
      await page.waitForSelector(".column-head >> text=Review");
    },
  );
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
  await step("features: add one, put a ticket in it, and narrow the board to it", async () => {
    await page.click("#tk-close");
    await page.click('.side-sub a[href="#/features/TLK"]');
    await page.waitForSelector("text=No features yet");
    await page.fill('[aria-label="New feature, such as Voice"]', "Voice");
    await page.press('[aria-label="New feature, such as Voice"]', "Enter");
    await page.waitForSelector("text=0 open");
    await page.click('.side-sub a[href="#/board/TLK"]');
    await page.click(".card >> text=Voice notes on the phone");
    await page.waitForSelector("#ticket[open] h2");
    await page.selectOption('#tk-actions [aria-label="Feature"]', { label: "In Voice" });
    await page.click("#tk-close");
    await page.selectOption('.board-head [aria-label="Feature"]', { label: "Voice" });
    await until(() => document.querySelectorAll(".card").length === 1);
    await page.selectOption('.board-head [aria-label="Feature"]', { label: "Every feature" });
    await until(() => document.querySelectorAll(".card").length === 3);
    await page.click(".card >> text=Voice notes on the phone");
    await page.waitForSelector("#ticket[open] h2");
  });
  await step(
    "human input: an agent asks on a ticket; the owner answers from the list",
    async () => {
      await page.click("#tk-close");
      await agent("input__input-request", {
        ticket: "TLK-1",
        question: "Should recordings be kept after they are sent?",
        context: "Keeping them uses about 1 MB a minute.",
      });
      await page.waitForSelector(".side .count >> text=1");
      await page.waitForSelector(".card >> text=❓ 1");
      await page.click('a[href="#/input"]');
      await page.waitForSelector("text=Coder asks");
      await shot("human-input");
      await page.fill('[aria-label="Your answer"]', "Keep them for 30 days.");
      await page.press('[aria-label="Your answer"]', "Enter");
      await page.waitForSelector("text=No agent is waiting for you");
      await page.click("button >> text=Resolved");
      await page.waitForSelector("text=You answered: Keep them for 30 days.");
    },
  );
  await step("agent inbox: the owner's replies and answer wait there for the agent", async () => {
    await page.click('a[href="#/replies"]');
    await page.waitForSelector("text=Sam answered Coder");
    await page.waitForSelector("text=Sam replied to Coder");
    await shot("agent-inbox");
    const before = await count(".items > li");
    await page.click(".items button >> text=Acknowledge >> nth=0");
    await until((n) => document.querySelectorAll(".items > li").length === n - 1, before);
    await page.click("button >> text=Acknowledged");
    await page.waitForSelector("text=· acknowledged");
    await page.click('.side-row a[href="#/board/TLK"]');
    await page.click(".card >> text=Voice notes on the phone");
    await page.waitForSelector("#ticket[open] h2");
  });
  await step("backlog: a new ticket waits there, then goes to the board", async () => {
    await page.click("#tk-close");
    await page.click('.side-sub a[href="#/backlog/TLK"]');
    await page.waitForSelector("text=The backlog is empty");
    await page.fill('[aria-label="New ticket for the backlog"]', "Trim silence from recordings");
    await page.press('[aria-label="New ticket for the backlog"]', "Enter");
    await page.waitForSelector(".backlog .card");
    await page.click('.side-sub a[href="#/board/TLK"]');
    await page.waitForSelector(".column-head >> text=Review");
    if ((await count(".card")) !== 3) throw new Error("the backlog ticket is on the board");
    await page.click('.side-sub a[href="#/backlog/TLK"]');
    await page.click("text=To the board");
    await page.waitForSelector("text=The backlog is empty");
    await page.click('.side-sub a[href="#/board/TLK"]');
    await until(() => document.querySelectorAll(".card").length === 4);
    await page.click(".card >> text=Voice notes on the phone");
    await page.waitForSelector("#ticket[open] h2");
  });
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
    await page.click('.side-row a[href="#/board/TLK"]');
    await page.click('.side-sub a[href="#/intake/TLK"]');
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
    // The page draws again after a change; a person types slower than this script.
    await page.waitForTimeout(500);
    await page.fill('[aria-label="A new idea or request"]', "CHEAP WATCHES click here now");
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.waitForTimeout(500);
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
    await page.click("text=Add to the backlog >> nth=0");
    await until(() => document.querySelectorAll(".items > li").length === 1);
    await page.click("button >> text=promoted");
    await page.waitForSelector("text=Open TLK-5");
  });
  await step("archive a ticket, then restore it from the Archive", async () => {
    await page.click('.side-row a[href="#/board/TLK"]');
    await page.waitForSelector(".column");
    await page.click("text=Show the recording length");
    await page.waitForSelector("#ticket[open]");
    await page.click("#tk-actions >> text=Archive");
    await page.waitForSelector("#tk-actions >> text=Restore");
    await page.click("#tk-close");
    await page.click('a[href="#/archive"]');
    await page.waitForSelector("td >> text=Show the recording length");
    await page.click("td >> text=Restore");
    await page.waitForSelector("text=Nothing here");
  });
  await step("the Changes screen lists who did what", async () => {
    await page.click('a[href="#/changes"]');
    await page.waitForSelector("text=restored TLK-3");
    await page.waitForSelector("td >> text=Coder");
  });
  await step("revoke the agent; it is cut off", async () => {
    await page.click('a[href="#/connections"]');
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
    await page.click("#menu");
    await page.click('.side-row a[href="#/board/TLK"]');
    await page.waitForSelector(".column");
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    if (wide) {
      const widest = await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 4)
          .map(
            (e) =>
              `${e.tagName}.${e.className}[${e.textContent.slice(0, 20)}] in ${e.parentElement.className} at ${Math.round(e.getBoundingClientRect().left)}-${Math.round(e.getBoundingClientRect().right)}`,
          )
          .join(", "),
      );
      throw new Error(`the page scrolls sideways: ${widest}`);
    }
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
