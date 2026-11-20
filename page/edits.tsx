// The edit pages. Every one is the toolkit's EditFrame: Back at the top,
// labelled rows, then Cancel and Save, which both return to where you were.
import {
  DEFAULT_PROJECT_COLOUR,
  EditFrame,
  ProjectIconPicker,
  Row,
  useBackTo,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import { type ReactNode, useState } from "react";
import {
  type Actor,
  type Column,
  type Connection,
  type Feature,
  KINDS,
  type Kind,
  type Label,
  OWNER,
  type Project,
  type Step,
  type Ticket,
} from "./api.js";
import { useApp, useRead } from "./app.js";
import { CONDITIONS } from "./inbox.js";
import { Choice, Choices, Picker, projectLook } from "./local.js";

/** Runs the changes of a Save; goes back only if none was refused. */
function useSave(back: string) {
  const { go } = useApp();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    save: async (work: () => Promise<boolean>) => {
      setBusy(true);
      const done = await work();
      setBusy(false);
      if (done) go(back);
    },
  };
}

export function OwnerEdit() {
  const { catalog, act } = useApp();
  const back = useBackTo("/settings");
  const { busy, save } = useSave(back);
  const owner = catalog.actors.find((a) => a.id === OWNER);
  const [name, setName] = useState(owner?.name ?? "");
  const [icon, setIcon] = useState(owner?.icon ?? "");
  return (
    <EditFrame
      title="Edit your name"
      backTo={back}
      busy={busy}
      onSave={() =>
        save(async () => {
          if (name !== owner?.name) {
            if ((await act("catalog.actor-rename", { actor: OWNER, name })) === null) return false;
          }
          if (icon.trim() !== (owner?.icon ?? "")) {
            await act("catalog.actor-icon-set", { actor: OWNER, icon });
          }
          return true;
        })
      }
    >
      <Row title="Name" line="Your changes show under this name." htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Row>
      <Row title="Icon" line="An emoji shown beside the name. Leave empty for none." htmlFor="icon">
        <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={16} />
      </Row>
    </EditFrame>
  );
}

export function ActorEdit({ id }: { id: string | null }) {
  const { catalog, act, go } = useApp();
  const back = useBackTo("/settings");
  const { busy, save } = useSave(back);
  const actor = catalog.actors.find((a) => a.id === id) as Actor | undefined;
  const [name, setName] = useState(actor?.name ?? "");
  const [icon, setIcon] = useState(actor?.icon ?? "");
  return (
    <EditFrame
      title={actor ? `Edit ${actor.name}` : "Add an actor"}
      line="An actor is the name an agent's work shows under. A Connection acts as an actor."
      backTo={back}
      busy={busy}
      saveLabel={actor ? "Save" : "Add actor"}
      onSave={() =>
        save(async () => {
          if (!actor) return (await act("catalog.actor-create", { name, icon })) !== null;
          if (name !== actor.name) {
            if ((await act("catalog.actor-rename", { actor: actor.id, name })) === null)
              return false;
          }
          if (icon.trim() !== actor.icon) {
            await act("catalog.actor-icon-set", { actor: actor.id, icon });
          }
          return true;
        })
      }
      {...(actor
        ? {
            extra: (
              <Button
                variant="secondary"
                onClick={() =>
                  void act(actor.archived ? "catalog.actor-restore" : "catalog.actor-archive", {
                    actor: actor.id,
                  }).then((done) => done && go(back))
                }
              >
                {actor.archived ? "Restore" : "Archive"}
              </Button>
            ),
          }
        : {})}
    >
      <Row title="Name" line="Such as Coder or Reviewer." htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Row>
      <Row title="Icon" line="An emoji shown beside the name. Leave empty for none." htmlFor="icon">
        <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={16} />
      </Row>
    </EditFrame>
  );
}

