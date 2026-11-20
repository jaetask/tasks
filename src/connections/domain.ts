// The connections Domain: the agents and Apps that asked to connect. The
// owner approves each one, chooses whether it may only read or also change
// things, and picks the actor it acts as. A Connection never acts as the
// owner.
import {
  type Connections,
  defineAction,
  defineCard,
  defineDomain,
  type RunContext,
} from "@jaetask/open-agent-kit";
import { z } from "zod";
import type { Base } from "../actions.js";
import { type Catalog, OWNER } from "../catalog/catalog.js";
import { orRefused, type Refused } from "../refusal.js";

export type ConnectionsDeps = Base & {
  catalog: Catalog;
  connections: Connections;
  /** Sets who a Connection acts as and what it may do, before it is approved. */
  scope(connection: string, actor: string, effects: ("read" | "write")[]): void;
};

const ConnectionView = z.object({
  id: z.string(),
  name: z.string().describe("The name it gave when it asked to connect."),
  state: z.enum(["pairing", "connected", "revoked"]),
  actor: z.string().describe("The id of the actor it acts as. Empty until it is approved."),
  actorName: z.string(),
  may: z.enum(["read", "read and change"]),
});
type ConnectionView = z.infer<typeof ConnectionView>;

export const connectionList = defineCard({
  name: "connections",
  version: 1,
  about: "The agents and Apps that asked to connect.",
  view: {
    kind: "list",
    title: "Connections",
    fields: [
      { label: "Name", path: "name" },
      { label: "State", path: "state" },
      { label: "Actor", path: "actorName" },
      { label: "May", path: "may" },
    ],
  },
});

export const connectionChanged = defineCard({
  name: "connection-changed",
  version: 1,
  about: "A Connection after it was approved or revoked.",
  view: {
    kind: "record",
    title: "Connection",
    fields: [
      { label: "Name", path: "name" },
      { label: "State", path: "state" },
      { label: "Actor", path: "actorName" },
      { label: "May", path: "may" },
    ],
  },
});

const refuse = (code: string, message: string): Refused => ({ refused: { code, message } });

async function views({ connections, catalog }: ConnectionsDeps): Promise<ConnectionView[]> {
  const actors = catalog.read().actors;
  return (await connections.list()).map((c) => {
    const actor = c.state === "pairing" ? "" : c.principal.id;
    return {
      id: c.id,
      name: c.host,
      state: c.state,
      actor,
      actorName: actors.find((a) => a.id === actor)?.name ?? "",
      may: c.effects.includes("write") ? "read and change" : "read",
    };
  });
}

const list = defineAction({
  name: "connection-list",
  description: "List the Connections: those waiting for approval, connected and revoked.",
  effect: "read",
  input: z.object({}),
  output: z.array(ConnectionView),
  card: connectionList,
  run: (_input, context: ConnectionsDeps) => views(context),
});

const approve = defineAction({
  name: "connection-approve",
  description:
    "Approve a Connection that asked to connect: pick the actor it acts as, and whether it may change things or only read.",
  effect: "write",
  input: z.object({
    connection: z.string(),
    actor: z.string().describe("The id of an agent's actor. Never the owner."),
    change: z.boolean().describe("True if it may change things; false if it may only read."),
  }),
  output: orRefused(ConnectionView),
  card: connectionChanged,
  run: async ({ connection: id, actor: actorId, change }, context: RunContext<ConnectionsDeps>) => {
    const { connections, catalog, journal, principal, scope } = context;
    const found = await connections.get(id);
    if (!found) return refuse("unknown-connection", `No Connection has id ${id}.`);
    if (found.state !== "pairing") {
      return refuse("not-waiting", `That Connection is already ${found.state}.`);
    }
    const actor = catalog.read().actors.find((a) => a.id === actorId);
    if (!actor) return refuse("unknown-actor", `No actor has id ${actorId}.`);
    if (actor.id === OWNER) {
      return refuse("owner", "A Connection cannot act as the owner. Pick an agent's actor.");
    }
    if (actor.archived) return refuse("archived-actor", `${actor.name} is archived.`);
    scope(id, actor.id, change ? ["read", "write"] : ["read"]);
    await connections.approve(id);
    const may = change ? "read and change" : "read";
    journal.record({
      actor: principal.id,
      action: "connections.connection-approve",
      summary: `approved the connection ${found.host} as ${actor.name}, to ${may}`,
      final: true,
    });
    context.change({ kind: "updated", subject: "connection", id });
    return (await views(context)).find((c) => c.id === id) as ConnectionView;
  },
});

const revoke = defineAction({
  name: "connection-revoke",
  description:
    "Revoke a Connection, or turn down one that is waiting. It is cut off at once; what it did stays visible.",
  effect: "write",
  input: z.object({ connection: z.string() }),
  output: orRefused(ConnectionView),
  card: connectionChanged,
  run: async ({ connection: id }, context: RunContext<ConnectionsDeps>) => {
    const { connections, journal, principal } = context;
    const found = await connections.get(id);
    if (!found) return refuse("unknown-connection", `No Connection has id ${id}.`);
    if (found.state === "revoked")
      return refuse("no-change", "That Connection is already revoked.");
    await connections.revoke(id);
    journal.record({
      actor: principal.id,
      action: "connections.connection-revoke",
      summary: `revoked the connection ${found.host}`,
      final: true,
    });
    context.change({ kind: "updated", subject: "connection", id });
    return (await views(context)).find((c) => c.id === id) as ConnectionView;
  },
});

export const connectionsDomain = defineDomain<ConnectionsDeps>({
  name: "connections",
  version: "1.0.0",
  about: "The agents and Apps connected to Tasks. Only the owner sees and changes them.",
  actions: [list, approve, revoke],
  cards: [connectionList, connectionChanged],
  authorise: (principal) => principal.id === OWNER,
});
