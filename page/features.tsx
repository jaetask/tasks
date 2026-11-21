// A project's features: a list with one line each, and a page for each feature with what it
// covers and its tickets.
import {
  EmptyLine,
  Field,
  FormDialog,
  InlineText,
  Link,
  ListCard,
  RowMenu,
  WorkPage,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { Feature, Project, Ticket } from "./api.js";
import { useApp, useRead } from "./app.js";
import { TicketDialog, titleIcon } from "./board.js";
import { Editor } from "./editor.js";
import { Tick } from "./local.js";
import { newTicketAt } from "./new-ticket.js";
import { StatusIcon } from "./pickers.js";
import { TicketLine } from "./ticket-line.js";

/** How far along a feature is: a thin bar, and the numbers beside it. */
function Progress({ feature }: { feature: Feature }) {
  const all = feature.left + feature.done;
  const part = all === 0 ? 0 : Math.round((feature.done / all) * 100);
  return (
    <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
      <span>{`${feature.left} open · ${feature.done} done`}</span>
      <span
        role="progressbar"
        aria-label={`${part}% done`}
        aria-valuenow={part}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 w-24 overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${part}%` }} />
      </span>
    </span>
  );
}

/** The star of a feature: a favourite shows in the sidebar. A click turns it on or off. */
function Star({ feature }: { feature: Feature }) {
  const { act } = useApp();
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={
        feature.favourite
          ? `Remove ${feature.name} from favourites`
          : `Make ${feature.name} a favourite`
      }
      aria-pressed={feature.favourite}
      className={`shrink-0 [&_svg]:size-4 ${feature.favourite ? "text-amber-500" : "text-muted-foreground"}`}
      onClick={() =>
        void act("tickets.feature-edit", { feature: feature.id, favourite: !feature.favourite })
      }
    >
      {feature.favourite ? <IconStarFilled aria-hidden /> : <IconStar aria-hidden />}
    </Button>
  );
}

function featureMenu(
  feature: Feature,
  { act, go }: Pick<ReturnType<typeof useApp>, "act" | "go">,
  onRename: () => void,
  after?: () => void,
) {
  return [
    {
      label: "Open on the board",
      onSelect: () => go(`/p/${feature.project}/board?feature=${encodeURIComponent(feature.id)}`),
    },
    { label: "Rename", onSelect: onRename },
    {
      label: feature.archived ? "Restore" : "Archive",
      onSelect: () =>
        void act(feature.archived ? "tickets.feature-restore" : "tickets.feature-archive", {
          feature: feature.id,
        }),
    },
    "line" as const,
    {
      label: "Delete",
      onSelect: () =>
        void act("tickets.feature-delete", { feature: feature.id }).then(
          (done) => done && after?.(),
        ),
    },
  ];
}

export function FeaturesPage({ project }: { project: Project }) {
  const app = useApp();
  const { act, go } = app;
  const [archived, setArchived] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id, archived });
  return (
    <WorkPage
      icon={titleIcon(project)}
      title={`${project.name} · Features`}
      help="A feature is one part of the project. It groups the tickets for that part. A starred feature shows in the sidebar."
      action={
        <Button size="sm" onClick={() => setAdding(true)}>
          New feature
        </Button>
      }
    >
      <Tick label="Show archived" checked={archived} onChange={setArchived} />
      {features && features.length > 0 ? (
        <ListCard>
          {features.map((f) => (
            <li key={f.id} className="tk-list-row group">
              <Star feature={f} />
              <span
                className={`flex min-w-0 flex-1 items-center gap-3 ${f.archived ? "opacity-60" : ""}`}
              >
                {renaming === f.id ? (
                  <InlineText
                    value={f.name}
                    label={`Rename ${f.name}`}
                    className="font-medium"
                    editing
                    onEditingChange={(on) => setRenaming(on ? f.id : null)}
                    onSave={(next) =>
                      void act("tickets.feature-edit", { feature: f.id, name: next })
                    }
                  />
                ) : (
                  <Link
                    href={`/p/${project.id}/features/${f.id}`}
                    className="min-w-0 truncate font-medium hover:underline"
                  >
                    {f.name}
                  </Link>
                )}
                {f.archived && <span className="text-xs text-muted-foreground">Archived</span>}
              </span>
              <Progress feature={f} />
              <RowMenu
                label={`Feature ${f.name}`}
                items={featureMenu(f, app, () => setRenaming(f.id))}
              />
            </li>
          ))}
        </ListCard>
      ) : (
        <EmptyLine>
          {features ? "No features yet. Add one for each part of the project, such as Voice." : ""}
        </EmptyLine>
      )}
      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title="New feature"
        line="One part of the project, which groups the tickets for that part."
        saveLabel="Add feature"
        onSave={async () => {
          const made = await act<Feature>("tickets.feature-create", {
            project: project.id,
            name,
            description,
          });
          if (!made) return false;
          setName("");
          setDescription("");
          go(`/p/${project.id}/features/${made.id}`);
          return true;
        }}
      >
        <Field label="Name" htmlFor="feature-name">
          <Input
            id="feature-name"
            autoFocus
            required
            placeholder="Such as Voice"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="What it covers" htmlFor="feature-description">
          <Textarea
            id="feature-description"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </FormDialog>
    </WorkPage>
  );
}

/** One feature: its name and what it covers, edited where they are shown, then its tickets. */
export function FeaturePage({ project, id }: { project: Project; id: string }) {
  const app = useApp();
  const { act, go, path } = app;
  const features = useRead<Feature[]>("tickets.feature-find", {
    project: project.id,
    archived: true,
  });
  const tickets = useRead<Ticket[]>("tickets.ticket-find", { project: project.id, feature: id });
  const [renaming, setRenaming] = useState(false);
  const draft = useRef<string | null>(null);
  const list = `/p/${project.id}/features`;
  const feature = features?.find((f) => f.id === id);
  if (features && !feature) {
    return (
      <WorkPage icon={titleIcon(project)} title={`${project.name} · Features`}>
        <EmptyLine>
          {`No feature of ${project.name} has the id ${id}. `}
          <Link href={list} className="underline">
            All its features
          </Link>
        </EmptyLine>
      </WorkPage>
    );
  }
  if (!feature) return null;
  const board = (tickets ?? []).filter((t) => !t.backlog);
  const waiting = (tickets ?? []).filter((t) => t.backlog);
  return (
    <WorkPage
      icon={titleIcon(project)}
      title={`${project.name} · Features`}
      action={
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={list}>All features</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={newTicketAt(path, `feature=${feature.id}`)}>New ticket</Link>
          </Button>
        </>
      }
    >
      <div className="grid max-w-4xl gap-5">
        <div className="flex items-center gap-2">
          <Star feature={feature} />
          <InlineText
            value={feature.name}
            label={`Rename ${feature.name}`}
            className="text-lg font-semibold"
            maxLength={80}
            editing={renaming}
            onEditingChange={setRenaming}
            onSave={(name) => void act("tickets.feature-edit", { feature: id, name })}
          />
          {feature.archived && <span className="text-xs text-muted-foreground">Archived</span>}
          <span className="ml-auto flex items-center gap-2">
            <Progress feature={feature} />
            <RowMenu
              label={`Feature ${feature.name}`}
              items={featureMenu(
                feature,
                app,
                () => setRenaming(true),
                () => go(list),
              )}
            />
          </span>
        </div>
        <div className="description min-w-0 break-words text-sm">
          <Editor
            key={feature.description}
            label="What it covers"
            placeholder="Say what this part of the project covers..."
            value={feature.description}
            onChange={(markdown) => {
              draft.current = markdown;
            }}
            onBlur={() => {
              const wanted = draft.current;
              if (wanted !== null && wanted.trim() !== feature.description.trim()) {
                void act("tickets.feature-edit", { feature: id, description: wanted });
              }
            }}
            className="text-sm outline-none"
          />
        </div>
        {project.columns.map((column) => {
          const inside = board.filter((t) => t.column.id === column.id);
          if (inside.length === 0) return null;
          return (
            <section key={column.id} aria-label={column.name} className="grid gap-1">
              <h2 className="m-0 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <StatusIcon kind={column.kind} />
                {column.name}
                <span className="font-normal">{inside.length}</span>
              </h2>
              <ListCard>
                {inside.map((t) => (
                  <TicketLine key={t.id} ticket={t} status={false} feature={false} />
                ))}
              </ListCard>
            </section>
          );
        })}
        {waiting.length > 0 && (
          <section aria-label="Backlog" className="grid gap-1">
            <h2 className="m-0 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <StatusIcon kind="todo" backlog />
              Backlog
              <span className="font-normal">{waiting.length}</span>
            </h2>
            <ListCard>
              {waiting.map((t) => (
                <TicketLine key={t.id} ticket={t} status={false} feature={false} />
              ))}
            </ListCard>
          </section>
        )}
        {tickets && tickets.length === 0 && (
          <EmptyLine>No open ticket is in this feature.</EmptyLine>
        )}
      </div>
      <TicketDialog />
    </WorkPage>
  );
}