export function LocationEdit({ id }: { id: string | null }) {
  const { catalog, act, go } = useApp();
  const back = useBackTo("/settings");
  const { busy, save } = useSave(back);
  const location = catalog.locations.find((l) => l.id === id);
  const [name, setName] = useState(location?.name ?? "");
  return (
    <EditFrame
      title={location ? `Edit the location ${location.name}` : "New location"}
      line="A place where a ticket's work is done, such as a machine. A ticket has one or none."
      backTo={back}
      busy={busy}
      saveLabel={location ? "Save" : "Add location"}
      onSave={() =>
        save(async () =>
          location
            ? name === location.name ||
              (await act("catalog.location-rename", { location: location.id, name })) !== null
            : (await act("catalog.location-create", { name })) !== null,
        )
      }
      {...(location
        ? {
            extra: (
              <Button
                variant="secondary"
                onClick={() =>
                  void act(
                    location.archived ? "catalog.location-restore" : "catalog.location-archive",
                    { location: location.id },
                  ).then((done) => done && go(back))
                }
              >
                {location.archived ? "Restore" : "Archive"}
              </Button>
            ),
          }
        : {})}
    >
      <Row title="Name" line="Shown on tickets." htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Row>
    </EditFrame>
  );
}

export function ProjectEdit({ project }: { project: Project | null }) {
  const { catalog, act, go } = useApp();
  const back = useBackTo("/settings");
  const { busy, save } = useSave(back);
  const [name, setName] = useState(project?.name ?? "");
  const [prefix, setPrefix] = useState("");
  const look = projectLook(project ?? { icon: "folder", colour: DEFAULT_PROJECT_COLOUR });
  const [icon, setIcon] = useState(look.projectIcon);
  const [colour, setColour] = useState(look.iconColour);
  const order = catalog.projects.map((p) => p.id);
  const at = project ? order.indexOf(project.id) : -1;
  return (
    <EditFrame
      title={project ? `Edit ${project.name}` : "New project"}
      line="A project is a body of work, such as an app. It has its own board, backlog, features and inbox."
      backTo={back}
      busy={busy}
      saveLabel={project ? "Save" : "Create project"}
      onSave={() =>
        save(async () => {
          if (project) {
            return (
              (await act("catalog.project-edit", { project: project.id, name, icon, colour })) !==
              null
            );
          }
          const id = prefix.trim().toUpperCase();
          if ((await act("catalog.project-create", { name, prefix: id })) === null) return false;
          await act("catalog.project-edit", { project: id, icon, colour });
          return true;
        })
      }
      {...(project
        ? {
            extra: (
              <>
                <Button
                  variant="secondary"
                  disabled={at <= 0}
                  onClick={() =>
                    void act("catalog.project-move", { project: project.id, before: order[at - 1] })
                  }
                >
                  Move up
                </Button>
                <Button
                  variant="secondary"
                  disabled={at === order.length - 1}
                  onClick={() =>
                    void act("catalog.project-move", {
                      project: project.id,
                      ...(order[at + 2] ? { before: order[at + 2] } : {}),
                    })
                  }
                >
                  Move down
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void act(
                      project.archived ? "catalog.project-restore" : "catalog.project-archive",
                      { project: project.id },
                    ).then((done) => done && go(back))
                  }
                >
                  {project.archived ? "Restore" : "Archive"}
                </Button>
              </>
            ),
          }
        : {})}
    >
      <Row title="Name" line="Shown in the sidebar and on every page." htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Row>
      <Row
        title="Prefix"
        line="Starts every ticket id, like TLK-1. 2 to 6 letters. It stays the same."
        htmlFor="prefix"
      >
        {project ? (
          <span className="mono">{project.id}</span>
        ) : (
          <Input
            id="prefix"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            maxLength={6}
          />
        )}
      </Row>
      <Row title="Icon and colour" line="Shown beside the name in the sidebar.">
        <ProjectIconPicker icon={icon} colour={colour} onIcon={setIcon} onColour={setColour} />
      </Row>
    </EditFrame>
  );
}

