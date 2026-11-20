// The screens that show things. Each is a page of panels from the toolkit;
// anything that is edited opens its own edit page (see edits.tsx).
import {
  Avatar,
  Board,
  Button,
  Card,
  Chip,
  Column,
  EditLink,
  EmptyCard,
  FilterBar,
  ListCard,
  ListRow,
  PageBody,
  PageLink,
  Panel,
  PrimaryLink,
  SearchInput,
  Select,
  Tabs,
} from "@jaetask/toolkit";
import { useState } from "react";
import {
  type AgentReply,
  type Board as BoardData,
  type Change,
  type Connection,
  type Feature,
  type InputRequest,
  KINDS,
  type Kind,
  OWNER,
  type Overview,
  type Project,
  type Ticket,
  when,
} from "./api.js";
import { actorName, narrowInput, useApp, useRead } from "./app.js";
import { KindChip, LabelChip, Say, TicketRow } from "./local.js";

export const projectTitle = (p: Project, screen: string) =>
  `${p.icon} ${p.name} · ${screen}`.trim();

/** A search box and the pickers that narrow a board, the Overview or a backlog. */
function NarrowBar({ features }: { features?: Feature[] }) {
  const { catalog, narrow, setNarrow } = useApp();
  return (
    <FilterBar label="Narrow the tickets">
      <SearchInput
        label="Search tickets"
        placeholder="Search tickets"
        value={narrow.text}
        onChange={(text) => setNarrow({ ...narrow, text })}
      />
      <Select
        aria-label="Assigned to"
        value={narrow.actor}
        onChange={(e) => setNarrow({ ...narrow, actor: e.target.value })}
      >
        <option value="">Anyone</option>
        <option value="none">Nobody</option>
        {catalog.actors
          .filter((a) => !a.archived)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
      </Select>
      {features && features.length > 0 && (
        <Select
          aria-label="Feature"
          value={narrow.feature}
          onChange={(e) => setNarrow({ ...narrow, feature: e.target.value })}
        >
          <option value="">Every feature</option>
          <option value="none">No feature</option>
          {features.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      )}
    </FilterBar>
  );
}

export function OverviewPage() {
  const { catalog, narrow, act } = useApp();
  const projects = catalog.projects.filter((p) => !p.archived);
  const overview = useRead<Overview>("tickets.overview-read", narrowInput(narrow, false));
  if (projects.length === 0) {
    return (
      <PageBody
        title="Overview"
        line="Every project's tickets, lined up by what their column means."
      >
        <Panel id="start" title="Projects" line="A project is a body of work, such as an app.">
          <EmptyCard
            text="Create your first project to get a board."
            action={<PageLink to="/settings/projects/new">Create a project</PageLink>}
          />
        </Panel>
      </PageBody>
    );
  }
  // Dropping a ticket on a kind moves it to its own board's first column of that kind.
  const drop = (id: string, kind: Kind) => {
    const project = projects.find((p) => id.startsWith(`${p.id}-`));
    const column = project?.columns.find((c) => c.kind === kind);
    if (column) void act("tickets.ticket-move", { ticket: id, column: column.id });
  };
  return (
    <PageBody title="Overview" line="Every project's tickets, lined up by what their column means.">
      <Panel id="overview" title="All projects" line="Drag a ticket to move it on its own board.">
        <NarrowBar />
        <Board label="Every project's tickets by kind">
          {(overview?.kinds ?? []).map(({ kind, tickets }) => (
            <Column
              key={kind}
              id={`kind-${kind}`}
              title={KINDS[kind as Kind]}
              count={tickets.length}
              empty="No tickets."
              onDrop={(ticket) => drop(ticket, kind)}
            >
              {tickets.map((t) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </Column>
          ))}
        </Board>
      </Panel>
    </PageBody>
  );
}

export function BoardPage({ project }: { project: Project }) {
  const { narrow, act } = useApp();
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id });
  const board = useRead<BoardData>("tickets.board-read", {
    project: project.id,
    ...narrowInput(narrow, true),
  });
  const missing = (Object.keys(KINDS) as Kind[]).filter(
    (k) => !project.columns.some((c) => c.kind === k),
  );
  const warn: Record<Kind, string> = {
    todo: "no to-do column, so new tickets have nowhere to start",
    doing: "no doing column, so agents cannot claim tickets",
    waiting: "no waiting column, so asking for review moves nothing",
    done: "no done column, so nothing counts as finished",
  };
  return (
    <PageBody
      title={projectTitle(project, "Board")}
      line="Tickets move through the columns as they are worked on."
      action={<PrimaryLink to={`/p/${project.id}/new`}>New ticket</PrimaryLink>}
    >
      <Panel
        id="board"
        title="Board"
        line={
          missing.length > 0
            ? `This board has ${missing.map((k) => warn[k]).join("; ")}.`
            : "Drag a ticket to another column, or open it."
        }
        action={<EditLink to={`/p/${project.id}/columns`} label="Edit columns" />}
      >
        <NarrowBar features={features ?? []} />
        <Board label={`The board of ${project.name}`}>
          {(board?.columns ?? []).map((c) => (
            <Column
              key={c.id}
              id={`column-${c.id}`}
              title={c.name}
              kind={<KindChip kind={c.kind} />}
              count={c.tickets.length}
              empty="No tickets."
              onDrop={(ticket) => void act("tickets.ticket-move", { ticket, column: c.id })}
            >
              {c.tickets.map((t) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </Column>
          ))}
        </Board>
      </Panel>
    </PageBody>
  );
}

export function BacklogPage({ project }: { project: Project }) {
  const { narrow, act } = useApp();
  const tickets = useRead<Ticket[]>("tickets.backlog-read", {
    project: project.id,
    ...narrowInput(narrow, false),
  });
  return (
    <PageBody
      title={projectTitle(project, "Backlog")}
      line="Tickets wait here until you put them on the board. Agents looking for work do not see them."
      action={<PrimaryLink to={`/p/${project.id}/new?backlog=1`}>New ticket</PrimaryLink>}
    >
      <Panel id="backlog" title="Backlog" line="Oldest first.">
        <NarrowBar />
        {tickets && tickets.length > 0 ? (
          <ListCard>
            {tickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                aside={
                  <Button
                    surface="white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void act("tickets.ticket-board-send", { ticket: t.id });
                    }}
                  >
                    To the board
                  </Button>
                }
              />
            ))}
          </ListCard>
        ) : (
          <EmptyCard text="The backlog is empty. A new ticket made here waits until you put it on the board." />
        )}
      </Panel>
    </PageBody>
  );
}

