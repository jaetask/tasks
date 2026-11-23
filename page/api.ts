export type Kind = "todo" | "doing" | "waiting" | "done";
export type Colour = "blue" | "teal" | "green" | "amber" | "purple" | "pink";
export type Actor = { id: string; name: string; icon: string; colour: string; archived: boolean };
export type Usage = {
  labels: Record<string, number>;
  projects: Record<string, number>;
  actors: Record<string, number>;
  locations: Record<string, number>;
};
export type Location = { id: string; name: string; archived: boolean };
export type Column = { id: string; name: string; kind: Kind };
export type Project = {
  id: string;
  name: string;
  icon: string;
  colour: string;
  archived: boolean;
  columns: Column[];
  card: string[];
  ordering: "created" | "priority" | "due" | "updated";
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
  type: "task" | "bug" | "improvement" | "specification";
  priority: "none" | "urgent" | "high" | "medium" | "low";
  links: { id: string; url: string; title: string; description: string }[];
  due: string | null;
  evidence: {
    kind: "code" | "non-code";
    summary: string;
    checks: string;
    pullRequest?: string;
    mergeCommit?: string;
  } | null;
  reactions: { emoji: string; actors: string[] }[];
  location: string | null;
  locationName: string;
  labels: Label[];
  blocked: string | null;
  state: "open" | "archived" | "canceled";
  backlog: boolean;
  comments: number;
  images: number;
  awaiting: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  columnSince: string;
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
  left: number;
  done: number;
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
  resolved: boolean;
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
  undone: boolean;
};
export type Conversation = {
  entries: ({ type: "comment"; comment: Comment } | { type: "change"; change: Line })[];
};
export type Image = { id: string; name: string; type: string };
export type TicketFile = {
  id: string;
  ticket: string;
  name: string;
  type: string;
  size: number;
  by: string;
  at: string;
};

export async function uploadFile(ticket: string, file: File): Promise<Outcome | { error: string }> {
  const response = await fetch(
    `/api/files?ticket=${encodeURIComponent(ticket)}&name=${encodeURIComponent(file.name || "pasted file")}`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "x-kit-request": "1",
        "content-type": file.type || "application/octet-stream",
      },
      body: file,
    },
  );
  return response.json() as Promise<Outcome | { error: string }>;
}
export type TicketStep = {
  id: string;
  ticket: string;
  title: string;
  done: boolean;
  notes: { id: string; text: string; at: string; by: string; byName: string }[];
};
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
  ticket: string | null;
  imported: boolean;
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
  changes?: { kind: "created" | "updated" | "deleted"; subject: string; id: string }[];
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
  return response.json() as Promise<T>;
}

export const call = (action: string, input: unknown = {}) =>
  api<Outcome>("/api/calls", {
    method: "POST",
    body: { id: globalThis.crypto.randomUUID?.(), action, input },
  });

export function refusal(outcome: Outcome): string | null {
  if (outcome.state === "succeeded") return null;
  return outcome.reason?.message ?? outcome.error ?? `The Call was ${outcome.state}.`;
}

export const when = (at: string) =>
  new Date(at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export const TYPES = ["task", "bug", "improvement", "specification"] as const;
export const PRIORITIES = ["none", "urgent", "high", "medium", "low"] as const;
