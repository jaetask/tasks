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
  const up = await fetch(`${base}/health`).then(
    (r) => r.ok,
    () => false,
  );
  if (up) break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
});
page.setDefaultTimeout(8000);
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("dialog", (d) => d.accept("looks like spam"));

const shot = (name) => page.screenshot({ path: `docs/img/${name}.png` });
const count = (selector) => page.locator(selector).count();
const until = (fn, arg) => page.waitForFunction(fn, arg);
const see = (text) => page.getByText(text, { exact: false }).first().waitFor();
const button = (name) => page.getByRole("button", { name, exact: true }).first();
// Chooses an option of a dropdown: open it, then press the option.
const pick = async (selector, option) => {
  await page.locator(selector).click();
  await page.getByRole("option", { name: option, exact: true }).click();
};
const link = (name) => page.getByRole("link", { name, exact: true }).first();
// Opens a page by its address, as a bookmark would.
const open = (path) =>
  page.evaluate((p) => {
    window.location.hash = p;
  }, path);
async function step(name, run) {
  try {
    await run();
    console.log(`ok    ${name}`);
  } catch (error) {
    console.log(`FAIL  ${name}: ${error.message.split("\n").slice(0, 3).join(" | ")}`);
    problems.push(name);
    if (process.env.CHECK_SHOT && !step.shot) {
      step.shot = true;
      await page.screenshot({ path: process.env.CHECK_SHOT });
    }
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
    await page.fill('[aria-label="Setup secret"]', SECRET);
    await button("Sign in").click();
    await see("What is your name?");
  });
  await step("name the owner; the shell opens on the Overview", async () => {
    await page.fill('[aria-label="Your name"]', "Sam");
    await button("Start").click();
    await see("Create your first project");
  });
  await step("create a project on its own edit page", async () => {
    await link("Create a project").click();
    await see("New project");
    await page.fill("#name", "Talk");
    await page.fill("#prefix", "tlk");
    await button("Choose project icon and colour").click();
    await button("globe icon").click();
    await button("Green icon colour").click();
    await page.keyboard.press("Escape");
    await shot("project-icon");
    await button("Create project").click();
    await page.waitForSelector(".lane");
  });
  await step("several projects can be open in the sidebar at once", async () => {
    await open("/settings/projects/new");
    await page.fill("#name", "Money");
    await page.fill("#prefix", "mny");
    await button("Create project").click();
    await see("Each has its own board");
    await open("/p/MNY/board");
    await page.waitForSelector(".lane");
    await open("/p/TLK/board");
    await page.waitForSelector(".lane");
    // Both projects have been visited, so both are open, each with its own screens.
    await until(() => document.querySelectorAll('.tk-side a[href$="/intake"]').length === 2);
    await shot("sidebar");
    await button("Toggle Money project").click();
    await until(() => document.querySelectorAll('.tk-side a[href$="/intake"]').length === 1);
    // Clicking a closed project's name goes to it and opens it.
    await page.getByRole("link", { name: "Money", exact: true }).click();
    await until(() => document.querySelectorAll('.tk-side a[href$="/intake"]').length === 2);
    await until(() => window.location.hash.startsWith("#/p/MNY/board"));
    await open("/p/MNY/edit");
    await button("Archive").click();
    await see("Each has its own board");
  });
  await step("the sidebar opens the project's board with its four columns", async () => {
    await page.getByRole("link", { name: /Talk/ }).first().click();
    await page
      .getByRole("radiogroup", { name: "Board view" })
      .or(page.getByRole("group", { name: "Board view" }))
      .first()
      .waitFor();
    // A board opens grouped by feature; the status view shows the project's columns.
    await page.getByRole("radio", { name: "Status view" }).click();
    await until(() => document.querySelectorAll(".lane").length === 4);
    await page
      .getByRole("link", { name: /Intake/ })
      .first()
      .waitFor();
    await page
      .getByRole("link", { name: /Features/ })
      .first()
      .waitFor();
  });
  await step("settings: add an actor and two labels, each on an edit page", async () => {
    await open("/settings");
    await link("Add actor").click();
    await page.fill("#name", "Coder");
    await page.fill("#icon", "🤖");
    await button("Add actor").click();
    await see("One for each of your agents");
    await page.locator("#actors").getByText("Coder").waitFor();
    await link("New label").click();
    await page.fill("#name", "voice");
    await button("Add label").click();
    await page.locator("#labels").getByText("voice").waitFor();
    await link("New label").click();
    await page.fill("#name", "bug");
    // A label's colour is chosen from swatches, never by name.
    await button("green label colour").click();
    await button("Add label").click();
    await page.locator("#labels").getByText("bug").waitFor();
    await link("New location").click();
    await page.fill("#name", "Studio");
    await button("Add location").click();
    await page.locator("#locations").getByText("Studio").waitFor();
  });
  await shot("settings");
  await step("add two tickets, each on the new ticket page", async () => {
    for (const [i, title] of ["Voice notes on the phone", "Fix the crash on send"].entries()) {
      await open("/p/TLK/board");
      await link("New ticket").click();
      await page.fill("#title", title);
      await button("Create ticket").click();
      await until((n) => document.querySelectorAll(".lane .ticket").length === n, i + 1);
    }
  });
  await step("open a ticket; edit it where it is shown; comment and react", async () => {
    await page.locator(".ticket").getByText("Voice notes on the phone").click();
    await page.getByRole("dialog").waitFor();
    // The description is edited in place and saved on leaving it.
    await page.fill(
      '[aria-label="Description"]',
      "Record a voice note from the phone and attach it to a chat. It should work with the screen locked.",
    );
    await button("Change or add labels").click();
    await page.getByRole("option", { name: "voice", exact: true }).click();
    // The list stays where it opened as the label lands on the ticket and the plus moves along.
    const at = () =>
      page.evaluate(() => {
        const box = document
          .querySelector("[data-radix-popper-content-wrapper]")
          .getBoundingClientRect();
        return [Math.round(box.x), Math.round(box.y)];
      });
    const before = await at();
    await page.locator("#place .pill", { hasText: "voice" }).waitFor();
    const after = await at();
    if (before.join() !== after.join())
      throw new Error(`the labels list moved: ${before} to ${after}`);
    await shot("labels-picker");
    await page.keyboard.press("Escape");
    await see("Record a voice note");
    await open("/t/TLK-1");
    await see("Record a voice note");
    await page.locator("#place").getByText("voice").waitFor();
    await page.fill(
      '[aria-label="Leave a comment"]',
      "Keep the record button big on the lock screen.",
    );
    await page.press('[aria-label="Leave a comment"]', "Control+Enter");
    await page.waitForSelector(".thread .comment");
    await button("Add reaction").click();
    await button("👀").click();
    await page.waitForSelector('.reactions [aria-pressed="true"]');
    // The same emoji again takes it back; a different one is added beside it.
    await button("Add reaction").click();
    await button("🎉").click();
    await until(() => document.querySelectorAll(".reactions [aria-pressed]").length === 2);
  });
  await step("attach an image", async () => {
    await page.setInputFiles('#ticket input[type="file"]', {
      name: "record-button.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
    await page.waitForSelector(".tk-thumb img");
  });
  await step("attach a file and a video: a chip that downloads, a player that plays", async () => {
    await page.setInputFiles('#ticket input[type="file"]', [
      { name: "build.log", mimeType: "text/plain", buffer: Buffer.from("all green\n") },
      { name: "demo.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(2048, 1) },
    ]);
    await page.locator("#files a", { hasText: "build.log" }).waitFor();
    await page.locator("#files video").waitFor();
    // The bytes come back whole, to the signed-in page.
    const got = await page.evaluate(async () => {
      const link = document.querySelector("#files a");
      const response = await fetch(link.getAttribute("href"));
      return [response.status, await response.text(), response.headers.get("content-disposition")];
    });
    if (got[0] !== 200 || got[1] !== "all green\n" || !String(got[2]).startsWith("attachment")) {
      throw new Error(`the file came back as ${JSON.stringify(got)}`);
    }
    await page.locator("#files .file", { hasText: "build.log" }).hover();
    await button("Remove the file build.log").click();
    await until(() => !document.querySelector("#files a"));
  });
  await step(
    "a picture pasted into a comment goes into its text, and shows when read",
    async () => {
      const box = page.locator('[aria-label="Leave a comment"]');
      await box.click();
      await page.keyboard.type("x");
      await page.locator("form.write").last().hover();
      await page.locator("form.write").last().screenshot({ path: "docs/img/comment-box.png" });
      await page.keyboard.press("Backspace");
      await page.evaluate(() => {
        const bytes = Uint8Array.from(
          atob(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
          ),
          (c) => c.charCodeAt(0),
        );
        const data = new DataTransfer();
        data.items.add(new File([bytes], "pasted.png", { type: "image/png" }));
        document
          .querySelector('[aria-label="Leave a comment"]')
          .dispatchEvent(
            new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
          );
      });
      await page.locator('form.write img[src^="/api/files/"]').waitFor();
      await page.keyboard.type(" Here is the screen.");
      await page.keyboard.press("Control+Enter");
      await page.locator('.thread .comment img[src^="/api/files/"]').waitFor();
      // It is part of the comment, so it is not listed again among the ticket's files.
      if (await page.locator("#files a").count())
        throw new Error("the picture is listed as a file");
    },
  );
  await step("record the evidence for the work, then read it back", async () => {
    await page.locator("#evidence").getByRole("button", { name: "Evidence" }).click();
    await page.fill('[aria-label="Result"]', "Voice notes record and send.");
    await page.fill('[aria-label="Verification"]', "Unit tests, and a recording on a phone.");
    await page.fill('[aria-label="Pull request"]', "https://example.com/talk/pull/7");
    await button("Save evidence").click();
    await page
      .locator("#evidence")
      .getByRole("link", { name: /pull\/7/ })
      .waitFor();
    await page.locator("#evidence").getByText("Unit tests, and a recording on a phone.").waitFor();
  });
  await step(
    "mark it blocked in its properties, then undo that from its line in the activity",
    async () => {
      await page.fill('[aria-label="Blocked"]', "waiting on the API key");
      await page.press('[aria-label="Blocked"]', "Enter");
      await see("marked TLK-1 blocked");
      await page.locator("#conversation").getByRole("button", { name: "Undo" }).last().click();
      await until(() => document.querySelector('[aria-label="Blocked"]').value === "");
    },
  );
  await step("give it a location in its properties, and a step", async () => {
    await pick('[data-property="location"]', "Studio");
    await page.locator('[data-property="location"]', { hasText: "Studio" }).waitFor();
    // A due date typed in words.
    await page.locator('[data-property="due"]').click();
    await page.fill('[aria-label="Due date"]', "tomorrow");
    await page
      .getByRole("option", { name: /Tomorrow/ })
      .first()
      .click();
    await page.locator('[data-property="due"]', { hasText: "Tomorrow" }).waitFor();
    await page.fill('[aria-label="New step"]', "Record with the screen locked");
    await page.press('[aria-label="New step"]', "Enter");
    // Clicking a step's words edits them in place.
    await page
      .locator("#steps")
      .getByRole("button", { name: "Record with the screen locked", exact: true })
      .click();
    await page.fill(
      '[aria-label="Rename Record with the screen locked"]',
      "Record with the phone locked",
    );
    await page.keyboard.press("Enter");
    await page.getByRole("checkbox", { name: "Record with the phone locked" }).click();
    await see("Steps · 1 of 1");
  });
  await step("an agent asks to connect; approve it as Coder on an edit page", async () => {
    const asked = await (
      await post("/pair", { host: "Coding agent", effects: ["read", "write"] })
    ).json();
    await open("/connections");
    await page.getByRole("link", { name: /Coding agent/ }).waitFor();
    await shot("connections");
    await page.getByRole("link", { name: /Coding agent/ }).click();
    await see("Approve Coding agent");
    await button("Approve").click();
    await button("Revoke").waitFor();
    key = (await (await post(`/pair/${asked.id}/claim`, { claim: asked.claim })).json()).token;
  });
  await step("the agent's work shows on the board as it happens", async () => {
    await open("/p/TLK/board");
    await page.waitForSelector(".lane");
    await agent("tickets__ticket-claim", { ticket: "TLK-1" });
    await agent("comments__comment-add", {
      ticket: "TLK-1",
      text: "Recording works in the app. Next: recording with the screen locked.",
    });
    await agent("tickets__ticket-create", { project: "TLK", title: "Show the recording length" });
    await agent("tickets__ticket-block", { ticket: "TLK-2", note: "needs a crash report" });
    await until(
      () => document.querySelectorAll(".lane")[1].querySelectorAll(".ticket").length === 1,
    );
    await see("Show the recording length");
    await page.waitForSelector('.ticket[data-blocked="true"]');
  });
  await shot("board");
  await step(
    "the Overview lines up every project's tickets by kind; search narrows it",
    async () => {
      await link("Overview").click();
      await page.getByRole("heading", { name: "Overview" }).waitFor();
      await page.waitForSelector(".lane");
      await until(() => document.querySelectorAll(".lane .ticket").length === 3);
      await page.fill('[aria-label="Search tickets"]', "crash");
      await page.press('[aria-label="Search tickets"]', "Enter");
      await until(() => document.querySelectorAll(".lane .ticket").length === 1);
      await shot("overview");
      await page.fill('[aria-label="Search tickets"]', "");
      await page.press('[aria-label="Search tickets"]', "Enter");
      await until(() => document.querySelectorAll(".lane .ticket").length === 3);
    },
  );
  await step("the ticket shows the agent's comment and its changes; reply to it", async () => {
    await open("/t/TLK-1");
    await see("Coder claimed TLK-1 and moved it to Doing");
    const thread = page.locator(".thread", { hasText: "Recording works in the app" });
    await thread
      .locator('[aria-label="Leave a reply"]')
      .fill("Good. Ask for review when the lock screen works.");
    await thread.locator('[aria-label="Leave a reply"]').press("Control+Enter");
    await thread.locator(".comment").nth(1).waitFor();
    // "/h1" then Return picks Heading 1; it does not send "/h1" as a reply.
    await thread.locator('[aria-label="Leave a reply"]').click();
    // A reply row is one line beside an avatar: the editor's handle is not drawn there.
    await page.keyboard.type("x");
    await thread.locator("form.write").hover();
    const handle = await thread.locator("form.write").evaluate((form) => {
      const found = form.querySelector(".drag-handle");
      return found ? [getComputedStyle(found).display, found.getAttribute("style")] : null;
    });
    if (handle && handle[0] !== "none")
      throw new Error(`the handle shows in a reply row: ${handle}`);
    await page.keyboard.press("Backspace");
    await page.keyboard.type("/h1");
    await page.locator(".an-rich-md-slash-menu", { hasText: "Heading 1" }).waitFor();
    await page.keyboard.press("Enter");
    await thread.locator('[aria-label="Leave a reply"] h1').waitFor();
    if ((await thread.locator(".comment").count()) !== 2)
      throw new Error("/h1 was sent as a reply");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("/nosuchblock");
    await page.keyboard.press("Enter");
    if ((await thread.locator(".comment").count()) !== 2) throw new Error("a slash word was sent");
    for (let i = 0; i < 14; i += 1) await page.keyboard.press("Backspace");
    // Return sends; Shift+Return starts a new line in the same reply.
    await thread.locator('[aria-label="Leave a reply"]').click();
    await page.keyboard.type("And tell me which phones you tried.");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("One line each.");
    await page.keyboard.press("Enter");
    await thread.locator(".comment").nth(2).getByText("One line each.").waitFor();
    if ((await thread.locator(".comment").count()) !== 3) throw new Error("Shift+Return sent");
    await thread.scrollIntoViewIfNeeded();
    await thread.screenshot({ path: "docs/img/thread.png" });
    // Resolving a thread folds it to one line; Show opens it again.
    await thread.getByRole("button", { name: "Comment actions" }).first().click();
    await page.getByRole("menuitem", { name: "Resolve thread" }).click();
    await see("Resolved · Coder");
    await page
      .locator(".thread", { hasText: "Resolved · Coder" })
      .getByRole("button", { name: "Show" })
      .press("Enter");
    await page.getByRole("button", { name: "Comment actions" }).first().waitFor();
  });
  await page.evaluate(() => {
    document.querySelector(".tk-main")?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  });
  await shot("ticket");
  await step(
    "human input: an agent asks on a ticket; the owner answers from the list",
    async () => {
      await agent("input__input-request", {
        ticket: "TLK-1",
        question: "Should recordings be kept after they are sent?",
        context: "Keeping them uses about 1 MB a minute.",
      });
      await see("awaiting your answer");
      await page
        .getByRole("link", { name: /Human input/ })
        .first()
        .click();
      await see("Coder asks");
      await shot("human-input");
      await page.fill('[aria-label="Your answer"]', "Keep them for 30 days.");
      await page.press('[aria-label="Your answer"]', "Enter");
      await see("No agent is waiting for you");
      await page.getByRole("tab", { name: "Resolved" }).click();
      await see("You answered: Keep them for 30 days.");
    },
  );
  await step("agent inbox: the owner's replies and answer wait there for the agent", async () => {
    await link("Agent inbox").click();
    await see("Sam answered Coder");
    await see("Sam replied to Coder");
    await shot("agent-inbox");
    const before = await count("#replies .tk-list-row");
    await button("Acknowledge").click();
    await until((n) => document.querySelectorAll("#replies .tk-list-row").length === n - 1, before);
    await page.getByRole("tab", { name: "Acknowledged" }).click();
    await until(() => document.querySelectorAll("#replies .tk-list-row").length === 1);
  });
  await step("features: add one, put a ticket in it, and narrow the board to it", async () => {
    await open("/p/TLK/features");
    await see("No features yet");
    await link("New feature").click();
    await page.fill("#name", "Voice");
    await button("Add feature").click();
    await see("0 open");
    await open("/t/TLK-1");
    await page.locator('[data-property="feature"]').click();
    await page.getByRole("option", { name: "Voice", exact: true }).click();
    await page.locator('[data-property="feature"]', { hasText: "Voice" }).waitFor();
    await open("/p/TLK/board");
    await page.getByRole("button", { name: /More filters/ }).click();
    await pick('[aria-label="Filter feature"]', "Voice");
    await until(() => document.querySelectorAll(".lane .ticket").length === 1);
    await pick('[aria-label="Filter feature"]', "All features");
    await until(() => document.querySelectorAll(".lane .ticket").length === 3);
  });
  await step("the board groups its tickets by feature, by actor and by location", async () => {
    await page.getByRole("radio", { name: "Features view" }).click();
    await page.locator(".lane", { hasText: "Voice" }).locator(".ticket").waitFor();
    await page.locator(".lane", { hasText: "No feature" }).waitFor();
    await page.getByRole("radio", { name: "Actors view" }).click();
    await page.locator(".lane", { hasText: "Coder" }).waitFor();
    await page.locator(".lane", { hasText: "Unassigned" }).waitFor();
    await page.getByRole("radio", { name: "Locations view" }).click();
    await page.locator(".lane", { hasText: "Studio" }).locator(".ticket").waitFor();
    await page.getByLabel("Hide empty columns").click();
    await until(() => document.querySelectorAll(".lane-empty").length === 0);
    await page.getByLabel("Hide empty columns").click();
  });
  await shot("board-locations");
  await step("a card shows what Display says, and a property on it opens its picker", async () => {
    await button("Display").click();
    await page.getByRole("button", { name: "Labels", exact: true }).click();
    await page.keyboard.press("Escape");
    const card = page.locator(".ticket", { hasText: "Voice notes on the phone" });
    await card.getByText("voice", { exact: true }).waitFor();
    // Changing the priority on the card does not open the ticket.
    await card.getByRole("button", { name: "Priority" }).click();
    await page.getByRole("option", { name: "High", exact: true }).click();
    await card.getByText("High").waitFor();
    if (await page.evaluate(() => window.location.hash.includes("ticket="))) {
      throw new Error("the ticket opened");
    }
    await button("Display").click();
    await button("Reset").click();
    await page.keyboard.press("Escape");
    await until(
      () => ![...document.querySelectorAll(".ticket")].some((t) => t.textContent.includes("voice")),
    );
  });
  await shot("board-display");
  await step("Display orders the cards of a column, and a column has a menu", async () => {
    await page.getByRole("radio", { name: "Status view" }).click();
    await page.locator(".lane", { hasText: "To do" }).waitFor();
    await page.mouse.move(0, 0);
    // Opened from the keyboard: the dropdown sits in a popover.
    const choose = async (name) => {
      await page.locator('[aria-label="Ordering"]').press("Enter");
      await page.getByRole("option", { name, exact: true }).press("Enter");
    };
    const chosen = (name) =>
      page.waitForFunction(
        (n) => document.querySelector('[aria-label="Ordering"]')?.textContent?.includes(n),
        name,
      );
    await button("Display").click();
    await choose("Priority");
    await page.keyboard.press("Escape");
    await button("Display").click();
    await chosen("Priority");
    await choose("Created");
    await chosen("Created");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Column To do" }).click();
    await page.getByRole("menuitem", { name: "Move right" }).waitFor();
    await page.getByRole("menuitem", { name: "Archive all" }).waitFor();
    await page.keyboard.press("Escape");
  });
  await step("the Overview groups by project, and a project can be filtered out", async () => {
    await open("/");
    await page.getByRole("heading", { name: "Overview" }).waitFor();
    await page.getByRole("radio", { name: "Projects view" }).click();
    await page.locator(".lane", { hasText: "Talk" }).waitFor();
    const lanes = await page.locator(".lane").count();
    await button("Filter projects").click();
    await page.getByRole("menuitemcheckbox", { name: "Talk" }).press("Enter");
    await page.keyboard.press("Escape");
    await until(() => document.querySelectorAll(".lane").length === 1);
    await button("Filter projects").click();
    await page.getByRole("menuitemcheckbox", { name: "Talk" }).press("Enter");
    await page.keyboard.press("Escape");
    await page.waitForFunction((n) => document.querySelectorAll(".lane").length === n, lanes);
    await page.getByRole("radio", { name: "Status view" }).click();
    await page.locator(".lane", { hasText: "to do" }).waitFor();
  });
  await step("on the Overview a card names its project, as a pill to its board", async () => {
    await open("/");
    await page.getByRole("link", { name: "The board of Talk" }).first().click();
    await page.locator(".lane", { hasText: "To do" }).waitFor();
    await page.waitForFunction(() => window.location.hash.includes("/p/TLK/board"));
    // A project's own board does not repeat the project on its cards.
    await until(() => !document.querySelector('.ticket a[aria-label="The board of Talk"]'));
  });
  await step("a right click on a card opens its menu: blocked and due date", async () => {
    const card = page.locator(".ticket", { hasText: "Show the recording length" });
    // Enter in the box submits what was typed, every time: BLOCK_RUNS repeats it.
    for (let run = 0; run < Number(process.env.BLOCK_RUNS ?? 1); run += 1) {
      await card.click({ button: "right" });
      await page.getByRole("menuitem", { name: "Mark as" }).press("ArrowRight");
      await page.getByRole("menuitem", { name: "Blocked..." }).press("Enter");
      await page.getByRole("textbox", { name: "Mark as blocked" }).fill("Waiting on the codec");
      await page.keyboard.press("Enter");
      await card.getByText("Blocked").waitFor();
      await card.click({ button: "right" });
      await page.getByRole("menuitem", { name: "Mark as" }).press("ArrowRight");
      await page.getByRole("menuitem", { name: "Not blocked" }).press("Enter");
      await until(
        () =>
          ![...document.querySelectorAll(".ticket")]
            .find((t) => t.textContent.includes("Show the recording length"))
            ?.textContent.includes("Blocked"),
      );
    }
    if (await page.evaluate(() => window.location.hash.includes("ticket="))) {
      throw new Error("the ticket opened");
    }
    await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Add link..." }).press("Enter");
    await page.getByRole("heading", { name: "Add link to TLK-3" }).waitFor();
    await page.fill("#link-url", "https://www.youtube.com/watch?v=abc");
    await page.getByText("YouTube URL").waitFor();
    await page.fill("#link-title", "Check this out");
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "Add link to TLK-3" }).waitFor({ state: "detached" });
    // The ticket lists it under Resources, by its title.
    await card.click();
    await page.locator("#links .resource", { hasText: "Check this out" }).waitFor();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !window.location.hash.includes("ticket="));
    await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Make a copy" }).waitFor();
    await page.getByRole("menuitem", { name: "Due date", exact: true }).press("ArrowRight");
    await page.getByRole("menuitem", { name: "Tomorrow" }).press("Enter");
    await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Due date", exact: true }).press("ArrowRight");
    await page.getByRole("menuitem", { name: "Remove due date" }).press("Enter");
  });
  await step("back to the status view", async () => {
    await page.getByRole("radio", { name: "Status view" }).click();
    await page.locator(".lane", { hasText: "To do" }).waitFor();
  });
  await step("backlog: a new ticket waits there, then goes to the board", async () => {
    await page
      .getByRole("link", { name: /Backlog/ })
      .first()
      .click();
    await see("The backlog is empty");
    await link("New ticket").click();
    await page.fill("#title", "Trim silence from recordings");
    await button("Create ticket").click();
    await page.waitForSelector(".ticket");
    await open("/p/TLK/board");
    await until(() => document.querySelectorAll(".lane .ticket").length === 3);
    await open("/p/TLK/backlog");
    await button("To the board").click();
    await see("The backlog is empty");
    await open("/p/TLK/board");
    await until(() => document.querySelectorAll(".lane .ticket").length === 4);
  });
  await step("drag a ticket to another column", async () => {
    // By hand, in small moves, as a person drags.
    const from = await page
      .locator(".ticket", { hasText: "Show the recording length" })
      .boundingBox();
    const to = await page.locator(".lane").nth(3).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2 + 10, {
      steps: 5,
    });
    await page.mouse.move(to.x + 40, to.y + 60, { steps: 15 });
    await page.mouse.up();
    await until(
      () => document.querySelectorAll(".lane")[3].querySelectorAll(".ticket").length === 1,
    );
  });
  await step("edit the columns on their own page: rename, add, move, remove", async () => {
    await link("Edit columns").click();
    await see("Edit the columns of Talk");
    // True when the column name at `index` is `name`, and there are `length` columns.
    const columns = ([index, name, length]) => {
      const names = [...document.querySelectorAll('[aria-label="Column name"]')].map(
        (input) => input.value,
      );
      return names[index] === name && names.length === length;
    };
    await page.fill('[aria-label="Column name"] >> nth=2', "Code review");
    await page.press('[aria-label="Column name"] >> nth=2', "Tab");
    await see("Code review");
    await page.fill('[aria-label="New column name"]', "Sign-off");
    await button("Add column").click();
    await until(columns, [4, "Sign-off", 5]);
    await page.click('[aria-label="Move column left"] >> nth=4');
    await until(columns, [3, "Sign-off", 5]);
    await shot("columns");
    await page.getByRole("button", { name: "Remove" }).nth(3).click();
    await until(columns, [3, "Done", 4]);
    await page.locator(".tk-edit-bar").getByRole("link").first().click();
    await page.waitForSelector(".lane");
    await see("Code review");
  });
  await step("intake: capture an item; with no steps it lands as received", async () => {
    await page
      .getByRole("link", { name: /Intake/ })
      .first()
      .click();
    await see("No steps yet");
    await page.fill(
      '[aria-label="A new idea or request"]',
      "Need export to CSV for the Money app pls!!",
    );
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.waitForSelector(".item");
  });
  await step("intake: add a spam check step on its edit page; spam is rejected", async () => {
    await link("Add a step").click();
    await page.fill("#name", "Spam check");
    await page.fill("#setting-file", "spam-check.mjs");
    await page.getByRole("button", { name: "reject", exact: true }).click();
    await button("Add step").click();
    await see("1. Spam check");
    await page.fill('[aria-label="A new idea or request"]', "CHEAP WATCHES click here now");
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.fill(
      '[aria-label="A new idea or request"]',
      "the board crashes when I drag a ticket",
    );
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.locator(".item .pill", { hasText: "bug" }).waitFor();
    if ((await count(".item")) !== 2) throw new Error("the spam is in the inbox");
    await page.locator(".item").nth(1).getByRole("button", { name: "What the steps did" }).click();
    await see("not spam; a bug");
    await shot("inbox");
    await page.getByRole("tab", { name: "Rejected" }).click();
    await see("Reason: looks like spam");
  });
  await step("intake: turn an item into a ticket in the backlog", async () => {
    await page.getByRole("tab", { name: "Received" }).click();
    await page.waitForSelector(".item");
    await button("Add to the backlog").click();
    await until(() => document.querySelectorAll(".item").length === 1);
    await page.getByRole("tab", { name: "Promoted" }).click();
    await link("Open TLK-5").waitFor();
  });
  await step("archive a ticket from its Actions, then restore it from the Archive", async () => {
    await open("/t/TLK-3");
    await button("Actions").click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await page.locator("#place").getByText("archived").waitFor();
    await link("Archive").click();
    await see("Show the recording length");
    await button("Restore").click();
    await see("Nothing here.");
  });
  await step("the Changes screen lists who did what", async () => {
    await link("Changes").click();
    await see("restored TLK-3");
    await page.locator("#changes b", { hasText: "Coder" }).first().waitFor();
  });
  await step("revoke the agent; it is cut off", async () => {
    await page
      .getByRole("link", { name: /^Connections/ })
      .first()
      .click();
    await button("Revoke").click();
    await page.locator(".pill", { hasText: "revoked" }).waitFor();
    const cut = await agent("tickets__work-find", {}).then(
      () => false,
      () => true,
    );
    if (!cut) throw new Error("the agent can still call");
  });
  await step("at phone width the page does not scroll sideways", async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open("/p/TLK/board");
    await page.waitForSelector(".lane");
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
