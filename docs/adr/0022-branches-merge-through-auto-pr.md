# 22. Branches merge through auto-pr, and the job deletes the branch

## Context

Agents push branches over SSH and never push main. Merging should need nothing on the agent's machine.

## Decision

`.github/workflows/auto-pr.yml` runs on every push to a branch other than main. It opens a pull request to main and turns on auto-merge, so the pull request merges itself once the ci check passes. It runs on GitHub with its own token, so the agent's machine needs no GitHub command line tool. GitHub does not delete a head branch that its own token merged, even with the setting to delete head branches on, so the job waits for the merge and deletes the branch itself.

## Consequences

The wait step is what removes merged branches; without it they pile up. A pull request closed without merging keeps its branch.
