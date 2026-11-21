#!/usr/bin/env node
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const PORT = process.env.CHECK_PORT ?? "18083";
const SECRET = "check-page-secret";
const base = `http://127.0.0.1:${PORT}`;
const data = mkdtempSync(join(tmpdir(), "tasks-page-"));
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
const pick = async (selector, option) => {
  await page.locator(selector).click();
  await page.getByRole("option", { name: option, exact: true }).click();
};
const link = (name) => page.getByRole("link", { name, exact: true }).first();
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
    await see("Create a project");
  });
  await step("create the first project in a dialog", async () => {
    await button("Create a project").click();
    await see("New project");
    await page.fill("#project-name", "Talk");
    if ((await page.inputValue("#project-prefix")) !== "TALK") {
      throw new Error("no prefix was suggested from the name");
    }
    await page.fill("#project-prefix", "tlk");
    await button("Choose project icon and colour").click();
    await button("globe icon").click();
    await button("Green icon colour").click();
    await page.keyboard.press("Escape");
    await shot("project-icon");
    await button("Create project").click();
    await page.waitForSelector(".lane");
  });
  await step("several projects can be open in the sidebar at once", async () => {
    await open("/settings/projects");
    await button("New project").click();
    await page.fill("#project-name", "Money");
    await page.fill("#project-prefix", "mny");
    await button("Create project").click();
    await page.waitForSelector(".lane");
    await open("/p/TLK/board");
    await page.waitForSelector(".lane");
    await until(() => document.querySelectorAll('.tk-side a[href$="/intake"]').length === 2);
    await shot("sidebar");
    await button("Toggle Money project").click();
    await until(() => document.querySelectorAll('.tk-side a[href$="/intake"]').length === 1);
    await page.getByRole("link", { name: "Money", exact: true }).click();
    await until(() => document.querySelectorAll('.tk-side a[href$="/intake"]').length === 2);
    await until(() => window.location.hash.startsWith("#/p/MNY/board"));
  });
  await step(
    "settings has its own sidebar; a project is archived from its row's menu",
    async () => {
      await page.getByRole("link", { name: "Settings", exact: true }).click();
      await link("Back to Tasks").waitFor();
      await link("Projects").click();
      await button("Project Money").click();
      await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
      await until(() => !document.querySelector(".tk-list")?.textContent.includes("Money"));
      await page.getByRole("checkbox", { name: "Show archived" }).click();
      await page.locator(".tk-list").getByText("Archived").waitFor();
      await link("Back to Tasks").click();
    },
  );
  await step("the sidebar opens the project's board with its four columns", async () => {
    await page.getByRole("link", { name: /Talk/ }).first().click();
    await page
      .getByRole("radiogroup", { name: "Board view" })
      .or(page.getByRole("group", { name: "Board view" }))
      .first()
      .waitFor();
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
  await step("settings: add an actor, labels and a location, each in a dialog", async () => {
    await open("/settings/actors");
    await button("New actor").click();
    await page.fill("#actor-name", "Coder");
    await button("Choose project icon and colour").click();
    await button("robot icon").click();
    await page.keyboard.press("Escape");
    await button("Add actor").click();
    await page.locator(".tk-list").getByText("Coder").waitFor();
    await page.locator('.tk-list [aria-label="Icon and colour of Coder"] svg').waitFor();
    await open("/settings/labels");
    await button("New label").click();
    await page.fill("#label-name", "voices");
    await button("Add label").click();
    await page.locator(".tk-list").getByText("voices").waitFor();
    await button("New label").click();
    await page.fill("#label-name", "bug");
    await button("green label colour").click();
    await button("Add label").click();
    await page.locator(".tk-list").getByText("bug").waitFor();
    await open("/settings/locations");
    await button("New location").click();
    await page.fill("#location-name", "Studio");
    await button("Add location").click();
    await page.locator(".tk-list").getByText("Studio").waitFor();
  });
  await step(
    "settings: a name is changed where it is shown; a label is removed from its menu",
    async () => {
      await open("/settings/labels");
      await page.locator(".tk-list").getByRole("button", { name: "voices", exact: true }).click();
      await page.fill('[aria-label="Rename voices"]', "voice");
      await page.keyboard.press("Enter");
      await page.locator(".tk-list").getByRole("button", { name: "voice", exact: true }).waitFor();
      await page.locator(".tk-list").getByRole("button", { name: "voice", exact: true }).click();
      await page.fill('[aria-label="Rename voice"]', "something else");
      await page.keyboard.press("Escape");
      await page.locator(".tk-list").getByRole("button", { name: "voice", exact: true }).waitFor();
      await button("New label").click();
      await page.fill("#label-name", "spare");
      await button("Add label").click();
      await button("Label spare").click();
      await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
      await until(() => !document.querySelector(".tk-list")?.textContent.includes("spare"));
      await button("Label bug").click();
      await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
      await page.locator('[aria-label="Rename bug"]').waitFor();
      await page.keyboard.press("Escape");
      await open("/settings/actors");
    },
  );
  await shot("settings");
  await step("add two tickets in the New ticket dialog: the button, then the C key", async () => {
    await open("/p/TLK/board");
    await link("New ticket").click();
    await page.fill('[aria-label="Title"]', "Voice notes on the phone");
    await button("Create ticket").click();
    await until(() => document.querySelectorAll(".lane .ticket").length === 1);
    await until(() => !document.querySelector('[role="dialog"]'));
    await page.keyboard.press("c");
    await page.fill('[aria-label="Title"]', "Fix the crash on send");
    await button("Priority").click();
    await page.getByRole("option", { name: /^High/ }).click();
    await button("Labels").click();
    await page.getByRole("option", { name: /^bug/ }).click();
    await page.keyboard.press("Escape");
    await page.locator('[aria-label="Title"]').press("ControlOrMeta+Enter");
    await until(() => document.querySelectorAll(".lane .ticket").length === 2);
    await open("/t/TLK-2");
    await page.locator('[data-property="priority"]', { hasText: "High" }).waitFor();
    await page.locator("#place .pill", { hasText: "bug" }).waitFor();
    await page.locator('[data-property="priority"]').click();
    await page.getByRole("option", { name: /^No priority/ }).click();
    await page.locator('[aria-label="Change or add labels"]').click();
    await page.getByRole("option", { name: /^bug/ }).click();
    await page.keyboard.press("Escape");
    await until(() => !document.querySelector("#place .pill"));
    await open("/p/TLK/board");
  });
  await step("open a ticket; edit it where it is shown; comment and react", async () => {
    await page.locator(".ticket").getByText("Voice notes on the phone").click();
    await page.getByRole("dialog").waitFor();
    await page.fill(
      '[aria-label="Description"]',
      "Record a voice note from the phone and attach it to a chat. It should work with the screen locked.",
    );
    await button("Change or add labels").click();
    await page.getByRole("option", { name: "voice", exact: true }).click();
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
    await page.getByText("Removed the file build.log", { exact: false }).first().waitFor();
    await page.getByRole("button", { name: "Undo", exact: true }).last().click();
    await page.locator("#files .file", { hasText: "build.log" }).waitFor();
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
    "mark it blocked from its menu, then undo that from its line in the activity",
    async () => {
      if ((await count('[data-property="blocked"]')) !== 0) throw new Error("a blocked row shows");
      await button("Ticket TLK-1").click();
      await page.getByRole("menuitem", { name: "Mark as" }).click();
      await page.getByRole("menuitem", { name: "Blocked..." }).click();
      await page.fill('[aria-label="Mark as blocked"]', "waiting on the API key");
      await page.keyboard.press("Enter");
      await page
        .locator('[data-property="blocked"]', { hasText: "waiting on the API key" })
        .waitFor();
      await see("marked this ticket blocked");
      await page.locator("#conversation").getByRole("button", { name: "Undo" }).last().click();
      await until(() => !document.querySelector('[data-property="blocked"]'));
    },
  );
  await step("give it a location in its properties, and a step", async () => {
    await pick('[data-property="location"]', "Studio");
    await page.locator('[data-property="location"]', { hasText: "Studio" }).waitFor();
    await page.locator('[data-property="due"]').click();
    await page.fill('[aria-label="Due date"]', "tomorrow");
    await page
      .getByRole("option", { name: /Tomorrow/ })
      .first()
      .click();
    await page.locator('[data-property="due"]', { hasText: "Tomorrow" }).waitFor();
    await page.fill('[aria-label="New step"]', "Record with the screen locked");
    await page.press('[aria-label="New step"]', "Enter");
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
    await page.locator("#steps", { hasText: "1 of 1" }).waitFor();
  });
  await step("an agent asks to connect; approve it as Coder in a dialog", async () => {
    const asked = await (
      await post("/pair", { host: "Coding agent", effects: ["read", "write"] })
    ).json();
    await open("/connections");
    await page.locator(".tk-list-row", { hasText: "Coding agent" }).waitFor();
    await shot("connections");
    await button("Approve").click();
    await see("Approve Coding agent");
    await page.getByRole("dialog").getByRole("button", { name: "Approve", exact: true }).click();
    await button("Connection Coding agent").waitFor();
    await button("How an agent connects").click();
    await see("/pair");
    await button("Copy then calls").waitFor();
    await page.keyboard.press("Escape");
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
    await see("Coder claimed this ticket and moved it to Doing");
    const thread = page.locator(".thread", { hasText: "Recording works in the app" });
    await thread
      .locator('[aria-label="Leave a reply"]')
      .fill("Good. Ask for review when the lock screen works.");
    await thread.locator('[aria-label="Leave a reply"]').press("Control+Enter");
    await thread.locator(".comment").nth(1).waitFor();
    await thread.locator('[aria-label="Leave a reply"]').click();
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
    await thread.locator('[aria-label="Leave a reply"]').click();
    await page.keyboard.type("And tell me which phones you tried.");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("One line each.");
    await page.keyboard.press("Enter");
    await thread.locator(".comment").nth(2).getByText("One line each.").waitFor();
    if ((await thread.locator(".comment").count()) !== 3) throw new Error("Shift+Return sent");
    await thread.scrollIntoViewIfNeeded();
    await thread.screenshot({ path: "docs/img/thread.png" });
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
    const before = await count(".tk-list-row");
    await button("Acknowledge").click();
    await until((n) => document.querySelectorAll(".tk-list-row").length === n - 1, before);
    await page.getByRole("tab", { name: "Acknowledged" }).click();
    await until(() => document.querySelectorAll(".tk-list-row").length === 1);
  });
  await step("features: add one, put a ticket in it, and narrow the board to it", async () => {
    await open("/p/TLK/features");
    await see("No features yet");
    await button("New feature").click();
    await page.fill("#feature-name", "Voice");
    await button("Add feature").click();
    await until(() => /#\/p\/TLK\/features\/f\d+/.test(window.location.hash));
    await see("No open ticket is in this feature");
    await page.getByRole("button", { name: "Voice", exact: true }).click();
    await page.fill('[aria-label="Rename Voice"]', "Voices");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Voices", exact: true }).click();
    await page.fill('[aria-label="Rename Voices"]', "Voice");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Voice", exact: true }).waitFor();
    await open("/p/TLK/features/f999");
    await see("No feature of Talk has the id f999");
    await open("/p/TLK/features");
    await see("0 open · 0 done");
    await button("Make Voice a favourite").click();
    await button("Remove Voice from favourites").waitFor();
    await open("/t/TLK-1");
    await page.locator('[data-property="feature"]').click();
    await page.getByRole("option", { name: "Voice", exact: true }).click();
    await page.locator('[data-property="feature"]', { hasText: "Voice" }).waitFor();
    await open("/p/TLK/board");
    await button("Filter").click();
    await page.getByRole("menuitem", { name: "Feature" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Voice" }).click();
    await until(() => document.querySelectorAll(".lane .ticket").length === 1);
    await page.locator('[data-filter="feature"]', { hasText: "Voice" }).waitFor();
    await button("Remove the feature filter").click();
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
    await card.hover();
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
    await button("Filter").click();
    await page.getByRole("menuitem", { name: "Project" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Talk" }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await until(() => document.querySelectorAll(".lane").length === 1);
    await button("Remove the project filter").click();
    await page.waitForFunction((n) => document.querySelectorAll(".lane").length === n, lanes);
    await page.getByRole("radio", { name: "Status view" }).click();
    await page.locator(".lane", { hasText: "To do" }).waitFor();
    await page.locator(".lane", { hasText: "Review" }).waitFor();
    if ((await page.locator(".lane", { hasText: "Done" }).count()) !== 0) {
      throw new Error("the done lane shows on the Overview");
    }
  });
  await step("on the Overview a card names its project, as a pill to its board", async () => {
    await open("/");
    await page.getByRole("link", { name: "The board of Talk" }).first().click();
    await page.locator(".lane", { hasText: "To do" }).waitFor();
    await page.waitForFunction(() => window.location.hash.includes("/p/TLK/board"));
    await until(() => !document.querySelector('.ticket a[aria-label="The board of Talk"]'));
  });
  await step("a right click on a card opens its menu: blocked and due date", async () => {
    const card = page.locator(".ticket", { hasText: "Show the recording length" });
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
    await page.getByRole("button", { name: "Status", exact: true }).getByText("Backlog").waitFor();
    await page.fill('[aria-label="Title"]', "Trim silence from recordings");
    await button("Create ticket").click();
    await page.waitForSelector(".ticket-line");
    await open("/p/TLK/board");
    await until(() => document.querySelectorAll(".lane .ticket").length === 3);
    await open("/p/TLK/backlog");
    await page.locator(".ticket-line").click({ button: "right" });
    await page.getByRole("menuitem", { name: "Put on the board" }).click();
    await see("The backlog is empty");
    await open("/p/TLK/board");
    await until(() => document.querySelectorAll(".lane .ticket").length === 4);
  });
  await step(
    "Display switches a page between a list and a board, and the page remembers",
    async () => {
      await open("/p/TLK/board");
      await page.waitForSelector(".lane");
      await button("Display").click();
      await page.getByRole("radio", { name: "List" }).click();
      await page.keyboard.press("Escape");
      await page.waitForSelector(".tk-group-list .ticket-line");
      if ((await count(".lane")) !== 0) throw new Error("the lanes still show in the list");
      await page.reload();
      await page.waitForSelector(".tk-group-list .ticket-line");
      await button("Display").click();
      await page.getByRole("radio", { name: "Board" }).click();
      await page.keyboard.press("Escape");
      await page.waitForSelector(".lane .ticket");
      await open("/p/TLK/intake");
      await button("Display").click();
      await page.getByRole("radio", { name: "Board" }).click();
      await page.keyboard.press("Escape");
      await until(() => document.querySelectorAll(".lane").length === 6);
      await button("Display").click();
      await page.getByRole("radio", { name: "List" }).click();
      await page.keyboard.press("Escape");
      await page.getByRole("tab", { name: /^Received/ }).waitFor();
      await open("/p/TLK/board");
      await page.waitForSelector(".lane");
    },
  );
  await step("in a ticket's dialog the editor's toolbar opens at the words selected", async () => {
    await open("/p/TLK/board?ticket=TLK-1");
    const words = page.locator(".description p").first();
    await words.waitFor();
    await words.dblclick();
    await page.waitForSelector(".an-rich-md-bubble-toolbar");
    const gap = await page.evaluate(() => {
      const at = window.getSelection().getRangeAt(0).getBoundingClientRect();
      const bar = document.querySelector(".an-rich-md-bubble-toolbar").getBoundingClientRect();
      return {
        up: Math.round(at.top - bar.bottom),
        across: Math.round(Math.abs(at.left + at.width / 2 - (bar.left + bar.width / 2))),
      };
    });
    if (gap.up < 0 || gap.up > 24 || gap.across > 24) {
      throw new Error(`the toolbar is ${gap.up}px above and ${gap.across}px across from the words`);
    }
    await page.keyboard.press("Escape");
    await open("/p/TLK/board");
    await page.waitForSelector(".lane");
  });
  await step("drag a ticket to another column", async () => {
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
  await step("edit the columns on the board: rename, add, move, remove", async () => {
    await open("/p/TLK/board");
    await page.waitForSelector(".lane");
    const columns = (wanted) =>
      [...document.querySelectorAll(".lane h2")]
        .map((h) => (h.querySelector("button")?.textContent ?? "").trim())
        .join("|") === wanted;
    await until(columns, "To do|Doing|Review|Done");
    await page.locator(".lane h2").getByRole("button", { name: "Review", exact: true }).click();
    await page.fill('[aria-label="Rename the column Review"]', "Code review");
    await page.keyboard.press("Enter");
    await until(columns, "To do|Doing|Code review|Done");
    await button("Add a column").click();
    await page.fill("#column-name", "Sign-off");
    await button("Add column").click();
    await until(columns, "To do|Doing|Code review|Done|Sign-off");
    await button("Column Sign-off").click();
    await page.getByRole("menuitem", { name: "Move left", exact: true }).click();
    await until(columns, "To do|Doing|Code review|Sign-off|Done");
    await shot("columns");
    await button("Column Sign-off").click();
    await page.getByRole("menuitem", { name: "Remove column", exact: true }).click();
    await until(columns, "To do|Doing|Code review|Done");
  });
  await step("intake: capture an item; with no steps it lands as received", async () => {
    await page
      .getByRole("link", { name: /Intake/ })
      .first()
      .click();
    await see("No steps look at new items");
    await page.fill(
      '[aria-label="A new idea or request"]',
      "Need export to CSV for the Money app pls!!",
    );
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.waitForSelector(".item");
  });
  await step("intake: add a spam check step in Settings; spam is rejected", async () => {
    await link("Intake steps").click();
    await button("New step").click();
    await page.fill("#step-name", "Spam check");
    await page.fill("#setting-file", "spam-check.mjs");
    await page.getByRole("button", { name: "Reject it", exact: true }).click();
    await button("Add step").click();
    await page.locator(".tk-list").getByText("Spam check").waitFor();
    await open("/p/TLK/intake");
    await see("1 step looks at each new item");
    await page.fill('[aria-label="A new idea or request"]', "CHEAP WATCHES click here now");
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.fill(
      '[aria-label="A new idea or request"]',
      "the board crashes when I drag a ticket",
    );
    await page.press('[aria-label="A new idea or request"]', "Enter");
    await page.locator(".item .pill", { hasText: "bug" }).waitFor();
    if ((await count(".item")) !== 2) throw new Error("the spam is in the inbox");
    await shot("inbox");
    await page.locator(".item").nth(1).getByRole("button").click();
    await button("What the steps did").click();
    await see("not spam; a bug");
    await page.fill('[aria-label="Add a tag"]', "board");
    await page.press('[aria-label="Add a tag"]', "Enter");
    await page.getByRole("dialog").locator(".pill", { hasText: "board" }).waitFor();
    await page.fill('[aria-label="Item title"]', "The board crashes on drag");
    await page.press('[aria-label="Item title"]', "Enter");
    await page.keyboard.press("Escape");
    await page.locator(".item", { hasText: "The board crashes on drag" }).waitFor();
    await page.getByRole("tab", { name: "Rejected 1" }).click();
    await page.locator(".item").first().getByRole("button").click();
    await see("Reason: looks like spam");
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await until(() => !document.querySelector('[role="dialog"]'));
    if ((await page.getByRole("tab", { name: /Dismissed/ }).count()) !== 0) {
      throw new Error("a state with no items is shown");
    }
  });
  await step("intake: turn an item into a ticket in the backlog", async () => {
    await page.getByRole("tab", { name: /^Received/ }).click();
    await page.waitForSelector(".item");
    await page.locator(".item").first().getByRole("button").click();
    await button("Turn into a ticket").click();
    await until(() => document.querySelectorAll(".item").length === 1);
    await page.getByRole("tab", { name: /^Promoted/ }).click();
    await page.locator(".item", { hasText: "TLK-5" }).waitFor();
  });
  await step("archive a ticket from its menu, then restore it from the Archive", async () => {
    await open("/t/TLK-3");
    await button("Ticket TLK-3").click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await page.locator("#place").getByText("archived").waitFor();
    await link("Archive").click();
    await see("Show the recording length");
    await page.fill('[aria-label="Search the archive"]', "nothing like this");
    await see("Nothing here.");
    await page.fill('[aria-label="Search the archive"]', "recording");
    await page.getByRole("checkbox", { name: "Tick TLK-3" }).click();
    await see("1 ticket ticked");
    await button("Restore").click();
    await see("Nothing here.");
  });
  await step("the Changes screen lists who did what", async () => {
    await link("Changes").click();
    await see("restored TLK-3");
    await page.locator("#changes b", { hasText: "Coder" }).first().waitFor();
    await page.getByRole("heading", { name: "Today" }).waitFor();
    await pick('[aria-label="Actor"]', "Coder");
    await until(() =>
      [...document.querySelectorAll("#changes b")].every((b) => b.textContent === "Coder"),
    );
    await pick('[aria-label="Actor"]', "Everyone");
  });
  await step("revoke the agent; it is cut off", async () => {
    await page
      .getByRole("link", { name: /^Connections/ })
      .first()
      .click();
    await button("Connection Coding agent").click();
    await page.getByRole("menuitem", { name: "Revoke", exact: true }).click();
    await see("Nothing is connected.");
    await page.getByRole("checkbox", { name: "Show revoked" }).click();
    await page.locator(".pill", { hasText: "revoked" }).waitFor();
    const cut = await agent("tickets__work-find", {}).then(
      () => false,
      () => true,
    );
    if (!cut) throw new Error("the agent can still call");
  });
  await step("a project's prefix is changed in Settings; its tickets follow", async () => {
    await open("/settings/projects");
    await button("Prefix TLK. Change it").click();
    await page.fill("#prefix", "talk");
    await button("Change prefix").click();
    await button("Prefix TALK. Change it").waitFor();
    await open("/t/TALK-1");
    await see("Voice notes on the phone");
    await open("/t/TLK-2");
    await see("TALK-2");
    await open("/settings/projects");
    await button("Prefix TALK. Change it").click();
    await page.fill("#prefix", "tlk");
    await button("Change prefix").click();
    await button("Prefix TLK. Change it").waitFor();
  });
  await step("search finds a ticket in any project, by its words or its id", async () => {
    await open("/overview");
    await page.waitForSelector(".lane");
    await page.keyboard.press("/");
    await page.fill('[aria-label="Search every ticket"]', "recording length");
    await page.getByRole("option", { name: /Show the recording length/ }).waitFor();
    await page.fill('[aria-label="Search every ticket"]', "tlk-1");
    await page.getByRole("option", { name: /Voice notes on the phone/ }).click();
    await until(() => window.location.hash === "#/t/TLK-1");
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
