// How the page talks to Tasks: every read and every change is a Call to an
// Action, through POST /api/calls, the same pipeline agents use.

export type Kind = "todo" | "doing" | "waiting" | "done";
export type Colour = "blue" | "teal" | "green" | "amber" | "purple" | "pink";
export type Actor = { id: string; name: string; icon: string; archived: boolean };
export type Location = { id: string; name: string; archived: boolean };
export type Column = { id: string; name: string; kind: Kind };
export type Project = {
  id: string;
  name: string;
  icon: string;
  /** One of the six named colours, or six-digit hex. */
  colour: string;
  archived: boolean;
  columns: Column[];
};
export type Label = { id: string; name: string; colour: Colour };
export type Catalog = {
  actors: Actor[];
  locations: Location[];
  projects: Project[];
  labels: Label[];
};
export type Ticket = {
  id: string;
  project: string;
  title: string;
  description: string;
  feature: string | null;
  featureName: string;
  column: Column;
  assignee: string | null;
  assigneeName: string;
  location: string | null;
  locationName: string;
  labels: Label[];
  blocked: string | null;
  state: "open" | "archived" | "canceled";
  backlog: boolean;
  comments: number;
  images: number;
  awaiting: number;
};
export type Board = { columns: (Column & { tickets: Ticket[] })[] };
export type Overview = { kinds: { kind: Kind; tickets: Ticket[] }[] };
export type Feature = {
  id: string;
  project: string;
  name: string;
  description: string;
  favourite: boolean;
  archived: boolean;
  tickets: number;
};
export type Reaction = { emoji: string; actors: string[] };
export type Reply = {
  id: string;
  ticket: string;
  author: string;
  authorName: string;
  text: string;
  at: string;
  editedAt: string | null;
  removed: boolean;
  reactions: Reaction[];
};
export type Comment = Reply & { replies: Reply[] };
export type Line = {
  id: string;
  at: string;
  actor: string;
  actorName: string;
  summary: string;
  undoable: boolean;
};
export type Conversation = {
  entries: ({ type: "comment"; comment: Comment } | { type: "change"; change: Line })[];
};
export type Image = { id: string; name: string; type: string };
export type InputRequest = {
  id: string;
  ticket: string;
  question: string;
  context: string;
  askedBy: string;
  askedByName: string;
  at: string;
  state: "awaiting" | "resolved" | "withdrawn";
  answer: string | null;
};
export type AgentReply = {
  id: string;
  toName: string;
  fromName: string;
  kind: "reply" | "comment" | "answer";
  ticket: string;
  text: string;
  at: string;
  state: "unread" | "acknowledged";
};
export type Change = {
  id: string;
  at: string;
  actor: string;
  summary: string;
  undoneBy: string | null;
  undoable: boolean;
};
export type Connection = {
  id: string;
  name: string;
  state: "pairing" | "connected" | "revoked";
  actor: string;
  actorName: string;
  may: "read" | "read and change";
};
export type Item = {
  id: string;
  project: string;
  title: string;
  text: string;
  original: { title: string; text: string };
  source: string;
  state: "received" | "accepted" | "rejected" | "dismissed" | "promoted" | "linked";
  tags: string[];
  category: string | null;
  fields: Record<string, string>;
  reason: string | null;
  ticket: string | null;
  at: string;
};
export type StepRun = {
  name: string;
  ran: boolean;
  reason: string;
  calls: { action: string; input: unknown; outcome: string }[];
};
export type Run = { id: string; at: string; ended: string; steps: StepRun[] };
export type Step = {
  id: string;
  name: string;
  kind: "classifier" | "local-model" | "hosted-model" | "script" | "app";
  actor: string;
  actions: string[];
  condition: Record<string, string> | null;
  config: Record<string, unknown>;
  on: boolean;
};

export type Outcome = {
  state: string;
  output?: unknown;
  card?: { html?: string };
  reason?: { message: string };
  error?: string;
};

export const OWNER = "owner";
export const KINDS: Record<Kind, string> = {
  todo: "to do",
  doing: "doing",
  waiting: "waiting",
  done: "done",
};
export const COLOURS: Colour[] = ["blue", "teal", "green", "amber", "purple", "pink"];

let onSignedOut = () => {};
export const whenSignedOut = (handler: () => void) => {
  onSignedOut = handler;
};

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: { "x-kit-request": "1", "content-type": "application/json" },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  if (response.status === 401 && path !== "/api/session") onSignedOut();
  return response.json() as Promise<T>;
}

export const call = (action: string, input: unknown = {}) =>
  api<Outcome>("/api/calls", {
    method: "POST",
    body: { id: globalThis.crypto.randomUUID?.(), action, input },
  });

/** Why a Call did not do what was asked, or null when it did. */
export function refusal(outcome: Outcome): string | null {
  if (outcome.state === "succeeded") return null;
  return outcome.reason?.message ?? outcome.error ?? `The Call was ${outcome.state}.`;
}

export const when = (at: string) =>
  new Date(at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
