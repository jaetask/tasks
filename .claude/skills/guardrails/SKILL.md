---
name: guardrails
description: Check a repo has the guardrails agents need, filed by layer from codebase to prose, wire up the ones the user picks, then report only what changes. Use for /guardrails, or to check a repo's guardrails.
---

# Guardrails

![Install once and pick checks per repo; a weekly run compares each repo with its last run and reports only what changed, suggesting a new check once.](guardrails.svg)

Checks that run themselves, so agents bounce off them instead of the user.

Everything lives in `.agents/guardrails/`.

1. In the repo, run `uv run <this skill>/guardrails.py init`. It proposes `checks.yml`: the repo's typecheck, lint, format, test and verify commands, and every check with pass or fail.
2. Show it. The user turns each check on or off. Nothing is on until they say.
3. Write `checks.yml`, and add the AGENTS.md line it prints.
4. Wire up each check that is on and failing, smallest fix first:
   - **pre-commit**: `hooks/pre-commit` runs typecheck and lint; `git config core.hooksPath .agents/guardrails/hooks`, also set by the repo's install script.
   - **format**: `hooks/pre-commit` also runs the format command in check mode. Reformat the repo in its own commit first; where the linter fights the formatter, turn off the linter's style rules.
   - **tests-before-merge**: CI runs the test command, or `hooks/pre-push` does.
   - **verify**: a command that checks real output, such as approved-output or end-to-end tests, runs in CI or `hooks/pre-push`.
   - **ast-grep**: `sgconfig.yml`, one ast-grep YAML rule per ban in `rules/` with a quoted `message`, and a test for each in `rule-tests/`. Run ast-grep with `-c .agents/guardrails/sgconfig.yml`. Install `@ast-grep/cli` as a dev dependency, or `brew install ast-grep`.
   - **no-comments**: the [delete-comment](../delete-comment/SKILL.md) skill sorts the comments, deletes them and sets the ratchet.
   - A fix bigger than small: turn the check off and say why.
5. Run `uv run <this skill>/guardrails.py check` until every check that is on passes. Report each layer's count, and name any empty layer.

Re-running the skill only checks. To keep watch, schedule `uv run <this skill>/guardrails.py diff --repos <file>` weekly: it prints only what changed since the last run, and nothing when nothing did. Its friction section ranks the [trail](../trail/SKILL.md) tags logged since, by count times minutes lost; `guardrails.py friction` ranks them all, for pave.

## Layers

![Five layers, widest first: codebase, static analysis, verification, prose, and human review last.](pyramid.svg)

Layers from [Lauren Tan](https://x.com/poteto/status/2118613050462728659). Invest from the top down: the more deterministic, the better. A rule agents keep breaking moves up a layer: from AGENTS.md to an ast-grep ban, a type or a test.
