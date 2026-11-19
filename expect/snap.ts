// Expect tests: each .json file in a suite folder is an input; its approved
// output sits beside it as name.expect.md. Run `npm run expect -- --update`
// to write new output, then read it before committing.
import { contract } from "@jaetask/open-agent-kit";
import { snap } from "@jaetask/snap";
import { domains } from "../src/domains.js";
import { renderScript } from "./calls.js";
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
]);
process.exit(failed === 0 ? 0 : 1);
