// Runs a Call script against Tasks with its inbox pipeline. Script steps are
// the modules in expect/inbox/steps; model steps reach a scripted model
// server; an app step reaches a second App over MCP.
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import {
  type ActionName,
  defineAction,
  defineDomain,
  type Outcome,
  provide,
} from "@jaetask/open-agent-kit";
import { createApp } from "@jaetask/open-agent-kit/app";
import { table } from "@jaetask/snap";
import { z } from "zod";
import { createTasks } from "../src/app.js";
import { sqliteInbox } from "../src/inbox/inbox.js";
import { sqliteRuns } from "../src/inbox/runs.js";
import { openJournal } from "../src/journal.js";
import { renderData, said } from "./calls.js";

type Step = { as?: string; call: string; input?: unknown; id?: string };

const START = Date.parse("2026-01-01T09:00:00Z");

// A scripted model on an OpenAI-compatible endpoint. With tools, it tags
// crash reports as bugs; without, it classifies as spam or ok. It says
// whether a key came with the request.
function modelServer() {
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const asked = JSON.parse(body) as {
        model: string;
        tools?: { function: { name: string } }[];
        messages: { content: string }[];
      };
      const item = (asked.messages[1] as { content: string }).content;
      const keyed = req.headers.authorization ? "with a key" : "with no key";
      const message = asked.tools
        ? {
            content: `${asked.model}, ${keyed}, offered ${asked.tools.map((t) => t.function.name).join(", ")}`,
            tool_calls: /crash/i.test(item)
              ? [{ function: { name: "item-tag", arguments: JSON.stringify({ tags: ["bug"] }) } }]
              : [],
          }
        : { content: /cheap/i.test(item) ? "spam" : "ok" };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message }] }));
    });
  });
  return new Promise<{ url: string; close(): Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({
        url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`,
        close: () => new Promise((done) => server.close(() => done())),
      }),
    );
  });
}

// A second App with one Action that answers an inbox step: it sorts by length.
async function sorterApp() {
  const sort = defineAction({
    name: "sort",
    description: "Say what to do with an inbox item.",
    effect: "read",
    input: z.object({ item: z.object({ text: z.string() }) }).loose(),
    output: z.object({
      calls: z.array(z.object({ action: z.string(), input: z.record(z.string(), z.unknown()) })),
      reason: z.string(),
    }),
    run: ({ item }) => ({
      calls: [
        {
          action: "item-category-set",
          input: { category: item.text.length > 40 ? "long" : "short" },
        },
      ],
      reason: `${item.text.length} characters`,
    }),
  });
  const domain = defineDomain({
    name: "sorter",
    version: "1.0.0",
    about: "Sorts inbox items.",
    actions: [sort],
  });
  const app = await createApp({
    name: "sorter",
    version: "1.0.0",
    file: ":memory:",
    log: () => {},
    sweepEvery: 0,
    syncEvery: 0,
    domains: [provide(domain, () => ({}))],
  });
  const asked = await app.connections.request("tasks", { id: "owner" }, ["read"]);
  const token = await app.connections.approve(asked.id);
  return { app, plugin: { url: `${await app.listen(0)}/mcp`, token, domain: "sorter" } };
}

export async function runInbox(input: string): Promise<string> {
  const { steps, other_app } = JSON.parse(input) as { steps: Step[]; other_app?: boolean };
  const model = await modelServer();
  const sorter = other_app ? await sorterApp() : undefined;
  let clock = START;
  const tasks = await createTasks({
    file: ":memory:",
    now: () => clock,
    setupSecret: "expect-setup-secret",
    log: () => {},
    sweepEvery: 0,
    syncEvery: 0,
    stepsDir: fileURLToPath(new URL("./inbox/steps", import.meta.url)),
    env: { EXPECT_MODEL_KEY: "a-key" },
    ...(sorter ? { plugins: [sorter.plugin] } : {}),
  });
  try {
    const lines: string[] = [];
    for (const [i, step] of steps.entries()) {
      clock = START + (i + 1) * 60_000;
      const actor = step.as ?? "owner";
      const given = JSON.parse(
        JSON.stringify(step.input ?? {}).replaceAll("$MODEL", model.url),
      ) as unknown;
      const outcome: Outcome = await tasks.calls.invoke({
        id: step.id ?? `c${i + 1}`,
        action: step.call as ActionName,
        input: given,
        principal: { id: actor },
        caller: actor === "owner" ? "ui" : "plugin",
      });
      await tasks.pipeline.idle();
      const shown = step.input === undefined ? "" : ` ${JSON.stringify(step.input)}`;
      const read = /-(read|list|find)$/.test(step.call);
      lines.push(`${i + 1}. ${actor} calls ${step.call}${shown} → ${said(outcome, read)}`);
    }
    const inbox = sqliteInbox(tasks.db, openJournal(tasks.db, () => clock).rows);
    const runs = sqliteRuns(tasks.db);
    const items = inbox.items();
    const pipeline = inbox.steps();
    return [
      "### Steps",
      lines.join("\n"),
      "### The inbox steps, in order",
      pipeline.length
        ? table(
            ["id", "name", "kind", "actor", "may ask for", "runs on", "on"],
            pipeline.map((s) => [
              s.id,
              s.name,
              s.kind,
              s.actor,
              s.actions.join(", "),
              s.condition ? JSON.stringify(s.condition) : "every item",
              s.on ? "yes" : "no",
            ]),
          )
        : "None.",
      "### Inbox",
      items.length
        ? table(
            [
              "id",
              "project",
              "title",
              "as captured",
              "state",
              "tags",
              "category",
              "fields",
              "reason",
              "ticket",
            ],
            items.map((n) => [
              n.id,
              n.project,
              n.title,
              n.original.title === n.title ? "" : n.original.title,
              n.state,
              n.tags.join(", "),
              n.category ?? "",
              Object.entries(n.fields)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", "),
              n.reason ?? "",
              n.ticket ?? "",
            ]),
          )
        : "None.",
      "### Runs",
      items
        .flatMap((n) => runs.of(n.id))
        .map((run) =>
          [
            `${run.id} on ${run.item}: ${run.ended}`,
            ...run.steps.flatMap((s) => [
              `- ${s.name}: ${s.ran ? "ran" : "did not run"}. ${s.reason}`,
              ...s.calls.map((c) => `  - ${c.action} ${JSON.stringify(c.input)} → ${c.outcome}`),
            ]),
          ].join("\n"),
        )
        .join("\n\n") || "None.",
      ...renderData(tasks.db).filter((_, i, all) => {
        // Keep the tickets and the changes; the rest is not about the inbox.
        const heading = i % 2 === 0 ? all[i] : all[i - 1];
        return heading === "### Tickets" || heading === "### Changes";
      }),
    ].join("\n\n");
  } finally {
    await tasks.close();
    await sorter?.app.close();
    await model.close();
  }
}
