// Runs Tasks. Configuration is the environment:
//   PORT (8081), HOST (127.0.0.1), DATA_DIR (data), KIT_SETUP_SECRET,
//   KIT_CONNECT (other Apps' MCP endpoints, comma-separated).
// The owner's script steps for the inbox are in DATA_DIR/steps.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTasks } from "./app.js";
import { readTitle } from "./tickets/page-title.js";

const env = process.env;
const dataDir = env.DATA_DIR ?? "data";
mkdirSync(dataDir, { recursive: true });

const app = await createTasks({
  file: join(dataDir, "app.db"),
  setupSecret: env.KIT_SETUP_SECRET,
  connect: (env.KIT_CONNECT ?? "").split(",").filter(Boolean),
  page: fileURLToPath(new URL("../public", import.meta.url)),
  stepsDir: join(dataDir, "steps"),
  // With LINK_TITLES=1 Tasks reads the title of the page each new link points to.
  ...(env.LINK_TITLES === "1" ? { readTitle } : {}),
});

const url = await app.listen(Number(env.PORT ?? 8081), env.HOST ?? "127.0.0.1");
console.log(`Tasks runs at ${url}. Agents connect to ${url}/mcp.`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
