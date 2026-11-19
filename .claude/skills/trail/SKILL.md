---
name: trail
description: Log each decision and each piece of friction as one row, so the worst friction gets paved first. Use when you make a call someone will ask about, or lose time to the repo, its tools or its docs.
---

# Trail

One row per event, appended to a log outside the repo with [trail.sh](trail.sh).

- **Friction**: time lost to the repo: a failing setup, a missing command, a wrong doc, a retry.
- **Decision**: a call between real options.

1. Run `trail.sh tags`. Reuse a tag that fits; coin a new one, short and kebab-case, only when none does.
2. Log it as it happens:
   `trail.sh friction <tag> "<what>" "<why>" <evidence> <minutes> "<fix>"`
   `trail.sh decision <tag> "<what>" "<why>" <evidence>`
   - **what**: one line, what happened or was chosen.
   - **why**: the cause, or the reason over the alternative.
   - **evidence**: a pointer: commit, PR, `file:line` or command. Never prose.
   - **minutes**: an honest guess at time lost.
   - **fix**: the change that would have prevented it.
3. Nothing happened: log nothing.

The guardrails weekly report ranks friction tags by count times minutes; pave takes the top one.
