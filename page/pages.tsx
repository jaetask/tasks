import {
  EmptyLine,
  Field,
  FormDialog,
  IconAction,
  ListCard,
  PageLink,
  RowMenu,
  TimeAgo,
  WorkPage,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Card } from "@jaetask/toolkit/ui/card";
import { Checkbox } from "@jaetask/toolkit/ui/checkbox";
import { Input } from "@jaetask/toolkit/ui/input";
import { IconCheck, IconCopy, IconPlugConnected } from "@tabler/icons-react";
import { useState } from "react";
import {
  type Actor,
  type AgentReply,
  type Change,
  type Connection,
  type InputRequest,
  OWNER,
  type Project,
  type Ticket,
} from "./api.js";
import { actorLabel, useApp, useRead } from "./app.js";
import { TicketDialog } from "./board.js";
import { ActorAvatar, Choice, DeleteForGood, Picker, Pill, Say, TabBar, Tick } from "./local.js";
import { TicketLine } from "./ticket-line.js";

export const projectTitle = (p: Project, screen: string) => `${p.name} · ${screen}`;

export function RequestCard({ request, link }: { request: InputRequest; link?: boolean }) {
  const { act } = useApp();
  return (
    <Card className="grid gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ActorAvatar id={request.askedBy} name={request.askedByName} />
        <b>{request.askedByName} asks</b>
        <span className="tk-muted">
          <TimeAgo at={request.at} />
        </span>
        {link && (
          <PageLink
            to={`/t/${request.ticket}`}
            surface="white"
          >{`Open ${request.ticket}`}</PageLink>
        )}
      </div>
      <p className="text">{request.question}</p>
      {request.context && <p className="tk-muted">{request.context}</p>}
      {request.state === "awaiting" ? (
        <Say
          label="Your answer"
          button="Answer"
          onSubmit={(answer) => act("input.input-resolve", { request: request.id, answer })}
        />
      ) : (
        <p className="tk-muted">
          {request.answer ? `You answered: ${request.answer}` : "Taken back."}
        </p>
      )}
    </Card>
  );
}

export function InputPage() {
  const { catalog } = useApp();
  const [state, setState] = useState<"awaiting" | "resolved">("awaiting");
  const [project, setProject] = useState("");
  const requests = useRead<InputRequest[]>("input.input-list", {
    state,
    ...(project ? { project } : {}),
  });
  return (
    <WorkPage
      title="Human input"
      help="Questions your agents asked you on a ticket. An agent waits for your answer before it goes on. Answer here, or on the ticket."
    >
      <div className="flex flex-wrap items-center gap-2">
        <TabBar
          label="Which questions"
          value={state}
          options={[
            { id: "awaiting", name: "Awaiting input" },
            { id: "resolved", name: "Resolved" },
          ]}
          onChange={setState}
        />
        <Picker
          label="Project"
          value={project}
          onChange={(v) => setProject(v)}
          options={[
            { id: "", name: "Every project" },
            ...catalog.projects.map((p) => ({ id: p.id, name: p.name })),
          ]}
        />
      </div>
      {requests && requests.length > 0 ? (
        <div className="grid max-w-4xl gap-3">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} link />
          ))}
        </div>
      ) : (
        <EmptyLine>
          {!requests
            ? ""
            : state === "awaiting"
              ? "No agent is waiting for you."
              : "Nothing here yet."}
        </EmptyLine>
      )}
    </WorkPage>
  );
}

const SAID = { reply: "replied to", comment: "commented on a ticket of", answer: "answered" };