function ColumnRow({
  column,
  index,
  columns,
}: {
  column: Column;
  index: number;
  columns: Column[];
}) {
  const { act } = useApp();
  const [name, setName] = useState(column.name);
  return (
    <Row title={column.name} line={`Column ${index + 1}. Its kind says what it means.`}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Column name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== column.name) {
              void act("catalog.column-rename", { column: column.id, name: name.trim() });
            }
          }}
        />
        <Picker
          label="Column kind"
          value={column.kind}
          onChange={(v) => void act("catalog.column-kind-set", { column: column.id, kind: v })}
          options={[
            ...(Object.entries(KINDS) as [Kind, string][]).map(([k, text]) => ({
              id: k,
              name: text,
            })),
          ]}
        />
        <Button
          variant="secondary"
          aria-label="Move column left"
          disabled={index === 0}
          onClick={() =>
            void act("catalog.column-move", { column: column.id, before: columns[index - 1]?.id })
          }
        >
          ←
        </Button>
        <Button
          variant="secondary"
          aria-label="Move column right"
          disabled={index === columns.length - 1}
          onClick={() =>
            void act("catalog.column-move", {
              column: column.id,
              ...(columns[index + 2] ? { before: columns[index + 2]?.id } : {}),
            })
          }
        >
          →
        </Button>
        <Button
          variant="destructive"
          disabled={columns.length === 1}
          onClick={() => void act("catalog.column-remove", { column: column.id })}
        >
          Remove
        </Button>
      </div>
    </Row>
  );
}

/** A board's columns. Each change is saved as it is made, so the page ends with Done. */
export function ColumnsEdit({ project }: { project: Project }) {
  const { act } = useApp();
  const back = useBackTo(`/p/${project.id}/board`);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("waiting");
  return (
    <EditFrame
      title={`Edit the columns of ${project.name}`}
      line="Rename, reorder, add or remove columns. Removing a column moves its tickets to the one before it."
      backTo={back}
    >
      {project.columns.map((c, i) => (
        <ColumnRow key={c.id} column={c} index={i} columns={project.columns} />
      ))}
      <Row title="Add a column" line="It goes last; move it where you want it.">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="New column name"
            placeholder="Column name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <Picker
            label="New column kind"
            value={kind}
            onChange={(v) => setKind(v as Kind)}
            options={[
              ...(Object.entries(KINDS) as [Kind, string][]).map(([k, text]) => ({
                id: k,
                name: text,
              })),
            ]}
          />
          <Button
            variant="secondary"
            onClick={() => {
              if (!name.trim()) return;
              void act("catalog.column-add", { project: project.id, name: name.trim(), kind });
              setName("");
            }}
          >
            Add column
          </Button>
        </div>
      </Row>
    </EditFrame>
  );
}

export function LabelEdit({ id }: { id: string | null }) {
  const { catalog, act, go } = useApp();
  const back = useBackTo("/settings");
  const { busy, save } = useSave(back);
  const label = catalog.labels.find((l) => l.id === id) as Label | undefined;
  const [name, setName] = useState(label?.name ?? "");
  return (
    <EditFrame
      title={label ? `Edit the label ${label.name}` : "New label"}
      line="A tag for tickets, such as bug."
      backTo={back}
      busy={busy}
      saveLabel={label ? "Save" : "Add label"}
      onSave={() =>
        save(async () => {
          if (!label) return (await act("catalog.label-create", { name, colour: "blue" })) !== null;
          if (name !== label.name) {
            if ((await act("catalog.label-rename", { label: label.id, name })) === null)
              return false;
          }
          return true;
        })
      }
      {...(label
        ? {
            extra: (
              <Button
                variant="destructive"
                onClick={() =>
                  void act("catalog.label-remove", { label: label.id }).then(
                    (done) => done && go(back),
                  )
                }
              >
                Remove
              </Button>
            ),
          }
        : {})}
    >
      <Row title="Name" line="Shown on tickets." htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Row>
    </EditFrame>
  );
}