export function FeaturesPage({ project }: { project: Project }) {
  const { narrow, setNarrow, go } = useApp();
  const [archived, setArchived] = useState(false);
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id, archived });
  return (
    <PageBody
      title={projectTitle(project, "Features")}
      line="A feature is one part of the project. It groups the tickets for that part."
      action={<PrimaryLink to={`/p/${project.id}/features/new`}>New feature</PrimaryLink>}
    >
      <Panel id="features" title="Features" line="Open one to rename, favourite or archive it.">
        <Tabs
          label="Which features"
          value={archived ? "all" : "active"}
          options={[
            { id: "active", name: "Active" },
            { id: "all", name: "With archived" },
          ]}
          onChange={(v) => setArchived(v === "all")}
        />
        {features && features.length > 0 ? (
          <ListCard>
            {features.map((f) => (
              <ListRow
                key={f.id}
                to={`/p/${project.id}/features/${f.id}`}
                aside={
                  <Button
                    surface="white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNarrow({ ...narrow, feature: f.id });
                      go(`/p/${project.id}/board`);
                    }}
                  >
                    On the board
                  </Button>
                }
              >
                <b>
                  {f.favourite ? "★ " : ""}
                  {f.name}
                </b>
                <span className="tk-muted">
                  {f.tickets} open{f.archived ? " · archived" : ""}
                  {f.description ? ` · ${f.description}` : ""}
                </span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <EmptyCard text="No features yet. Add one for each part of the project, such as Voice." />
        )}
      </Panel>
    </PageBody>
  );
}

