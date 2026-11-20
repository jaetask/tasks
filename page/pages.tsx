// The screens that show things. Each is a page of panels from the toolkit;
// anything that is edited opens its own edit page (see edits.tsx).
import {
  EditLink,
  ListCard,
  ListRow,
  PageBody,
  PageLink,
  Panel,
  PrimaryLink,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Card } from "@jaetask/toolkit/ui/card";
import { Input } from "@jaetask/toolkit/ui/input";
import { useState } from "react";
import {
  type AgentReply,
  type Change,
  type Connection,
  type Feature,
  type InputRequest,
  KINDS,
  type Kind,
  type Overview,
  OWNER,
  type Project,
  type Ticket,
  when,
} from "./api.js";
import { actorLabel, narrowInput, useApp, useRead } from "./app.js";
import { Lane, Lanes, TicketCard, TicketDialog } from "./board.js";
import {
  ActorAvatar,
  LabelChip,
  Nothing,
  Picker,
  Pill,
  projectEmoji,
  Say,
  TabBar,
} from "./local.js";
import { StatusIcon } from "./pickers.js";

export const projectTitle = (p: Project, screen: string) =>
  `${projectEmoji(p)} ${p.name} · ${screen}`.trim();

/** A search box and the pickers that narrow a board, the Overview or a backlog. */
function NarrowBar({ features }: { features?: Feature[] }) {
  const { catalog, narrow, setNarrow } = useApp();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="Search tickets"
        placeholder="Search tickets…"
        className="max-w-64"
        value={narrow.text}
        onChange={(e) => setNarrow({ ...narrow, text: e.target.value })}
      />
      <Picker
        label="Assigned to"
        value={narrow.actor}
        onChange={(v) => setNarrow({ ...narrow, actor: v })}
        options={[
          { id: "", name: "Anyone" },
          { id: "none", name: "Nobody" },
          ...catalog.actors
            .filter((a) => !a.archived)
            .map((a) => ({ id: a.id, name: `${a.icon} ${a.name}`.trim() })),
        ]}
      />
      {features && features.length > 0 && (
        <Picker
          label="Feature"
          value={narrow.feature}
          onChange={(v) => setNarrow({ ...narrow, feature: v })}
          options={[
            { id: "", name: "Every feature" },
            { id: "none", name: "No feature" },
            ...features.map((f) => ({ id: f.id, name: f.name })),
          ]}
        />
      )}
    </div>
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
          <Nothing
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
    <PageBody
      wide
      title="Overview"
      line="Every project's tickets, lined up by what their column means. Drag a ticket to move it on its own board."
    >
      <NarrowBar />
      <Lanes label="Every project's tickets by kind">
        {(overview?.kinds ?? []).map(({ kind, tickets }) => (
          <Lane
            key={kind}
            id={`kind-${kind}`}
            title={KINDS[kind]}
            icon={<StatusIcon kind={kind} />}
            count={tickets.length}
            onDrop={(id) => drop(id, kind)}
          >
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} across />
            ))}
          </Lane>
        ))}
      </Lanes>
      <TicketDialog />
    </PageBody>
  );
}

export function FeaturesPage({ project }: { project: Project }) {
  const { go } = useApp();
  const [archived, setArchived] = useState(false);
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id, archived });
  return (
    <PageBody
      title={projectTitle(project, "Features")}
      line="A feature is one part of the project. It groups the tickets for that part."
      action={<PrimaryLink to={`/p/${project.id}/features/new`}>New feature</PrimaryLink>}
    >
      <Panel id="features" title="Features" line="Open one to rename, favourite or archive it.">
        <TabBar
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
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      go(`/p/${project.id}/board?feature=${encodeURIComponent(f.id)}`);
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
          <Nothing text="No features yet. Add one for each part of the project, such as Voice." />
        )}
      </Panel>
    </PageBody>
  );
}

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
    <PageBody
      title="Human input"
      line="Questions your agents asked you on a ticket. An agent waits for your answer before it goes on."
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
    </PageBody>
  );
}

export function SettingsPage({ onSignOut }: { onSignOut: () => void }) {
  const { catalog } = useApp();
  const owner = catalog.actors.find((a) => a.id === OWNER);
  return (
    <PageBody
      title="Settings"
      line="You, your agents' actors, your projects, your labels and your locations."
    >
      <Panel
        id="you"
        title="You"
        line="Your changes show under this name."
        action={<EditLink to="/settings/owner" />}
      >
        <Card className="p-4">
          <b>{`${owner?.icon ?? ""} ${owner?.name ?? ""}`.trim()}</b>
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
                  <b>{`${a.icon} ${a.name}`.trim()}</b>
                  {a.archived && <span className="tk-muted">archived</span>}
                </ListRow>
              ))}
          </ListCard>
        ) : (
          <Nothing text="No actors yet. Add one for each agent, such as Coder." />
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
                <b>{`${projectEmoji(p)} ${p.name}`.trim()}</b>
                <span className="tk-muted">{`${p.id}${p.archived ? " · archived" : ""}`}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Nothing text="No projects yet." />
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
          <Nothing text="No labels yet. Add one, such as bug." />
        )}
      </Panel>
      <Panel
        id="locations"
        title="Locations"
        line="Where a ticket's work is done, such as a machine."
        action={<PageLink to="/settings/locations/new">New location</PageLink>}
      >
        {catalog.locations.length > 0 ? (
          <ListCard>
            {catalog.locations.map((l) => (
              <ListRow key={l.id} to={`/settings/locations/${l.id}`}>
                <b>{l.name}</b>
                {l.archived && <span className="tk-muted">archived</span>}
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Nothing text="No locations yet. Add one for each place your agents work." />
        )}
      </Panel>
      <Panel id="session" title="This browser" line="Signing out ends this session only.">
        <Button variant="secondary" onClick={onSignOut}>
          Sign out
        </Button>
      </Panel>
    </PageBody>
  );
}