function FeatureForm({ project, feature }: { project: Project; feature: Feature | null }) {
  const { act, go } = useApp();
  const back = useBackTo(`/p/${project.id}/features`);
  const { busy, save } = useSave(back);
  const [name, setName] = useState(feature?.name ?? "");
  const [description, setDescription] = useState(feature?.description ?? "");
  const [favourite, setFavourite] = useState<"yes" | "no">(feature?.favourite ? "yes" : "no");
  return (
    <EditFrame
      title={feature ? `Edit ${feature.name}` : "New feature"}
      line="A feature is one part of the project. It groups the tickets for that part."
      backTo={back}
      busy={busy}
      saveLabel={feature ? "Save" : "Add feature"}
      onSave={() =>
        save(async () =>
          feature
            ? (await act("tickets.feature-edit", {
                feature: feature.id,
                name,
                description,
                favourite: favourite === "yes",
              })) !== null
            : (await act("tickets.feature-create", { project: project.id, name, description })) !==
              null,
        )
      }
      {...(feature
        ? {
            extra: (
              <Button
                variant="secondary"
                onClick={() =>
                  void act(
                    feature.archived ? "tickets.feature-restore" : "tickets.feature-archive",
                    {
                      feature: feature.id,
                    },
                  ).then((done) => done && go(back))
                }
              >
                {feature.archived ? "Restore" : "Archive"}
              </Button>
            ),
          }
        : {})}
    >
      <Row title="Name" line="Such as Voice." htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Row>
      <Row title="Description" line="What this part of the project covers." htmlFor="description">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Row>
      {feature && (
        <Row title="Favourite" line="Favourites are marked with a star.">
          <Choice
            label="Favourite"
            value={favourite}
            options={[
              { id: "no", name: "No" },
              { id: "yes", name: "Yes" },
            ]}
            onChange={setFavourite}
          />
        </Row>
      )}
    </EditFrame>
  );
}

export function FeatureEdit({ project, id }: { project: Project; id: string | null }) {
  const features = useRead<Feature[]>(id ? "tickets.feature-find" : null, {
    project: project.id,
    archived: true,
  });
  if (!id) return <FeatureForm project={project} feature={null} />;
  const feature = features?.find((f) => f.id === id);
  return feature ? <FeatureForm key={feature.id} project={project} feature={feature} /> : null;
}

export function TicketNew({ project }: { project: Project }) {
  const { act, go, query } = useApp();
  const toBacklog = query.get("backlog") === "1";
  const back = useBackTo(`/p/${project.id}/${toBacklog ? "backlog" : "board"}`);
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id }) ?? [];
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState(query.get("feature") ?? "");
  // A ticket started from a column of a board view begins where that column is.
  const preset = {
    ...(query.get("column") ? { column: query.get("column") } : {}),
    ...(query.get("assignee") ? { assignee: query.get("assignee") } : {}),
    ...(query.get("location") ? { location: query.get("location") } : {}),
  };
  const [place, setPlace] = useState<"board" | "backlog">(toBacklog ? "backlog" : "board");
  return (
    <EditFrame
      title={`New ticket in ${project.name}`}
      line="One piece of work, small enough for one agent to finish."
      backTo={back}
      busy={busy}
      saveLabel="Create ticket"
      onSave={async () => {
        setBusy(true);
        const made = await act<Ticket>("tickets.ticket-create", {
          project: project.id,
          title,
          description,
          backlog: place === "backlog",
          ...(feature ? { feature } : {}),
          ...(place === "board" ? preset : {}),
        });
        setBusy(false);
        if (made) go(back);
      }}
    >
      <Row title="Title" line="What the work is, in a few words." htmlFor="title">
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </Row>
      <Row title="Description" line="What done looks like." htmlFor="description">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Row>
      {features.length > 0 && (
        <Row title="Feature" line="The part of the project it belongs to." htmlFor="feature">
          <Picker
            id="feature"
            value={feature}
            onChange={(v) => setFeature(v)}
            options={[
              { id: "", name: "No feature" },
              ...features.map((f) => ({ id: f.id, name: f.name })),
            ]}
          />
        </Row>
      )}
      <Row
        title="Where it starts"
        line="On the board, in the first to-do column, or in the backlog."
      >
        <Choice
          label="Where it starts"
          value={place}
          options={[
            { id: "board", name: "On the board" },
            { id: "backlog", name: "In the backlog" },
          ]}
          onChange={setPlace}
        />
      </Row>
    </EditFrame>
  );
}