/** One question an agent asked, with the place to answer it while it waits. */
export function RequestCard({ request, link }: { request: InputRequest; link?: boolean }) {
  const { act } = useApp();
  return (
    <Card className="request">
      <div className="who">
        <Avatar name={request.askedByName || "?"} />
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
    <PageBody
      title="Human input"
      line="Questions your agents asked you on a ticket. An agent waits for your answer before it goes on."
    >
      <Panel id="input" title="Questions" line="Answer here, or on the ticket.">
        <FilterBar>
          <Tabs
            label="Which questions"
            value={state}
            options={[
              { id: "awaiting", name: "Awaiting input" },
              { id: "resolved", name: "Resolved" },
            ]}
            onChange={setState}
          />
          <Select aria-label="Project" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Every project</option>
            {catalog.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FilterBar>
        {requests && requests.length > 0 ? (
          <>
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} link />
            ))}
          </>
        ) : (
          <EmptyCard
            text={state === "awaiting" ? "No agent is waiting for you." : "Nothing here yet."}
          />
        )}
      </Panel>
    </PageBody>
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
    <PageBody
      title="Agent inbox"
      line="What was said to your agents: replies to their comments, comments on their tickets, and your answers."
    >
      <Panel
        id="replies"
        title="Replies"
        line="An agent acknowledges each one when it has dealt with it."
      >
        <FilterBar>
          <Tabs
            label="Which replies"
            value={state}
            options={[
              { id: "unread", name: "Unread" },
              { id: "acknowledged", name: "Acknowledged" },
              { id: "all", name: "All" },
            ]}
            onChange={setState}
          />
          <Select aria-label="Agent" value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="">Every agent</option>
            {catalog.actors
              .filter((a) => a.id !== OWNER)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>
        </FilterBar>
        {replies && replies.length > 0 ? (
          <ListCard>
            {replies.map((r) => (
              <ListRow
                key={r.id}
                to={`/t/${r.ticket}`}
                aside={
                  r.state === "unread" ? (
                    <Button
                      surface="white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void act("replies.reply-acknowledge", { reply: r.id });
                      }}
                    >
                      Acknowledge
                    </Button>
                  ) : (
                    <Chip>acknowledged</Chip>
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
          <EmptyCard text="Nothing here." />
        )}
      </Panel>
    </PageBody>
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
    <PageBody
      title="Archive"
      line="Archived and canceled tickets are kept here until you restore them."
    >
      <Panel
        id="archive"
        title="Tickets"
        line="Open one to read it, restore it or delete it for good."
      >
        <Tabs
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
                    surface="white"
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
          <EmptyCard text="Nothing here." />
        )}
      </Panel>
    </PageBody>
  );
}

export function ChangesPage() {
  const { catalog, act } = useApp();
  const changes = useRead<Change[]>("history.change-list", { limit: 200 });
  return (
    <PageBody title="Changes" line="Every change, newest first, with who made it.">
      <Panel id="changes" title="Changes" line="Undo puts back what a change changed.">
        <ListCard>
          {[...(changes ?? [])].reverse().map((c) => (
            <ListRow
              key={c.id}
              aside={
                c.undoable ? (
                  <Button
                    surface="white"
                    onClick={() => void act("history.change-undo", { change: c.id })}
                  >
                    Undo
                  </Button>
                ) : undefined
              }
            >
              <span className={c.undoneBy ? "tk-muted" : ""}>
                <b>{actorName(catalog, c.actor)}</b> {c.summary}
              </span>
              <span className="tk-muted">{when(c.at)}</span>
            </ListRow>
          ))}
        </ListCard>
      </Panel>
    </PageBody>
  );
}

