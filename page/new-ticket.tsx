import {
  DueDatePicker,
  DueIcon,
  dueLabel,
  FormDialog,
  ProjectIcon,
  PropertyPicker,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { IconStack2, IconTag } from "@tabler/icons-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type Feature, OWNER, PRIORITIES, type Ticket, TYPES } from "./api.js";
import { useApp, useRead } from "./app.js";
import { Editor } from "./editor.js";
import { Face, NoActor, projectLook } from "./local.js";
import { LabelDot, PRIORITY_NAME, PriorityIcon, StatusIcon } from "./pickers.js";

const BACKLOG = "backlog";
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Chip({ label, children, ...rest }: { label: string; children: ReactNode }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={label}
      className="h-7 gap-1.5 px-2 text-xs font-normal"
      {...rest}
    >
      {children}
    </Button>
  );
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function useNewTicketKey(enabled: boolean) {
  const { go, path, query } = useApp();
  const open = query.has("new") || query.has("ticket");
  useEffect(() => {
    if (!enabled || open) return;
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== "c") return;
      if (typing(e.target) || document.querySelector('[role="dialog"], [role="menu"]')) return;
      e.preventDefault();
      go(`${path}?new=1`);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [enabled, open, go, path]);
}

export const newTicketAt = (path: string, start = "") => `${path}?new=1${start ? `&${start}` : ""}`;

function NewTicket({ onClose }: { onClose: () => void }) {
  const { catalog, act, query, path } = useApp();
  const projects = catalog.projects.filter((p) => !p.archived);
  const here = path.split("/").filter(Boolean);
  const [project, setProject] = useState(
    query.get("project") ?? (here[0] === "p" ? (here[1] ?? "") : "") ?? "",
  );
  const chosen = projects.find((p) => p.id === project) ?? projects[0];
  const features =
    useRead<Feature[]>(chosen ? "tickets.feature-find" : null, { project: chosen?.id }) ?? [];
  const related = query.get("related");
  const [title, setTitle] = useState("");
  const description = useRef(related ? `Related to ${related}.` : "");
  const [column, setColumn] = useState(
    query.get("backlog") === "1" ? BACKLOG : (query.get("column") ?? ""),
  );
  const [priority, setPriority] = useState<Ticket["priority"]>("none");
  const [type, setType] = useState<Ticket["type"]>("task");
  const [assignee, setAssignee] = useState(query.get("assignee") ?? "");
  const [labels, setLabels] = useState<string[]>([]);
  const [feature, setFeature] = useState(query.get("feature") ?? "");
  const [due, setDue] = useState<string | null>(null);
  const location = query.get("location");
  if (!chosen) return null;
  const columns = chosen.columns;
  const at =
    column === BACKLOG
      ? null
      : (columns.find((c) => c.id === column) ??
        columns.find((c) => c.kind === "todo") ??
        columns[0]);
  const actor = catalog.actors.find((a) => a.id === assignee);
  const inFeature = features.find((f) => f.id === feature);
  return (
    <FormDialog
      open
      wide
      onOpenChange={(open) => !open && onClose()}
      title="New ticket"
      line="One piece of work, small enough for one agent to finish."
      saveLabel="Create ticket"
      extra={<span className="text-xs text-muted-foreground">Cmd+Enter creates it</span>}
      onSave={async () => {
        if (!title.trim()) return false;
        const made = await act<Ticket>("tickets.ticket-create", {
          project: chosen.id,
          title,
          description: description.current,
          backlog: column === BACKLOG,
          type,
          priority,
          labels,
          ...(at ? { column: at.id } : {}),
          ...(assignee ? { assignee } : {}),
          ...(inFeature ? { feature: inFeature.id } : {}),
          ...(location && catalog.locations.some((l) => l.id === location) ? { location } : {}),
          ...(due ? { due } : {}),
        });
        return made !== null;
      }}
    >
      <Input
        autoFocus
        required
        aria-label="Title"
        placeholder="Ticket title"
        className="h-auto border-transparent px-0 text-lg font-semibold shadow-none focus-visible:border-transparent md:text-lg"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="description max-h-[40vh] min-h-24 min-w-0 overflow-y-auto break-words">
        <Editor
          label="Description"
          placeholder="Add a description..."
          value={description.current}
          onChange={(markdown) => {
            description.current = markdown;
          }}
          className="text-sm outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {projects.length > 1 && (
          <PropertyPicker
            label="Project"
            placeholder="Put it in..."
            chosen={[chosen.id]}
            choices={projects.map((p) => ({
              id: p.id,
              name: p.name,
              icon: <ProjectIcon {...projectLook(p)} size={16} />,
            }))}
            onPick={(id) => {
              setProject(id);
              setColumn(column === BACKLOG ? BACKLOG : "");
              setFeature("");
            }}
          >
            <Chip label="Project">
              <ProjectIcon {...projectLook(chosen)} size={14} />
              {chosen.name}
            </Chip>
          </PropertyPicker>
        )}
        <PropertyPicker
          label="Status"
          placeholder="Start it in..."
          chosen={[at ? at.id : BACKLOG]}
          choices={[
            { id: BACKLOG, name: "Backlog", icon: <StatusIcon kind="todo" backlog /> },
            ...columns.map((c) => ({ id: c.id, name: c.name, icon: <StatusIcon kind={c.kind} /> })),
          ]}
          onPick={setColumn}
        >
          <Chip label="Status">
            <StatusIcon kind={at?.kind ?? "todo"} backlog={!at} />
            {at ? at.name : "Backlog"}
          </Chip>
        </PropertyPicker>
        <PropertyPicker
          label="Priority"
          placeholder="Set priority to..."
          chosen={[priority]}
          choices={PRIORITIES.map((p) => ({
            id: p,
            name: PRIORITY_NAME[p],
            icon: <PriorityIcon priority={p} />,
          }))}
          onPick={(p) => setPriority(p as Ticket["priority"])}
        >
          <Chip label="Priority">
            <PriorityIcon priority={priority} />
            {priority === "none" ? "Priority" : PRIORITY_NAME[priority]}
          </Chip>
        </PropertyPicker>
        <PropertyPicker
          label="Actor"
          placeholder="Assign to..."
          chosen={[assignee]}
          choices={[
            { id: "", name: "No actor", icon: <NoActor /> },
            ...catalog.actors
              .filter((a) => !a.archived)
              .map((a) => ({
                id: a.id,
                name: a.name,
                icon: <Face name={a.name} emoji={a.icon} colour={a.colour} size={20} />,
                ...(a.id === OWNER ? {} : { group: "Agents" }),
              })),
          ]}
          onPick={setAssignee}
        >
          <Chip label="Actor">
            {actor ? (
              <Face name={actor.name} emoji={actor.icon} colour={actor.colour} size={16} />
            ) : (
              <NoActor size={14} />
            )}
            {actor ? actor.name : "Actor"}
          </Chip>
        </PropertyPicker>
        <PropertyPicker
          label="Labels"
          placeholder="Add labels..."
          many
          chosen={labels}
          choices={catalog.labels.map((l) => ({
            id: l.id,
            name: l.name,
            icon: <LabelDot colour={l.colour} />,
          }))}
          onPick={(id) =>
            setLabels(labels.includes(id) ? labels.filter((l) => l !== id) : [...labels, id])
          }
        >
          <Chip label="Labels">
            <IconTag size={14} aria-hidden className="text-muted-foreground" />
            {labels.length === 0
              ? "Labels"
              : labels.map((id) => catalog.labels.find((l) => l.id === id)?.name).join(", ")}
          </Chip>
        </PropertyPicker>
        {features.length > 0 && (
          <PropertyPicker
            label="Feature"
            placeholder="Set feature to..."
            chosen={[inFeature?.id ?? ""]}
            choices={[
              { id: "", name: "No feature" },
              ...features.map((f) => ({ id: f.id, name: f.name })),
            ]}
            onPick={setFeature}
          >
            <Chip label="Feature">
              <IconStack2 size={14} aria-hidden className="text-muted-foreground" />
              {inFeature ? inFeature.name : "Feature"}
            </Chip>
          </PropertyPicker>
        )}
        <PropertyPicker
          label="Type"
          placeholder="Set type to..."
          chosen={[type]}
          choices={TYPES.map((t) => ({ id: t, name: titleCase(t) }))}
          onPick={(t) => setType(t as Ticket["type"])}
        >
          <Chip label="Type">{titleCase(type)}</Chip>
        </PropertyPicker>
        <DueDatePicker value={due} onChange={setDue}>
          <Chip label="Due date">
            <DueIcon due={due} size={14} />
            {due ? dueLabel(due) : "Due date"}
          </Chip>
        </DueDatePicker>
      </div>
    </FormDialog>
  );
}

export function NewTicketDialog() {
  const { query, path, go } = useApp();
  if (!query.has("new")) return null;
  return <NewTicket key={query.toString()} onClose={() => go(path)} />;
}