function TicketForm({ ticket }: { ticket: Ticket }) {
  const { catalog, act } = useApp();
  const back = useBackTo(`/t/${ticket.id}`);
  const { busy, save } = useSave(back);
  const features = useRead<Feature[]>("tickets.feature-find", { project: ticket.project }) ?? [];
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [labels, setLabels] = useState(ticket.labels.map((l) => l.id));
  const [feature, setFeature] = useState(ticket.feature ?? "");
  return (
    <EditFrame
      title={`Edit ${ticket.id}`}
      backTo={back}
      busy={busy}
      onSave={() =>
        save(async () => {
          const id = ticket.id;
          const changed = {
            ...(title.trim() === ticket.title ? {} : { title }),
            ...(description === ticket.description ? {} : { description }),
          };
          if (Object.keys(changed).length > 0) {
            if ((await act("tickets.ticket-edit", { ticket: id, ...changed })) === null)
              return false;
          }
          const had = ticket.labels.map((l) => l.id);
          for (const label of labels.filter((l) => !had.includes(l))) {
            await act("tickets.ticket-label-add", { ticket: id, label });
          }
          for (const label of had.filter((l) => !labels.includes(l))) {
            await act("tickets.ticket-label-remove", { ticket: id, label });
          }
          if (feature !== (ticket.feature ?? "")) {
            await act("tickets.ticket-feature-set", { ticket: id, feature: feature || null });
          }
          return true;
        })
      }
    >
      <Row title="Title" line="What the work is, in a few words." htmlFor="title">
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </Row>
      <Row title="Description" line="What done looks like." htmlFor="description">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Row>
      <Row title="Labels" line="Tick the labels it carries.">
        {catalog.labels.length > 0 ? (
          <Choices label="Labels" value={labels} options={catalog.labels} onChange={setLabels} />
        ) : (
          <span className="tk-muted">No labels yet. Add them in Settings.</span>
        )}
      </Row>
      {features.length > 0 && (
        <Row title="Feature" line="The part of the project it belongs to." htmlFor="feature">
          <Picker
            id="feature"
            value={feature}
            onChange={(v) => setFeature(v)}
            options={[
              { id: "", name: "No feature" },
              ...features.map((f) => ({ id: f.id, name: f.name })),
            ]}
          />
        </Row>
      )}
    </EditFrame>
  );
}