export function RepliesPage() {
  const { catalog, act, go } = useApp();
  const [state, setState] = useState<"unread" | "acknowledged" | "all">("unread");
  const [actor, setActor] = useState("");
  const replies = useRead<AgentReply[]>("replies.reply-list", {
    ...(state === "all" ? {} : { state }),
    ...(actor ? { actor } : {}),
  });
  return (
    <WorkPage
      title="Agent inbox"
      help="What was said to your agents: replies to their comments, comments on their tickets, and your answers. An agent acknowledges each one when it has dealt with it."
    >
      <div className="flex flex-wrap items-center gap-2">
        <TabBar
          label="Which replies"
          value={state}
          options={[
            { id: "unread", name: "Unread" },
            { id: "acknowledged", name: "Acknowledged" },
            { id: "all", name: "All" },
          ]}
          onChange={setState}
        />
        <Picker
          label="Agent"
          value={actor}
          onChange={(v) => setActor(v)}
          options={[
            { id: "", name: "Every agent" },
            ...catalog.actors
              .filter((a) => a.id !== OWNER)
              .map((a) => ({ id: a.id, name: a.name })),
          ]}
        />
      </div>
      {replies && replies.length > 0 ? (
        <ListCard>
          {replies.map((r) => (
            <li key={r.id} className="tk-list-row group items-start">
              <Button
                variant="ghost"
                className="h-auto min-w-0 flex-1 flex-col items-start gap-1 whitespace-normal p-0 text-left font-normal hover:bg-transparent"
                onClick={() => go(`/t/${r.ticket}`)}
              >
                <span className="font-medium">{`${r.fromName} ${SAID[r.kind]} ${r.toName}`}</span>
                <span className="text">{r.text}</span>
                <span className="text-xs text-muted-foreground">
                  {`${r.ticket} · `}
                  <TimeAgo at={r.at} />
                </span>
              </Button>
              {r.state === "unread" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void act("replies.reply-acknowledge", { reply: r.id })}
                >
                  Acknowledge
                </Button>
              ) : (
                <Pill>acknowledged</Pill>
              )}
            </li>
          ))}
        </ListCard>
      ) : (
        <EmptyLine>{replies ? "Nothing here." : ""}</EmptyLine>
      )}
    </WorkPage>
  );
}

const PAGE = 50;

