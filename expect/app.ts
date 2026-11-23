import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Outcome } from "@jaetask/open-agent-kit";
import type { App } from "@jaetask/open-agent-kit/app";
import { CALL_ID } from "@jaetask/open-agent-kit/mcp";
import { table } from "@jaetask/snap";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createTasks } from "../src/app.js";
import { renderData, said } from "./calls.js";

type Step =
  | { page: { call: string; input?: unknown; id?: string } }
  | { pair: { name: string; effects: string[] } }
  | { claim: string }
  | { tools: string }
  | { contracts: string }
  | { mcp: { as: string; tool: string; arguments?: unknown; id?: string } }
  | { raw: { method: string; path: string; body?: unknown } }
  | { get: string }
  | { restart: true };

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

export async function runApp(input: string): Promise<string> {
  const { steps } = JSON.parse(input) as { steps: Step[] };
  const dir = mkdtempSync(join(tmpdir(), "tasks-app-"));
  const START = Date.parse("2026-01-01T09:00:00Z");
  let clock = START;
  let app!: App;
  let url = "";
  const events: string[] = [];
  let stopEvents = () => {};
  const pairings = new Map<string, { id: string; claim: string; token?: string }>();
  const clients = new Map<string, Client>();

  const withIds = (value: unknown) =>
    JSON.parse(
      JSON.stringify(value ?? {}).replace(/"\$([^"]+)"/g, (whole, name: string) => {
        const found = pairings.get(name);
        return found ? JSON.stringify(found.id) : whole;
      }),
    ) as unknown;
  const named = (text: string) => {
    let out = text;
    for (const [name, { id }] of pairings) out = out.replaceAll(id, `<${name}>`);
    return out;
  };

  const page = (path: string, init: { method?: string; body?: unknown } = {}) =>
    fetch(`${url}${path}`, {
      method: init.method ?? "GET",
      headers: { "x-kit-request": "1", "content-type": "application/json" },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });

  const listen = async () => {
    const response = await fetch(`${url}/events`);
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let open = true;
    stopEvents = () => {
      open = false;
      void reader.cancel();
    };
    void (async () => {
      while (open) {
        const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const data = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!data) continue;
          const e = JSON.parse(data.slice(6)) as {
            action: string;
            caller: string;
            changes: { kind: string; subject: string; id: string }[];
          };
          for (const c of e.changes) {
            events.push(`${c.kind} ${c.subject} ${c.id} (${e.action}, caller ${e.caller})`);
          }
        }
      }
    })();
  };

  const open = async () => {
    app = await createTasks({
      file: join(dir, "app.db"),
      now: () => clock,
      stepsDir: fileURLToPath(new URL("./inbox/steps", import.meta.url)),
      page: fileURLToPath(new URL("../public", import.meta.url)),
      log: () => {},
      sweepEvery: 0,
      syncEvery: 0,
    });
    url = await app.listen(0);
    await listen();
  };
  const closeClients = async () => {
    for (const c of clients.values()) await c.close().catch(() => {});
    clients.clear();
  };
  const client = async (as: string) => {
    let found = clients.get(as);
    if (!found) {
      found = new Client({ name: "expect", version: "1" });
      const token = pairings.get(as)?.token ?? "kit_no-key";
      await found.connect(
        new StreamableHTTPClientTransport(new URL(`${url}/mcp`), {
          requestInit: { headers: { authorization: `Bearer ${token}` } },
        }),
      );
      clients.set(as, found);
    }
    return found;
  };

  await open();
  const out: string[] = [];
  try {
    for (const [i, step] of steps.entries()) {
      clock = START + (i + 1) * 60_000;
      const n = `${i + 1}.`;
      if ("page" in step) {
        const { call, id } = step.page;
        const response = await page("/api/calls", {
          method: "POST",
          body: { ...(id ? { id } : {}), action: call, input: withIds(step.page.input) },
        });
        const shown = step.page.input === undefined ? "" : ` ${JSON.stringify(step.page.input)}`;
        const result = response.ok
          ? said((await response.json()) as Outcome, /-(read|list|find)$/.test(call))
          : `HTTP ${response.status}: ${await response.text()}`;
        out.push(`${n} the page calls ${call}${shown} → ${named(result)}`);
      } else if ("pair" in step) {
        const { name, effects } = step.pair;
        const response = await fetch(`${url}/pair`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ host: name, effects }),
        });
        if (response.ok)
          pairings.set(name, (await response.json()) as { id: string; claim: string });
        out.push(
          `${n} ${name} asks to connect, to ${effects.join(" and ")} → HTTP ${response.status}`,
        );
      } else if ("claim" in step) {
        const pairing = pairings.get(step.claim);
        const response = await fetch(`${url}/pair/${pairing?.id}/claim`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ claim: pairing?.claim }),
        });
        const body = (await response.json().catch(() => ({}))) as { token?: string };
        if (pairing && body.token) pairing.token = body.token;
        const result = body.token ? "its key" : response.status === 202 ? "waiting" : "refused";
        out.push(`${n} ${step.claim} asks for its key → HTTP ${response.status}: ${result}`);
      } else if ("tools" in step) {
        const { tools } = await (await client(step.tools)).listTools();
        out.push(
          `${n} ${step.tools} lists its tools over MCP\n`,
          `${table(
            ["tool", "reads only", "description"],
            tools.map((t) => [
              t.name,
              t.annotations?.readOnlyHint ? "yes" : "",
              t.description ?? "",
            ]),
          )}\n`,
        );
      } else if ("contracts" in step) {
        const { resources } = await (await client(step.contracts)).listResources();
        out.push(
          `${n} ${step.contracts} lists the Contracts over MCP\n`,
          `${table(
            ["uri", "name"],
            resources.map((r) => [r.uri, r.name]),
          )}\n`,
        );
      } else if ("mcp" in step) {
        const { as, tool, id } = step.mcp;
        const shown =
          step.mcp.arguments === undefined ? "" : ` ${JSON.stringify(step.mcp.arguments)}`;
        let result: string;
        try {
          const answer = await (await client(as)).callTool({
            name: tool,
            arguments: (withIds(step.mcp.arguments) ?? {}) as Record<string, unknown>,
            ...(id ? { _meta: { [CALL_ID]: id } } : {}),
          });
          const read = /-(read|list|find)$/.test(tool);
          result = said(answer.structuredContent as unknown as Outcome, read);
        } catch (error) {
          clients.delete(as);
          result = `no answer: ${(error as Error).message.split("\n")[0]}`;
        }
        out.push(`${n} ${as} calls ${tool}${shown} over MCP → ${named(result)}`);
      } else if ("get" in step) {
        const response = await fetch(`${url}${step.get}`);
        const body = await response.text();
        const policy = response.headers.get("content-security-policy") ?? "";
        const facts = response.ok
          ? [
              response.headers.get("content-type"),
              body.length > 0 ? "not empty" : "empty",
              policy.includes("script-src 'self'")
                ? "scripts from this App only"
                : "no script policy",
            ]
          : [body];
        out.push(`${n} GET ${step.get} → HTTP ${response.status}: ${facts.join("; ")}`);
      } else if ("raw" in step) {
        const r = step.raw;
        const response = await fetch(`${url}${withIds(r.path)}`, {
          method: r.method,
          headers: {
            "content-type": "application/json",
            "x-kit-request": "1",
          },
          ...(r.body === undefined ? {} : { body: JSON.stringify(r.body) }),
        });
        out.push(
          `${n} ${r.method} ${r.path} → HTTP ${response.status}: ${named(await response.text())}`,
        );
      } else {
        stopEvents();
        await closeClients();
        await app.close();
        await open();
        out.push(`${n} Tasks restarts`);
      }
      for (let t = 0; t < 4; t++) await tick();
    }
    const connections = await app.connections.list();
    return [
      "### Steps",
      out.join("\n"),
      "### Change events the page saw",
      named(events.join("\n")) || "None.",
      "### Connections",
      connections.length
        ? table(
            ["name", "state", "acts as", "effects"],
            connections.map((c) => [c.host, c.state, c.principal.id, c.effects.join(", ")]),
          )
        : "None.",
      ...renderData(app.db),
    ].join("\n\n");
  } finally {
    stopEvents();
    await closeClients();
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
