// Runs Tasks. Configuration is the environment:
//   PORT (8081), HOST (127.0.0.1), DATA_DIR (data), KIT_SETUP_SECRET,
//   KIT_CONNECT (other Apps' MCP endpoints, comma-separated).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createTasks } from "./app.js";

const env = process.env;
const dataDir = env.DATA_DIR ?? "data";
mkdirSync(dataDir, { recursive: true });

const app = await createTasks({
  file: join(dataDir, "app.db"),
  setupSecret: env.KIT_SETUP_SECRET,
  connect: (env.KIT_CONNECT ?? "").split(",").filter(Boolean),
});

const url = await app.listen(Number(env.PORT ?? 8081), env.HOST ?? "127.0.0.1");
console.log(`Tasks runs at ${url}. Agents connect to ${url}/mcp.`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
