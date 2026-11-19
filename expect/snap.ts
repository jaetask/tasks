// Expect tests: each .json file in a suite folder is an input; its approved
// output sits beside it as name.expect.md. Run `npm run expect -- --update`
// to write new output, then read it before committing.
import { snap } from "@jaetask/snap";

const failed = await snap([]);
process.exit(failed === 0 ? 0 : 1);