function PlaceForm({ ticket }: { ticket: Ticket }) {
  const { catalog, act, go } = useApp();
  const back = useBackTo(`/t/${ticket.id}`);
  const { busy, save } = useSave(back);
  const project = catalog.projects.find((p) => p.id === ticket.project);
  const [column, setColumn] = useState(ticket.column.id);
  const [assignee, setAssignee] = useState(ticket.assignee ?? "");
  const [blocked, setBlocked] = useState(ticket.blocked ?? "");
  const [location, setLocation] = useState(ticket.location ?? "");
  const locations = catalog.locations.filter((l) => !l.archived || l.id === ticket.location);
  const [place, setPlace] = useState<"board" | "backlog">(ticket.backlog ? "backlog" : "board");
  const id = ticket.id;
  const leave = (action: string) => () =>
    void act(action, { ticket: id }).then((done) => done && go(back));
  return (
    <EditFrame
      title={`Where ${ticket.id} is`}
      backTo={back}
      busy={busy}
      onSave={() =>
        save(async () => {
          if (place === "backlog" && !ticket.backlog) {
            if ((await act("tickets.ticket-backlog-send", { ticket: id })) === null) return false;
          }
          if (place === "board" && ticket.backlog) {
            if ((await act("tickets.ticket-board-send", { ticket: id })) === null) return false;
          }
          if (place === "board" && column !== ticket.column.id && !ticket.backlog) {
            if ((await act("tickets.ticket-move", { ticket: id, column })) === null) return false;
          }
          if (assignee !== (ticket.assignee ?? "")) {
            await act("tickets.ticket-assign", { ticket: id, actor: assignee || null });
          }
          if (location !== (ticket.location ?? "")) {
            await act("tickets.ticket-location-set", { ticket: id, location: location || null });
          }
          const note = blocked.trim();
          if (note !== (ticket.blocked ?? "")) {
            await act(note ? "tickets.ticket-block" : "tickets.ticket-unblock", {
              ticket: id,
              ...(note ? { note } : {}),
            });
          }
          return true;
        })
      }
      extra={
        <>
          <Button variant="secondary" onClick={leave("tickets.ticket-archive")}>
            Archive
          </Button>
          <Button variant="secondary" onClick={leave("tickets.ticket-cancel")}>
            Cancel ticket
          </Button>
        </>
      }
    >
      <Row title="Board or backlog" line="A backlog ticket waits off the board.">
        <Choice
          label="Board or backlog"
          value={place}
          options={[
            { id: "board", name: "On the board" },
            { id: "backlog", name: "In the backlog" },
          ]}
          onChange={setPlace}
        />
      </Row>
      {place === "board" && !ticket.backlog && (
        <Row title="Column" line="It can move to any column." htmlFor="column">
          <Picker
            id="column"
            value={column}
            onChange={(v) => setColumn(v)}
            options={[
              ...(project?.columns ?? []).map((c) => ({
                id: c.id,
                name: `${c.name} (${KINDS[c.kind]})`,
              })),
            ]}
          />
        </Row>
      )}
      <Row title="Assigned to" line="Assign it to another actor to hand it on." htmlFor="assignee">
        <Picker
          id="assignee"
          value={assignee}
          onChange={(v) => setAssignee(v)}
          options={[
            { id: "", name: "Nobody" },
            ...catalog.actors
              .filter((a) => !a.archived)
              .map((a) => ({ id: a.id, name: `${a.icon} ${a.name}`.trim() })),
          ]}
        />
      </Row>
      {locations.length > 0 && (
        <Row title="Location" line="Where its work is done, such as a machine." htmlFor="location">
          <Picker
            id="location"
            value={location}
            onChange={(v) => setLocation(v)}
            options={[
              { id: "", name: "None" },
              ...locations.map((l) => ({ id: l.id, name: l.name })),
            ]}
          />
        </Row>
      )}
      <Row
        title="Blocked"
        line="Say why it is blocked. Leave empty when it is not. Agents looking for work skip blocked tickets."
        htmlFor="blocked"
      >
        <Input
          id="blocked"
          value={blocked}
          onChange={(e) => setBlocked(e.target.value)}
          maxLength={500}
        />
      </Row>
    </EditFrame>
  );
}

/** Loads a ticket, then shows one of its two edit pages. */
export function TicketEdit({ id, part }: { id: string; part: "edit" | "place" }) {
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  if (!ticket) return null;
  return part === "edit" ? (
    <TicketForm key={ticket.id} ticket={ticket} />
  ) : (
    <PlaceForm key={ticket.id} ticket={ticket} />
  );
}

