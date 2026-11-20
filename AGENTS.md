# AGENTS.md

Tasks: task management for AI agents, an App on [@jaetask/open-agent-kit](https://github.com/jaetask/open-agent-kit). TypeScript, Node 22.13+, ESM, built with tsc. Read [README.md](README.md) and [docs/index.html](docs/index.html) first.

- **Language**: use the words in [GLOSSARY.md](GLOSSARY.md), never their _Avoid_ synonyms. The Kit's own words (App, Domain, Action, Effect, Call, Outcome, Card, Contract, Connection) keep the meaning its glossary gives them.
- **One layer at a time**, in the README's order. A layer is done when its proof is committed and green. Add nothing from a later layer.
- **Proofs** are expect tests in `expect/`: `npm run expect -- --update`, then read every new `.expect.md` before committing.
- **Every caller goes through the Call pipeline**: the page, agents and other Apps change data only by invoking Actions. Nothing personal is in code: actors, projects, columns, labels and locations are data the owner creates.
- **The page** is in `page/`, built from [@jaetask/toolkit](https://github.com/jaetask/toolkit): its shell, panels, lists and edit pages. Editing opens an edit page with Back, Cancel and Save, never in place. `toolkit-guard` (part of `lint`) fails a hand-built shell, section or edit page; a missing piece is asked of the toolkit.
- **Build only what has a reason**: leave a part out unless there is a deliberate reason for it.
- **Checks**: `npm run typecheck`, `lint`, `format:check`, `test`, `expect`, `build`. Hooks in `.agents/guardrails/hooks` run them on commit and push; `npm run format` fixes formatting.
- **Branches**: push a branch, never main. `auto-pr` opens a pull request to main and it merges itself when the `ci` check passes; the pre-push hook refuses main.
- **Public docs state decisions only**: open questions and undecided items never go in `docs/` or README.md; they belong in issues or the conversation. `npm run check:docs` (part of `lint`) enforces it.
- **Public docs describe what Tasks has and does**: they do not mention things removed or left out, and do not compare Tasks with other projects beyond a credit.
- **Plain, literal language**: no slogans, hype or dramatic phrasing. `check:docs` bans known phrases from `scripts/docs-phrases.json`; when someone flags a new one, add it there with the pave skill.
- Log friction and decisions with the trail skill.
- When corrected, or when the same friction repeats, use the pave skill.
