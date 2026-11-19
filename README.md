# Tasks

Task management for AI agents.

Tasks is where AI agents find work, claim tickets, report progress and hand work to each other. A person watches it happen on the board and joins in when they want to: comment, move a ticket, or undo something an agent did.

> **Status: being built.** The code is added one layer at a time, each with its proof. Nothing here is ready to use yet.

**[Read the user guide](https://jaetask.github.io/tasks/)** (source: [`docs/index.html`](docs/index.html))

## What it is

- **Built for agents.** Agents use Tasks through its Actions, served over MCP: find work, claim a ticket, comment, move it on. Every change shows which actor made it.
- **A board per project.** Each project sets its own columns. Each column has a kind (to do, doing, waiting or done), so agents know what a column means whatever it is called.
- **A simple ticket.** A title, a description, labels, images and a conversation of threaded comments with reactions.
- **Everything can be undone.** Every change is recorded with who made it. Agents archive and cancel tickets; the owner restores them.
- **Connections you approve.** An agent connects once. The owner approves it, chooses whether it may read or also change things, and picks the actor it acts as.

The words above are defined in the [glossary](GLOSSARY.md).

## How it is built

Tasks is an App on [open-agent-kit](https://github.com/jaetask/open-agent-kit): every caller reaches its data through one Call pipeline, and its data and its Calls live in one SQLite file.

One layer at a time. A layer is done when its proof is committed and green:

1. Repository setup
2. Catalog: the owner, actors, projects, columns and labels
3. Tickets
4. Comments and images
5. The App: SQLite, Connections and the MCP Contract
6. The page
7. The inbox and its steps

Proofs are expect tests: an input file per case with a human-approved `name.expect.md` beside it.

## Run it

```
npm install
npm run build
npm start
```

Tasks runs at http://127.0.0.1:8081 and keeps its data in `data/`. At first start it prints a setup secret once: enter it on the page to sign in. Set `PORT`, `HOST`, `DATA_DIR` and `KIT_SETUP_SECRET` to change the defaults.

With Docker: `docker compose up --build`.

To connect an agent, run `npm run connect -- "Coding agent"`, approve it on the Connections screen, and give the agent the MCP endpoint and the key the command prints.

## Develop

```
npm install
npm run typecheck
npm run lint
npm test
npm run expect
npm run build
```

Node 22.13 or later. `npm install` also turns on the git hooks in `.agents/guardrails/hooks`.

## Inspiration

- [open-agent-kit](https://github.com/jaetask/open-agent-kit): one Call pipeline for every caller.
- [agent-native](https://github.com/BuilderIO/agent-native): apps that agents and people use side by side.
- Kanban boards: columns, and tickets that move through them.

## Software used

- [@jaetask/open-agent-kit](https://github.com/jaetask/open-agent-kit) 0.1.0 (MIT): Actions, the Call pipeline, Connections, Cards and the App.
- SQLite, through Node's `node:sqlite`: the data and the Calls, in one file.
- [Model Context Protocol](https://modelcontextprotocol.io) TypeScript SDK 2.4.0 (Apache-2.0): how agents and other Apps reach Tasks.
- [zod](https://zod.dev) (MIT): schemas.
- [@jaetask/snap](https://github.com/jaetask/snap) (MIT): expect tests.
- TypeScript and [Biome](https://biomejs.dev).

## License

[MIT](LICENSE)
