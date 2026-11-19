// Tasks as an App on the Kit: its Domains on one SQLite file, served to the
// page, to agents and to other Apps through the same Call pipeline.
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { type App, createApp } from "@jaetask/open-agent-kit/app";
import { nodeListener } from "@jaetask/open-agent-kit/mcp";
import { OWNER } from "./catalog/catalog.js";
import { domains, migrate } from "./domains.js";
import { VERSION } from "./version.js";

export type TasksOptions = {
  /** The App database: a file path, or ":memory:". */
  file: string;
  /** The setup secret. Without one, Tasks makes a secret at first start and logs it once. */
  setupSecret?: string | undefined;
  /** Other Apps' MCP endpoints to connect to at start. */
  connect?: string[];
  /** A folder of static files for the page. */
  page?: string;
  log?: (line: string) => void;
  now?: () => number;
  /** How often the App sweeps and syncs, in milliseconds; 0 turns each off. */
  sweepEvery?: number;
  syncEvery?: number;
};

const APPROVE = /^\/api\/connections\/[^/]+\/approve$/;

export async function createTasks(options: TasksOptions): Promise<App> {
  const now = options.now ?? Date.now;
  const app = await createApp({
    name: "tasks",
    version: VERSION,
    file: options.file,
    domains: domains(now),
    owner: { id: OWNER },
    now,
    ...(options.setupSecret ? { setupSecret: options.setupSecret } : {}),
    ...(options.connect ? { connect: options.connect } : {}),
    ...(options.page ? { page: options.page } : {}),
    ...(options.log ? { log: options.log } : {}),
    ...(options.sweepEvery === undefined ? {} : { sweepEvery: options.sweepEvery }),
    ...(options.syncEvery === undefined ? {} : { syncEvery: options.syncEvery }),
  });
  migrate(app.db);

  // A Connection is approved only through connections.connection-approve,
  // where the owner picks its actor and what it may do.
  const fetch = async (request: Request) => {
    if (request.method === "POST" && APPROVE.test(new URL(request.url).pathname)) {
      return Response.json(
        { error: "Approve a Connection with the Action connections.connection-approve." },
        { status: 404 },
      );
    }
    return app.fetch(request);
  };

  let http: Server | undefined;
  return {
    ...app,
    fetch,
    listen: async (port, host = "127.0.0.1") => {
      http = createServer(nodeListener(fetch));
      await new Promise<void>((resolve) => http?.listen(port, host, resolve));
      return `http://${host}:${(http.address() as AddressInfo).port}`;
    },
    close: async () => {
      if (http) {
        http.closeAllConnections();
        await new Promise((resolve) => http?.close(resolve));
      }
      await app.close();
    },
  };
}
