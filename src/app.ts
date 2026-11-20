// Tasks as an App on the Kit: its Domains on one SQLite file, served to the
// page, to agents and to other Apps through the same Call pipeline.
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
  /** The App database: a file path, or ":memory:". */
  file: string;
  /** The setup secret. Without one, Tasks makes a secret at first start and logs it once. */
  setupSecret?: string | undefined;
  /** Other Apps' MCP endpoints to connect to at start. */
  connect?: string[];
  /** Domains of other Apps to use as Plugins, such as one an inbox step asks. */
  plugins?: RemoteOptions[];
  /** A folder of static files for the page. */
  page?: string;
  /** The folder the owner's script steps for the inbox are in. */
  stepsDir: string;
  /** The folder files attached to tickets are kept in. Beside the database if left out. */
  filesDir?: string;
  /**
   * Reads the title of the page a new link points to. Without one, links keep their address as
   * their name and Tasks asks no other site anything.
   */
  readTitle?: ReadTitle;
  /** Where steps find their keys. Defaults to the process environment. */
  env?: Record<string, string | undefined>;
  log?: (line: string) => void;
  now?: () => number;
  /** How often the App sweeps and syncs, in milliseconds; 0 turns each off. */
  sweepEvery?: number;
  syncEvery?: number;
};

const APPROVE = /^\/api\/connections\/[^/]+\/approve$/;

/** Tasks: the App, and the pipeline that runs the inbox steps. */
export type Tasks = App & { pipeline: Pipeline };

export async function createTasks(options: TasksOptions): Promise<Tasks> {
  const now = options.now ?? Date.now;
  const filesDir =
    options.filesDir ??
    (options.file === ":memory:"
      ? mkdtempSync(join(tmpdir(), "tasks-files-"))
      : join(dirname(options.file), "files"));
  const app = await createApp({
    name: "tasks",
    version: VERSION,
    file: options.file,
    domains: domains(now, { dir: filesDir }),
    owner: { id: OWNER },
    now,
    ...(options.setupSecret ? { setupSecret: options.setupSecret } : {}),
    ...(options.connect ? { connect: options.connect } : {}),
    ...(options.plugins ? { plugins: options.plugins } : {}),
    ...(options.page ? { page: options.page } : {}),
    ...(options.log ? { log: options.log } : {}),
    ...(options.sweepEvery === undefined ? {} : { sweepEvery: options.sweepEvery }),
    ...(options.syncEvery === undefined ? {} : { syncEvery: options.syncEvery }),
  });
  migrate(app.db);

  // A Connection is approved only through connections.connection-approve,
  // where the owner picks its actor and what it may do.
  const files = filesRoutes({
    app,
    db: app.db,
    dir: filesDir,
    stagedDir: join(filesDir, "staged"),
  });
  const fetch = async (request: Request) => {
    if (request.method === "POST" && APPROVE.test(new URL(request.url).pathname)) {
      return Response.json(
        { error: "Approve a Connection with the Action connections.connection-approve." },
        { status: 404 },
      );
    }
    return (await files(request)) ?? app.fetch(request);
  };

  // The steps look at each new inbox item as it arrives, and again when asked.
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
