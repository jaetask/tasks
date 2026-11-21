// The screens that show things. Each is a page of panels from the toolkit;
// anything that is edited opens its own edit page (see edits.tsx).
import { ListCard, ListRow, WorkPage, PageLink, Panel } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Card } from "@jaetask/toolkit/ui/card";
import { useState } from "react";
import {
  type AgentReply,
  type Change,
  type Connection,
  type InputRequest,
  OWNER,
  type Project,
  type Ticket,
  when,
} from "./api.js";
import { actorLabel, useApp, useRead } from "./app.js";
import { ActorAvatar, Nothing, Picker, Pill, Say, TabBar } from "./local.js";

export const projectTitle = (p: Project, screen: string) => `${p.name} · ${screen}`;

/** One question an agent asked, with the place to answer it while it waits. */
export function RequestCard({ request, link }: { request: InputRequest; link?: boolean }) {
  const { act } = useApp();
  return (
    <Card className="grid gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ActorAvatar id={request.askedBy} name={request.askedByName} />
        <b>{request.askedByName} asks</b>
        <span className="tk-muted">{when(request.at)}</span>
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
      help="Questions your agents asked you on a ticket. An agent waits for your answer before it goes on."
    >
      <Panel id="input" title="Questions" line="Answer here, or on the ticket.">
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
          requests.map((r) => <RequestCard key={r.id} request={r} link />)
        ) : (
          <Nothing
            text={state === "awaiting" ? "No agent is waiting for you." : "Nothing here yet."}
          />
        )}
      </Panel>
    </WorkPage>
  );
}

const SAID = { reply: "replied to", comment: "commented on a ticket of", answer: "answered" };

export function RepliesPage() {
  const { catalog, act } = useApp();
  const [state, setState] = useState<"unread" | "acknowledged" | "all">("unread");
  const [actor, setActor] = useState("");
  const replies = useRead<AgentReply[]>("replies.reply-list", {
    ...(state === "all" ? {} : { state }),
    ...(actor ? { actor } : {}),
  });
  return (
    <WorkPage
      title="Agent inbox"
      help="What was said to your agents: replies to their comments, comments on their tickets, and your answers."
    >
      <Panel
        id="replies"
        title="Replies"
        line="An agent acknowledges each one when it has dealt with it."
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
              <ListRow
                key={r.id}
                to={`/t/${r.ticket}`}
                aside={
                  r.state === "unread" ? (
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void act("replies.reply-acknowledge", { reply: r.id });
                      }}
                    >
                      Acknowledge
                    </Button>
                  ) : (
                    <Pill>acknowledged</Pill>
                  )
                }
              >
                <b>{`${r.fromName} ${SAID[r.kind]} ${r.toName}`}</b>
                <span className="text">{r.text}</span>
                <span className="tk-muted">{`${r.ticket} · ${when(r.at)}`}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Nothing text="Nothing here." />
        )}
      </Panel>
    </WorkPage>
  );
}

export function ArchivePage() {
  const { act } = useApp();
  const [state, setState] = useState<"all" | "archived" | "canceled">("all");
  const archived = useRead<Ticket[]>("tickets.ticket-find", { state: "archived" });
  const canceled = useRead<Ticket[]>("tickets.ticket-find", { state: "canceled" });
  const all = [...(archived ?? []), ...(canceled ?? [])].filter(
    (t) => state === "all" || t.state === state,
  );
  return (
    <WorkPage
      title="Archive"
      help="Archived and canceled tickets are kept here until you restore them."
    >
      <Panel
        id="archive"
        title="Tickets"
        line="Open one to read it, restore it or delete it for good."
      >
        <TabBar
          label="Which tickets"
          value={state}
          options={[
            { id: "all", name: "All" },
            { id: "archived", name: "Archived" },
            { id: "canceled", name: "Canceled" },
          ]}
          onChange={setState}
        />
        {all.length > 0 ? (
          <ListCard>
            {all.map((t) => (
              <ListRow
                key={t.id}
                to={`/t/${t.id}`}
                aside={
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void act("tickets.ticket-restore", { ticket: t.id });
                    }}
                  >
                    Restore
                  </Button>
                }
              >
                <b>{t.title}</b>
                <span className="tk-muted">{`${t.id} · ${t.state} · was in ${t.column.name}`}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Nothing text="Nothing here." />
        )}
      </Panel>
    </WorkPage>
  );
}

export function ChangesPage() {
  const { catalog, act } = useApp();
  const changes = useRead<Change[]>("history.change-list", { limit: 200 });
  return (
    <WorkPage title="Changes" help="Every change, newest first, with who made it.">
      <Panel id="changes" title="Changes" line="Undo puts back what a change changed.">
        <ListCard>
          {[...(changes ?? [])].reverse().map((c) => (
            <ListRow
              key={c.id}
              aside={
                c.undoable ? (
                  <Button
                    variant="secondary"
                    onClick={() => void act("history.change-undo", { change: c.id })}
                  >
                    Undo
                  </Button>
                ) : undefined
              }
            >
              <span className={c.undoneBy ? "tk-muted" : ""}>
                <b>{actorLabel(catalog, c.actor)}</b> {c.summary}
              </span>
              <span className="tk-muted">{when(c.at)}</span>
            </ListRow>
          ))}
        </ListCard>
      </Panel>
    </WorkPage>
  );
}

export function ConnectionsPage() {
  const { act } = useApp();
  const connections = useRead<Connection[]>("connections.connection-list") ?? [];
  const waiting = connections.filter((c) => c.state === "pairing");
  const rest = connections.filter((c) => c.state !== "pairing");
  return (
    <WorkPage
      title="Connections"
      help="An agent connects once, with your OK. You choose what it may do and which actor it is."
    >
      <Panel
        id="waiting"
        title="Waiting for you"
        line="A request you do not approve expires after 10 minutes."
      >
        {waiting.length > 0 ? (
          <ListCard>
            {waiting.map((c) => (
              <ListRow key={c.id} to={`/connections/${c.id}`} aside={<Pill>Approve</Pill>}>
                <b>{c.name}</b>
                <span className="tk-muted">{`asks to ${c.may}`}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Nothing text="No agent is asking to connect." />
        )}
      </Panel>
      <Panel
        id="connected"
        title="Connections"
        line={`An agent asks to connect at ${window.location.origin}/pair and then uses ${window.location.origin}/mcp with the key it collects.`}
      >
        {rest.length > 0 ? (
          <ListCard>
            {rest.map((c) => (
              <ListRow
                key={c.id}
                aside={
                  c.state === "connected" ? (
                    <Button
                      variant="destructive"
                      onClick={() =>
                        void act("connections.connection-revoke", { connection: c.id })
                      }
                    >
                      Revoke
                    </Button>
                  ) : (
                    <Pill>revoked</Pill>
                  )
                }
              >
                <b>{c.name}</b>
                <span className="tk-muted">{`acts as ${c.actorName} · may ${c.may}`}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Nothing text="Nothing is connected yet." />
        )}
      </Panel>
    </WorkPage>
  );
}
