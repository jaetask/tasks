import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { contract } from "@jaetask/open-agent-kit";
import { snap, table } from "@jaetask/snap";
import { domains } from "../src/domains.js";
import { runApp } from "./app.js";
import { renderScript } from "./calls.js";
import { runInbox } from "./inbox.js";
import { renderContract } from "./render.js";

const failed = await snap([
  {
    dir: "expect/contract",
    render: (input) => {
      const { domain: name } = JSON.parse(input) as { domain: string };
      const found = domains().find((p) => p.domain.name === name);
      if (!found) throw new Error(`No Domain is named ${name}`);
      return renderContract(contract(found.domain));
    },
  },
  {
    dir: "expect/calls",
    render: renderScript,
  },
  {
    dir: "expect/inbox",
    render: runInbox,
  },
  {
    dir: "expect/page",
    render: (input) => {
      const { folder } = JSON.parse(input) as { folder: string };
      const provided = domains();
      const effects = new Map(
        provided.flatMap(({ domain }) =>
          domain.actions.map((a) => [`${domain.name}.${a.name}`, a.effect as string]),
        ),
      );
      const names = provided.map((p) => p.domain.name).join("|");
      const scripts = readdirSync(folder)
        .filter((file) => /\.(js|ts|tsx)$/.test(file))
        .map((file) => readFileSync(join(folder, file), "utf8"))
        .join("\n");
      const called = scripts.matchAll(new RegExp(`"((?:${names})\\.[a-z-]+)"`, "g"));
      const unique = [...new Set([...called].map((m) => m[1] as string))].sort();
      return table(
        ["action the page calls", "effect"],
        unique.map((name) => [name, effects.get(name) ?? "NOT AN ACTION"]),
      );
    },
  },
  {
    dir: "expect/app",
    render: runApp,
  },
]);
process.exit(failed === 0 ? 0 : 1);