export function ConnectionApprove({ id }: { id: string }) {
  const { catalog, act, go } = useApp();
  const back = useBackTo("/connections");
  const { busy, save } = useSave(back);
  const connection = (useRead<Connection[]>("connections.connection-list") ?? []).find(
    (c) => c.id === id,
  );
  const agents = catalog.actors.filter((a) => a.id !== OWNER && !a.archived);
  const [actor, setActor] = useState(agents[0]?.id ?? "");
  const [name, setName] = useState("");
  const [may, setMay] = useState<"change" | "read">("change");
  if (!connection) return null;
  return (
    <EditFrame
      title={`Approve ${connection.name}`}
      line={`It asks to ${connection.may}. You choose what it may do and which actor it is.`}
      backTo={back}
      busy={busy}
      saveLabel="Approve"
      onSave={() =>
        save(async () => {
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
              connection: id,
              actor: as,
              change: may === "change",
            })) !== null
          );
        })
      }
      extra={
        <Button
          variant="destructive"
          onClick={() =>
            void act("connections.connection-revoke", { connection: id }).then(
              (done) => done && go(back),
            )
          }
        >
          Turn down
        </Button>
      }
    >
      <Row title="Acts as" line="Its work shows under this actor." htmlFor="actor">
        <Picker
          id="actor"
          value={actor}
          onChange={(v) => setActor(v)}
          options={[
            ...agents.map((a) => ({ id: a.id, name: a.name })),
            { id: "", name: "A new actor…" },
          ]}
        />
      </Row>
      {actor === "" && (
        <Row
          title="New actor's name"
          line="Left empty, it takes the connection's name."
          htmlFor="new"
        >
          <Input id="new" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Row>
      )}
      <Row title="It may" line="Read only, or read and change.">
        <Choice
          label="It may"
          value={may}
          options={[
            { id: "change", name: "Read and change" },
            { id: "read", name: "Only read" },
          ]}
          onChange={setMay}
        />
      </Row>
    </EditFrame>
  );
}

const INTAKE = [
  "item-tag",
  "item-untag",
  "item-category-set",
  "item-fields-set",
  "item-fields-clear",
  "item-edit",
  "item-accept",
  "item-reject",
  "item-dismiss",
  "item-promote",
  "item-link",
];
// What each kind of step needs, as [setting, label, what it is].
const SETTINGS: Record<Step["kind"], [string, string, string][]> = {
  script: [["file", "File", "A module in the steps folder, such as spam-check.mjs."]],
  "local-model": [
    ["url", "Address", "Such as http://127.0.0.1:11434/v1."],
    ["model", "Model", "The model's name."],
    ["instructions", "Instructions", "What it should do with an item."],
  ],
  "hosted-model": [
    ["url", "Address", "Such as https://api.example.com/v1."],
    ["model", "Model", "The model's name."],
    ["key_env", "Key", "The name of the environment variable that holds the key."],
    ["instructions", "Instructions", "What it should do with an item."],
  ],
  classifier: [
    ["url", "Address", "The address of the model."],
    ["model", "Model", "The model's name."],
    ["key_env", "Key", "The name of the environment variable with the key, if it needs one."],
    ["labels", "Labels", "JSON: each label and the Calls it leads to."],
  ],
  app: [["action", "Action", "The other App's Action, such as sorter.sort."]],
};