export function ArchivePage() {
  const { catalog, act } = useApp();
  const [state, setState] = useState<"all" | "archived" | "canceled">("all");
  const [text, setText] = useState("");
  const [project, setProject] = useState("");
  const [page, setPage] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const archived = useRead<Ticket[]>("tickets.ticket-find", { state: "archived" });
  const canceled = useRead<Ticket[]>("tickets.ticket-find", { state: "canceled" });
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const all = [...(archived ?? []), ...(canceled ?? [])]
    .filter((t) => state === "all" || t.state === state)
    .filter((t) => project === "" || t.project === project)
    .filter((t) => words.every((w) => `${t.id} ${t.title}`.toLowerCase().includes(w)));
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = all.slice(at * PAGE, at * PAGE + PAGE);
  const picked = chosen.filter((id) => all.some((t) => t.id === id));
  const every = shown.length > 0 && shown.every((t) => picked.includes(t.id));
  const narrow = (change: () => void) => {
    change();
    setPage(0);
  };
  const each = async (action: string) => {
    for (const ticket of picked) await act(action, { ticket });
    setChosen([]);
  };
  const named = `${picked.length} ${picked.length === 1 ? "ticket" : "tickets"}`;
  return (
    <WorkPage
      title="Archive"
      help="Archived and canceled tickets are kept here until you restore them. Open one to read it; tick some to restore them or delete them for good."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Search the archive"
          placeholder="Search the archive..."
          className="max-w-64"
          value={text}
          onChange={(e) => narrow(() => setText(e.target.value))}
        />
        <Picker
          label="Project"
          value={project}
          onChange={(v) => narrow(() => setProject(v))}
          options={[
            { id: "", name: "Every project" },
            ...catalog.projects.map((p) => ({ id: p.id, name: p.name })),
          ]}
        />
        <TabBar
          label="Which tickets"
          value={state}
          options={[
            { id: "all", name: "All" },
            { id: "archived", name: "Archived" },
            { id: "canceled", name: "Canceled" },
          ]}
          onChange={(v) => narrow(() => setState(v))}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {`${all.length} ${all.length === 1 ? "ticket" : "tickets"}`}
        </span>
      </div>
      {shown.length > 0 ? (
        <>
          <div className="flex min-h-8 flex-wrap items-center gap-2 text-xs">
            <Tick
              label={every ? "Untick this page" : "Tick this page"}
              checked={every}
              onChange={(on) =>
                setChosen(
                  on
                    ? [...new Set([...picked, ...shown.map((t) => t.id)])]
                    : picked.filter((id) => !shown.some((t) => t.id === id)),
                )
              }
            />
            {picked.length > 0 && (
              <>
                <span className="text-muted-foreground">{`${named} ticked`}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void each("tickets.ticket-restore")}
                >
                  Restore
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
                  Delete forever
                </Button>
              </>
            )}
          </div>
          <ListCard>
            {shown.map((t) => (
              <TicketLine
                key={t.id}
                ticket={t}
                status={false}
                lead={
                  <Checkbox
                    aria-label={`Tick ${t.id}`}
                    checked={picked.includes(t.id)}
                    onCheckedChange={(on) =>
                      setChosen(
                        on === true ? [...picked, t.id] : picked.filter((id) => id !== t.id),
                      )
                    }
                  />
                }
                aside={
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t.state === "canceled" ? "Canceled" : `Was in ${t.column.name}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => void act("tickets.ticket-restore", { ticket: t.id })}
                    >
                      Restore
                    </Button>
                  </span>
                }
              />
            ))}
          </ListCard>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>{`${at * PAGE + 1} to ${at * PAGE + shown.length} of ${all.length}`}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={at === 0}
                onClick={() => setPage(at - 1)}
              >
                Earlier
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={at >= pages - 1}
                onClick={() => setPage(at + 1)}
              >
                Later
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyLine>{archived && canceled ? "Nothing here." : ""}</EmptyLine>
      )}
      <DeleteForGood
        name={named}
        what={`The ${named} ticked, with their comments, images and files,`}
        label="Delete forever"
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={() => void each("tickets.ticket-delete")}
      />
      <TicketDialog />
    </WorkPage>
  );
}

const dayOf = (at: string) => {
  const date = new Date(at);
  const days = Math.round(
    (new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
};

export function ChangesPage() {
  const { catalog, act, go } = useApp();
  const [project, setProject] = useState("");
  const [actor, setActor] = useState("");
  const [ticket, setTicket] = useState("");
  const [imported, setImported] = useState(false);
  const [limit, setLimit] = useState(100);
  const wanted = ticket.trim().toUpperCase();
  const changes = useRead<Change[]>("history.change-list", {
    limit,
    ...(project ? { project } : {}),
    ...(actor ? { actor } : {}),
    ...(/^[A-Z]+-\d+$/.test(wanted) ? { ticket: wanted } : {}),
    ...(imported ? {} : { imported: false }),
  });
  const newest = [...(changes ?? [])].reverse();
  const days = [...new Set(newest.map((c) => dayOf(c.at)))];
  return (
    <WorkPage
      title="Changes"
      help="Every change, newest first, with who made it. Undo puts back what a change changed; point at a change to see it."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Picker
          label="Project"
          value={project}
          onChange={setProject}
          options={[
            { id: "", name: "Every project" },
            ...catalog.projects.map((p) => ({ id: p.id, name: p.name })),
          ]}
        />
        <Picker
          label="Actor"
          value={actor}
          onChange={setActor}
          options={[
            { id: "", name: "Everyone" },
            ...catalog.actors.map((a) => ({ id: a.id, name: a.name })),
          ]}
        />
        <Input
          aria-label="Ticket id"
          placeholder="Ticket id, such as TLK-12"
          className="max-w-52"
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
        />
        <span className="ml-auto">
          <Tick label="Show imported changes" checked={imported} onChange={setImported} />
        </span>
      </div>
      {newest.length === 0 && <EmptyLine>{changes ? "No change matches." : ""}</EmptyLine>}
      {days.map((day) => (
        <section key={day} aria-label={day} className="grid gap-1" id="changes">
          <h2 className="m-0 text-xs font-medium text-muted-foreground">{day}</h2>
          <ListCard>
            {newest
              .filter((c) => dayOf(c.at) === day)
              .map((c) => (
                <li key={c.id} className="tk-list-row group gap-3 py-2 text-sm">
                  <ActorAvatar id={c.actor} name={actorLabel(catalog, c.actor)} size={20} />
                  <span className={`min-w-0 flex-1 ${c.undoneBy ? "text-muted-foreground" : ""}`}>
                    <b className="font-medium">{actorLabel(catalog, c.actor)}</b> {c.summary}
                  </span>
                  {c.ticket && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                      onClick={() => go(`/changes?ticket=${c.ticket}`)}
                    >
                      Open
                    </Button>
                  )}
                  {c.undoable && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                      onClick={() => void act("history.change-undo", { change: c.id })}
                    >
                      Undo
                    </Button>
                  )}
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                    <TimeAgo at={c.at} />
                  </span>
                </li>
              ))}
          </ListCard>
        </section>
      ))}
      {changes && changes.length >= limit && limit < 500 && (
        <div>
          <Button variant="outline" size="sm" onClick={() => setLimit(Math.min(500, limit + 200))}>
            Show earlier changes
          </Button>
        </div>
      )}
      <TicketDialog />
    </WorkPage>
  );
}

function Copy({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Field label={label}>
      <span className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
          {text}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => {
            void navigator.clipboard?.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? <IconCheck size={16} aria-hidden /> : <IconCopy size={16} aria-hidden />}
        </Button>
      </span>
    </Field>
  );
}

function ApproveDialog({ connection, onClose }: { connection: Connection; onClose: () => void }) {
  const { catalog, act } = useApp();
  const agents = catalog.actors.filter((a) => a.id !== OWNER && !a.archived);
  const [actor, setActor] = useState(agents[0]?.id ?? "");
  const [name, setName] = useState("");
  const [may, setMay] = useState<"change" | "read">("change");
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Approve ${connection.name}`}
      line={`It asks to ${connection.may}. You choose what it may do and which actor it is.`}
      saveLabel="Approve"
      extra={
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            void act("connections.connection-revoke", { connection: connection.id }).then(
              (done) => done && onClose(),
            )
          }
        >
          Turn down
        </Button>
      }
      onSave={async () => {
        let as = actor;
        if (!as) {
          const made = await act<Actor>("catalog.actor-create", {
            name: name.trim() || connection.name,
          });
          if (!made) return false;
          as = made.id;
        }
        return (
          (await act("connections.connection-approve", {
            connection: connection.id,
            actor: as,
            change: may === "change",
          })) !== null
        );
      }}
    >
      <Field label="Acts as" hint="Its work shows under this actor." htmlFor="actor">
        <Picker
          id="actor"
          className="w-full"
          value={actor}
          onChange={setActor}
          options={[
            ...agents.map((a) => ({ id: a.id, name: a.name })),
            { id: "", name: "A new actor…" },
          ]}
        />
      </Field>
      {actor === "" && (
        <Field
          label="New actor's name"
          hint="Left empty, it takes the Connection's name."
          htmlFor="new"
        >
          <Input id="new" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
      )}
      <Field label="It may">
        <Choice
          label="It may"
          value={may}
          options={[
            { id: "change", name: "Read and change" },
            { id: "read", name: "Only read" },
          ]}
          onChange={setMay}
        />
      </Field>
    </FormDialog>
  );
}

export function ConnectionsPage() {
  const { act } = useApp();
  const connections = useRead<Connection[]>("connections.connection-list");
  const [approving, setApproving] = useState<string | null>(null);
  const [how, setHow] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const waiting = (connections ?? []).filter((c) => c.state === "pairing");
  const rest = (connections ?? []).filter(
    (c) => c.state === "connected" || (revoked && c.state === "revoked"),
  );
  const asked = waiting.find((c) => c.id === approving);
  return (
    <WorkPage
      title="Connections"
      help="An agent connects once, with your OK. You choose what it may do and which actor it is. A request you do not approve expires after 10 minutes."
      action={
        <IconAction
          label="How an agent connects"
          icon={<IconPlugConnected aria-hidden />}
          onClick={() => setHow(true)}
        />
      }
    >
      {waiting.length > 0 && (
        <section aria-label="Waiting for you" className="grid gap-1">
          <h2 className="m-0 text-xs font-medium text-muted-foreground">Waiting for you</h2>
          <ListCard>
            {waiting.map((c) => (
              <li key={c.id} className="tk-list-row">
                <span className="min-w-0 flex-1 font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{`asks to ${c.may}`}</span>
                <Button size="sm" onClick={() => setApproving(c.id)}>
                  Approve
                </Button>
              </li>
            ))}
          </ListCard>
        </section>
      )}
      <Tick label="Show revoked" checked={revoked} onChange={setRevoked} />
      {rest.length > 0 ? (
        <ListCard>
          {rest.map((c) => (
            <li key={c.id} className="tk-list-row" data-state={c.state}>
              <ActorAvatar id={c.actor} name={c.actorName} />
              <span
                className={`min-w-0 flex-1 font-medium ${c.state === "revoked" ? "opacity-60" : ""}`}
              >
                {c.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {`acts as ${c.actorName} · may ${c.may}`}
              </span>
              {c.state === "connected" ? (
                <RowMenu
                  label={`Connection ${c.name}`}
                  items={[
                    {
                      label: "Revoke",
                      onSelect: () =>
                        void act("connections.connection-revoke", { connection: c.id }),
                    },
                  ]}
                />
              ) : (
                <Pill>revoked</Pill>
              )}
            </li>
          ))}
        </ListCard>
      ) : (
        <EmptyLine>{connections ? "Nothing is connected." : ""}</EmptyLine>
      )}
      {asked && (
        <ApproveDialog key={asked.id} connection={asked} onClose={() => setApproving(null)} />
      )}
      <FormDialog
        open={how}
        onOpenChange={setHow}
        title="How an agent connects"
        line="The agent asks to connect at the first address and shows up here, waiting for you. Once you approve it, it collects its key and uses the second address."
        saveLabel="Done"
        onSave={() => true}
      >
        <Copy label="Asks to connect at" text={`${window.location.origin}/pair`} />
        <Copy label="Then calls" text={`${window.location.origin}/mcp`} />
      </FormDialog>
    </WorkPage>
  );
}