export function ConnectionsPage() {
  const { act } = useApp();
  const connections = useRead<Connection[]>("connections.connection-list") ?? [];
  const waiting = connections.filter((c) => c.state === "pairing");
  const rest = connections.filter((c) => c.state !== "pairing");
  return (
    <PageBody
      title="Connections"
      line="An agent connects once, with your OK. You choose what it may do and which actor it is."
    >
      <Panel
        id="waiting"
        title="Waiting for you"
        line="A request you do not approve expires after 10 minutes."
      >
        {waiting.length > 0 ? (
          <ListCard>
            {waiting.map((c) => (
              <ListRow key={c.id} to={`/connections/${c.id}`} aside={<Chip>Approve</Chip>}>
                <b>{c.name}</b>
                <span className="tk-muted">{`asks to ${c.may}`}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <EmptyCard text="No agent is asking to connect." />
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
                      surface="white"
                      variant="danger"
                      onClick={() =>
                        void act("connections.connection-revoke", { connection: c.id })
                      }
                    >
                      Revoke
                    </Button>
                  ) : (
                    <Chip>revoked</Chip>
                  )
                }
              >
                <b>{c.name}</b>
                <span className="tk-muted">{`acts as ${c.actorName} · may ${c.may}`}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <EmptyCard text="Nothing is connected yet." />
        )}
      </Panel>
    </PageBody>
  );
}

export function SettingsPage({ onSignOut }: { onSignOut: () => void }) {
  const { catalog } = useApp();
  const owner = catalog.actors.find((a) => a.id === OWNER);
  return (
    <PageBody title="Settings" line="You, your agents' actors, your projects and your labels.">
      <Panel
        id="you"
        title="You"
        line="Your changes show under this name."
        action={<EditLink to="/settings/owner" />}
      >
        <Card>
          <b>{owner?.name}</b>
        </Card>
      </Panel>
      <Panel
        id="actors"
        title="Actors"
        line="One for each of your agents. Every change shows its actor."
        action={<PageLink to="/settings/actors/new">Add actor</PageLink>}
      >
        {catalog.actors.length > 1 ? (
          <ListCard>
            {catalog.actors
              .filter((a) => a.id !== OWNER)
              .map((a) => (
                <ListRow key={a.id} to={`/settings/actors/${a.id}`}>
                  <b>{a.name}</b>
                  {a.archived && <span className="tk-muted">archived</span>}
                </ListRow>
              ))}
          </ListCard>
        ) : (
          <EmptyCard text="No actors yet. Add one for each agent, such as Coder." />
        )}
      </Panel>
      <Panel
        id="projects"
        title="Projects"
        line="Each has its own board, backlog, features and inbox."
        action={<PageLink to="/settings/projects/new">New project</PageLink>}
      >
        {catalog.projects.length > 0 ? (
          <ListCard>
            {catalog.projects.map((p) => (
              <ListRow key={p.id} to={`/p/${p.id}/edit`}>
                <b>{`${p.icon} ${p.name}`.trim()}</b>
                <span className="tk-muted">{`${p.id}${p.archived ? " · archived" : ""}`}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <EmptyCard text="No projects yet." />
        )}
      </Panel>
      <Panel
        id="labels"
        title="Labels"
        line="Coloured tags for tickets."
        action={<PageLink to="/settings/labels/new">New label</PageLink>}
      >
        {catalog.labels.length > 0 ? (
          <ListCard>
            {catalog.labels.map((l) => (
              <ListRow key={l.id} to={`/settings/labels/${l.id}`}>
                <LabelChip label={l} />
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <EmptyCard text="No labels yet. Add one, such as bug." />
        )}
      </Panel>
      <Panel id="session" title="This browser" line="Signing out ends this session only.">
        <Button onClick={onSignOut}>Sign out</Button>
      </Panel>
    </PageBody>
  );
}
