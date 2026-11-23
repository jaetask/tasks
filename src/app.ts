import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { type App, createApp } from "@jaetask/open-agent-kit/app";
import { nodeListener, type RemoteOptions } from "@jaetask/open-agent-kit/mcp";
import { OWNER } from "./catalog/catalog.js";
import { domains, migrate } from "./domains.js";
import { filesRoutes } from "./files/http.js";
import { createPipeline, type Pipeline } from "./inbox/pipeline.js";
import { createLinkTitles } from "./tickets/link-titles.js";
import type { ReadTitle } from "./tickets/page-title.js";
import { VERSION } from "./version.js";

export type TasksOptions = {
  file: string;
  connect?: string[];
  plugins?: RemoteOptions[];
  page?: string;
  stepsDir: string;
  filesDir?: string;
  readTitle?: ReadTitle;
  env?: Record<string, string | undefined>;
  log?: (line: string) => void;
  now?: () => number;
  sweepEvery?: number;
  syncEvery?: number;
};

const APPROVE = /^\/api\/connections\/[^/]+\/approve$/;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const PAGE_ROUTES = /^\/(api\/|events$)/;

async function ownerCookie(
  fetch: (request: Request) => Promise<Response>,
  secret: string,
): Promise<string> {
  const signIn = async (cookie = "") => {
    const answer = await fetch(
      new Request("http://127.0.0.1/api/session", {
        method: "POST",
        headers: { "content-type": "application/json", "x-kit-request": "1", cookie },
        body: JSON.stringify({ secret }),
      }),
    );
    return (answer.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  };
  const old = await signIn();
  await fetch(
    new Request("http://127.0.0.1/api/sessions", {
      method: "DELETE",
      headers: { "x-kit-request": "1", cookie: old },
    }),
  );
  return signIn();
}

const isLocal = (request: Request) => {
  const host = request.headers.get("host");
  return !host || LOCAL_HOSTS.has(new URL(`http://${host}`).hostname);
};

const withCookie = (request: Request, cookie: string) => {
  const headers = new Headers(request.headers);
  headers.set("cookie", cookie);
  return new Request(request, { headers });
};

export type Tasks = App & { pipeline: Pipeline };

export async function createTasks(options: TasksOptions): Promise<Tasks> {
  const now = options.now ?? Date.now;
  const filesDir =
    options.filesDir ??
    (options.file === ":memory:"
      ? mkdtempSync(join(tmpdir(), "tasks-files-"))
      : join(dirname(options.file), "files"));
  const setupSecret = randomBytes(24).toString("base64url");
  const app = await createApp({
    name: "tasks",
    version: VERSION,
    file: options.file,
    domains: domains(now, { dir: filesDir }),
    owner: { id: OWNER },
    now,
    setupSecret,
    ...(options.connect ? { connect: options.connect } : {}),
    ...(options.plugins ? { plugins: options.plugins } : {}),
    ...(options.page ? { page: options.page } : {}),
    ...(options.log ? { log: options.log } : {}),
    ...(options.sweepEvery === undefined ? {} : { sweepEvery: options.sweepEvery }),
    ...(options.syncEvery === undefined ? {} : { syncEvery: options.syncEvery }),
  });
  migrate(app.db);

  const files = filesRoutes({
    app,
    db: app.db,
    dir: filesDir,
    stagedDir: join(filesDir, "staged"),
  });
  const cookie = await ownerCookie(app.fetch, setupSecret);
  const fetch = async (request: Request) => {
    const { pathname } = new URL(request.url);
    if (!isLocal(request)) {
      return new Response("Tasks answers on this computer only.", { status: 403 });
    }
    if (pathname === "/api/session" || pathname === "/api/sessions") {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    if (request.method === "POST" && APPROVE.test(pathname)) {
      return Response.json(
        { error: "Approve a Connection with the Action connections.connection-approve." },
        { status: 404 },
      );
    }
    const asOwner = PAGE_ROUTES.test(pathname) ? withCookie(request, cookie) : request;
    return (await files(asOwner)) ?? app.fetch(asOwner);
  };

  const pipeline = createPipeline({
    db: app.db,
    calls: app.calls,
    now,
    stepsDir: options.stepsDir,
    ...(options.env ? { env: options.env } : {}),
  });
  const failed = (error: Error) => (options.log ?? console.log)(`Inbox steps: ${error.message}`);
  app.onChange(({ changes }) => {
    for (const change of changes) {
      const arrived = change.subject === "item" && change.kind === "created";
      if (arrived || change.subject === "item-run") pipeline.run(change.id).catch(failed);
    }
  });
  pipeline.catchUp().catch(failed);

  const titles = options.readTitle
    ? createLinkTitles({ app, read: options.readTitle, log: options.log ?? console.log })
    : undefined;

  let http: Server | undefined;
  return {
    ...app,
    pipeline,
    fetch,
    listen: async (port, host = "127.0.0.1") => {
      http = createServer(nodeListener(fetch));
      await new Promise<void>((resolve) => http?.listen(port, host, resolve));
      return `http://${host}:${(http.address() as AddressInfo).port}`;
    },
    close: async () => {
      await pipeline.idle();
      await titles?.idle();
      if (http) {
        http.closeAllConnections();
        await new Promise((resolve) => http?.close(resolve));
      }
      await app.close();
    },
  };
}
