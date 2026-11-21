// The edit pages. Every one is the toolkit's EditFrame: Back at the top,
// labelled rows, then Cancel and Save, which both return to where you were.
import { EditFrame, Row, useBackTo } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import { useState } from "react";
import {
  type Actor,
  type Column,
  type Connection,
  type Feature,
  KINDS,
  type Kind,
  OWNER,
  type Project,
  type Ticket,
} from "./api.js";
import { useApp, useRead } from "./app.js";
import { Choice, Picker } from "./local.js";

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
  // A ticket made from another's menu starts by naming it.
  const related = query.get("related");
  const [description, setDescription] = useState(related ? `Related to ${related}.` : "");
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
