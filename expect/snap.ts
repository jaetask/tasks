// Expect tests: each .json file in a suite folder is an input; its approved
// output sits beside it as name.expect.md. Run `npm run expect -- --update`
// to write new output, then read it before committing.
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
    // Input: { "domain": name }. Output: that Domain's Contract.
    dir: "expect/contract",
    render: (input) => {
      const { domain: name } = JSON.parse(input) as { domain: string };
      const found = domains().find((p) => p.domain.name === name);
      if (!found) throw new Error(`No Domain is named ${name}`);
      return renderContract(contract(found.domain));
    },
  },
  {
    // Input: a Call script. Output: each step's Outcome, then the data.
    dir: "expect/calls",
    render: renderScript,
  },
  {
    // The inbox and its steps: script, model, classifier and another App.
    dir: "expect/inbox",
    render: runInbox,
  },
  {
    // Input: { "folder": path }. Output: every Action the page's scripts
    // call, and whether Tasks has it.
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
        .filter((file) => file.endsWith(".js"))
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
    // Tasks as a running App over real HTTP and MCP.
    dir: "expect/app",
    render: runApp,
  },
]);
process.exit(failed === 0 ? 0 : 1);