function StepForm({ step, steps }: { step: Step | null; steps: Step[] }) {
  const { catalog, act, go } = useApp();
  const back = useBackTo("/overview");
  const { busy, save } = useSave(back);
  const agents = catalog.actors.filter((a) => a.id !== OWNER && !a.archived);
  const [name, setName] = useState(step?.name ?? "");
  const [kind, setKind] = useState<Step["kind"]>(step?.kind ?? "script");
  const [actor, setActor] = useState(step?.actor ?? agents[0]?.id ?? "");
  const [actions, setActions] = useState(step?.actions ?? ["item-tag"]);
  const [on, setOn] = useState<"on" | "off">(step?.on === false ? "off" : "on");
  const [config, setConfig] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(step?.config ?? {}).map(([k, v]) => [
        k,
        typeof v === "string" ? v : JSON.stringify(v),
      ]),
    ),
  );
  const [runsOn, setRunsOn] = useState(Object.keys(step?.condition ?? {})[0] ?? "");
  const [value, setValue] = useState(Object.values(step?.condition ?? {})[0] ?? "");
  const [problem, setProblem] = useState("");
  const at = step ? steps.findIndex((s) => s.id === step.id) : -1;
  const extra: ReactNode = step ? (
    <>
      <Button
        variant="secondary"
        disabled={at <= 0}
        onClick={() => void act("inbox.step-move", { step: step.id, before: steps[at - 1]?.id })}
      >
        Move up
      </Button>
      <Button
        variant="secondary"
        disabled={at === steps.length - 1}
        onClick={() =>
          void act("inbox.step-move", {
            step: step.id,
            ...(steps[at + 2] ? { before: steps[at + 2]?.id } : {}),
          })
        }
      >
        Move down
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          void act("inbox.step-remove", { step: step.id }).then((done) => done && go(back))
        }
      >
        Remove
      </Button>
    </>
  ) : undefined;
  return (
    <EditFrame
      title={step ? `Edit the step ${step.name}` : "Add a step"}
      line="A step looks at each new inbox item and answers with what to do. It may only ask for what you allow."
      backTo={back}
      busy={busy}
      saveLabel={step ? "Save" : "Add step"}
      onSave={() =>
        save(async () => {
          const settings: Record<string, unknown> = {};
          for (const [key] of SETTINGS[kind]) {
            const text = (config[key] ?? "").trim();
            if (!text) continue;
            try {
              settings[key] = key === "labels" ? JSON.parse(text) : text;
            } catch {
              setProblem("The labels are not valid JSON.");
              return false;
            }
          }
          setProblem("");
          const input = {
            name,
            kind,
            actor,
            actions,
            condition: runsOn && value.trim() ? { [runsOn]: value.trim() } : null,
            config: settings,
            on: on === "on",
          };
          return (
            (await (step
              ? act("inbox.step-edit", { step: step.id, ...input })
              : act("inbox.step-add", input))) !== null
          );
        })
      }
      {...(extra ? { extra } : {})}
    >
      <Row title="Name" line="Such as Spam check." htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Row>
      <Row title="Kind" line="What looks at the item." htmlFor="kind">
        <Picker
          id="kind"
          value={kind}
          onChange={(v) => setKind(v as Step["kind"])}
          options={[...Object.keys(SETTINGS).map((k) => ({ id: k, name: k.replace("-", " ") }))]}
        />
      </Row>
      <Row title="Acts as" line="The step's changes show under this actor." htmlFor="actor">
        {agents.length > 0 ? (
          <Picker
            id="actor"
            value={actor}
            onChange={(v) => setActor(v)}
            options={[...agents.map((a) => ({ id: a.id, name: a.name }))]}
          />
        ) : (
          <span className="tk-muted">Add an actor in Settings first.</span>
        )}
      </Row>
      {SETTINGS[kind].map(([key, label, line]) => (
        <Row key={key} title={label} line={line} htmlFor={`setting-${key}`}>
          <Input
            id={`setting-${key}`}
            value={config[key] ?? ""}
            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          />
        </Row>
      ))}
      <Row title="It may" line="The Actions it may ask for. It can ask for no others.">
        <Choices
          label="It may"
          value={actions}
          options={INTAKE.map((a) => ({ id: a, name: a.replace("item-", "") }))}
          onChange={setActions}
        />
      </Row>
      <Row title="It runs on" line="Every item, or only some." htmlFor="runs-on">
        <div className="flex flex-wrap items-center gap-2">
          <Picker
            id="runs-on"
            value={runsOn}
            onChange={(v) => setRunsOn(v)}
            options={[...Object.entries(CONDITIONS).map(([k, text]) => ({ id: k, name: text }))]}
          />
          {runsOn !== "" && (
            <Input
              aria-label="Condition value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </div>
      </Row>
      <Row title="On" line="A step that is off is skipped.">
        <Choice
          label="On"
          value={on}
          options={[
            { id: "on", name: "On" },
            { id: "off", name: "Off" },
          ]}
          onChange={setOn}
        />
        {problem && (
          <p className="m-0 text-destructive" role="alert">
            {problem}
          </p>
        )}
      </Row>
    </EditFrame>
  );
}

export function StepEdit({ id }: { id: string | null }) {
  const steps = useRead<Step[]>("inbox.pipeline-read");
  if (!steps) return null;
  if (!id) return <StepForm step={null} steps={steps} />;
  const step = steps.find((s) => s.id === id);
  return step ? <StepForm key={step.id} step={step} steps={steps} /> : null;
}
