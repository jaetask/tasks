// A project's board and backlog: working surfaces that use the full width.
// The board groups the same tickets four ways: by column, by feature, by
// actor and by location. Dragging a ticket changes what the view groups by.
import { EditLink, Link, PageBody, PrimaryLink } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Checkbox } from "@jaetask/toolkit/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@jaetask/toolkit/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@jaetask/toolkit/ui/dialog";
import { Input } from "@jaetask/toolkit/ui/input";
import { Label } from "@jaetask/toolkit/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@jaetask/toolkit/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@jaetask/toolkit/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@jaetask/toolkit/ui/tooltip";
import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
  IconCircleCheck,
  IconLink,
  IconMapPin,
  IconPlus,
  IconStack2,
  IconStopwatch,
  IconUserOff,
  IconUsers,
} from "@tabler/icons-react";
import { type DragEvent, type ReactNode, useEffect, useState } from "react";
import {
  type Board as BoardData,
  type Feature,
  KINDS,
  type Kind,
  PRIORITIES,
  type Project,
  type Ticket,
  TYPES,
} from "./api.js";
import { useApp, useRead } from "./app.js";
import { Nothing, Picker, projectEmoji } from "./local.js";
import { LabelDot, PriorityIcon, StatusIcon } from "./pickers.js";
import {
  ActorPicker,
  DueIcon,
  DuePicker,
  dueLabel,
  dueState,
  FeaturePicker,
  LabelsPicker,
  LocationPicker,
  PriorityPicker,
  StatusPicker,
  TypePicker,
} from "./properties.js";
import { TicketView } from "./ticket.js";

const VIEWS = [
  { id: "features", label: "Features", Icon: IconStack2, heading: "Features" },
  { id: "actors", label: "Actors", Icon: IconUsers, heading: "Who is working" },
  { id: "locations", label: "Locations", Icon: IconMapPin, heading: "Where work happens" },
  { id: "status", label: "Status", Icon: IconCircleCheck, heading: "Progress" },
] as const;
type View = (typeof VIEWS)[number]["id"];

/** How a board or backlog is narrowed. "" means all; "none" means tickets with none. */
type Filters = {
  view: View;
  text: string;
  actor: string;
  feature: string;
  location: string;
  label: string;
  type: string;
  priority: string;
  due: string;
  hideDone: boolean;
  hideEmpty: boolean;
};
const ALL: Filters = {
  view: "features",
  text: "",
  actor: "",
  feature: "",
  location: "",
  label: "",
  type: "",
  priority: "",
  due: "",
  hideDone: false,
  hideEmpty: false,
};

/** The filters of one screen of one project, remembered in this browser. */
function useFilters(key: string): [Filters, (patch: Partial<Filters>) => void] {
  const read = (): Filters => {
    try {
      return { ...ALL, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
    } catch {
      return ALL;
    }
  };
  const [filters, setFilters] = useState(read);
  // biome-ignore lint/correctness/useExhaustiveDependencies: another project has its own filters
  useEffect(() => setFilters(read()), [key]);
  return [
    filters,
    (patch) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Without storage the filters still work; they are forgotten on reload.
      }
    },
  ];
}

const matches = (wanted: string, value: string | null) =>
  wanted === "" || (wanted === "none" ? value === null : value === wanted);

function narrowed(tickets: Ticket[], f: Filters): Ticket[] {
  const words = f.text.toLowerCase().split(/\s+/).filter(Boolean);
  return tickets
    .filter((t) => matches(f.actor, t.assignee))
    .filter((t) => matches(f.feature, t.feature))
    .filter((t) => matches(f.location, t.location))
    .filter((t) => f.label === "" || t.labels.some((l) => l.id === f.label))
    .filter((t) => f.type === "" || t.type === f.type)
    .filter((t) => f.priority === "" || t.priority === f.priority)
    .filter((t) => {
      if (f.due === "") return true;
      if (f.due === "none") return t.due === null;
      if (t.due === null) return false;
      const state = dueState(t.due);
      return f.due === "any" || (f.due === "overdue" ? state === "overdue" : state !== "overdue");
    })
    .filter((t) =>
      words.every((w) => `${t.id} ${t.title} ${t.description}`.toLowerCase().includes(w)),
    );
}

/** The search box and pickers above a board or backlog. */
function FilterBar({
  filters,
  set,
  features,
  right,
}: {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  features: Feature[];
  right?: ReactNode;
}) {
  const { catalog } = useApp();
  const more = [
    filters.feature,
    filters.location,
    filters.label,
    filters.type,
    filters.priority,
    filters.due,
  ].filter(Boolean).length;
  const [open, setOpen] = useState(more > 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="grid gap-3 border-y py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Search tickets"
          placeholder="Search tickets…"
          className="max-w-64"
          value={filters.text}
          onChange={(e) => set({ text: e.target.value })}
        />
        <Picker
          label="Filter actor"
          value={filters.actor}
          onChange={(actor) => set({ actor })}
          options={[
            { id: "", name: "All actors" },
            { id: "none", name: "Unassigned" },
            ...catalog.actors
              .filter((a) => !a.archived)
              .map((a) => ({ id: a.id, name: `${a.icon} ${a.name}`.trim() })),
          ]}
        />
        <CollapsibleTrigger asChild>
          <Button variant="outline">
            <IconChevronDown size={16} aria-hidden className={open ? "rotate-180" : ""} />
            {more > 0 ? `More filters (${more})` : "More filters"}
          </Button>
        </CollapsibleTrigger>
        {right && <div className="ml-auto flex flex-wrap items-center gap-4">{right}</div>}
      </div>
      <CollapsibleContent className="flex flex-wrap items-center gap-2">
        <Picker
          label="Filter feature"
          value={filters.feature}
          onChange={(feature) => set({ feature })}
          options={[
            { id: "", name: "All features" },
            { id: "none", name: "No feature" },
            ...features.map((f) => ({ id: f.id, name: f.name })),
          ]}
        />
        <Picker
          label="Filter location"
          value={filters.location}
          onChange={(location) => set({ location })}
          options={[
            { id: "", name: "All locations" },
            { id: "none", name: "No location" },
            ...catalog.locations.map((l) => ({ id: l.id, name: l.name })),
          ]}
        />
        <Picker
          label="Filter label"
          value={filters.label}
          onChange={(label) => set({ label })}
          options={[
            { id: "", name: "All labels" },
            ...catalog.labels.map((l) => ({ id: l.id, name: l.name })),
          ]}
        />
        <Picker
          label="Filter type"
          value={filters.type}
          onChange={(type) => set({ type })}
          options={[
            { id: "", name: "All types" },
            ...TYPES.map((t) => ({ id: t, name: titleCase(t) })),
          ]}
        />
        <Picker
          label="Filter priority"
          value={filters.priority}
          onChange={(priority) => set({ priority })}
          options={[
            { id: "", name: "All priorities" },
            ...PRIORITIES.map((p) => ({ id: p, name: titleCase(p) })),
          ]}
        />
        <Picker
          label="Filter due date"
          value={filters.due}
          onChange={(due) => set({ due })}
          options={[
            { id: "", name: "Any due date" },
            { id: "overdue", name: "Overdue" },
            { id: "upcoming", name: "Not overdue" },
            { id: "any", name: "Has a due date" },
            { id: "none", name: "No due date" },
          ]}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function Tick({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Label className="flex items-center gap-2 text-xs">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </Label>
  );
}

export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const DRAG = "application/x-tasks-ticket";

const _KIND_DOT: Record<Kind, string> = {
  todo: "bg-muted-foreground/50",
  doing: "bg-amber-500",
  waiting: "bg-violet-500",
  done: "bg-emerald-500",
};
/** A compact time since: 5m, 3h, 16d. */
const since = (at: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (60 * 24))}d`;
};
/** A short date: Nov 20, with the year only when it is not this year. */
const shortDate = (at: string) => {
  const date = new Date(at);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
};
const SERVICES: Record<string, string> = {
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "github.com": "GitHub",
  "figma.com": "Figma",
  "linear.app": "Linear",
  "notion.so": "Notion",
};
/** The name a link's site goes by: a known service, or its domain. */
const service = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SERVICES[host] ?? host;
  } catch {
    return url;
  }
};

const PILL =
  "inline-flex h-6 items-center gap-1.5 rounded-full border bg-transparent px-2 text-xs font-normal";

/** A chip on a card that opens a picker or a link: it keeps its click and its drag to itself. */
function Chip({ className, ...rest }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      data-chip
      draggable={false}
      className={`h-auto p-0 text-xs font-normal hover:bg-transparent ${className ?? ""}`}
      {...rest}
    />
  );
}

/**
 * A ticket as a card on a board. Anywhere on it opens the ticket, except a property, which opens
 * that property's picker. It can be dragged to a lane. `show` says which properties it carries.
 */
export function TicketCard({
  ticket,
  action,
  show,
}: {
  ticket: Ticket;
  action?: ReactNode;
  /** The properties to show. The ticket's project decides if left out. */
  show?: readonly string[];
}) {
  const { catalog, go, path } = useApp();
  const [hovered, setHovered] = useState(false);
  const project = catalog.projects.find((p) => p.id === ticket.project);
  const actor = catalog.actors.find((a) => a.id === ticket.assignee);
  const shown = new Set(show ?? project?.card ?? []);
  const has = (property: string) => shown.has(property);
  const open = () => go(`${path}?ticket=${ticket.id}`);
  const avatar = actor && (
    <span
      aria-hidden
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
    >
      {actor.icon || actor.name.slice(0, 1)}
    </span>
  );
  const status = <StatusIcon kind={ticket.column.kind} backlog={ticket.backlog} />;
  // Status and actor share a line when both are shown; alone, each takes less room.
  const together = has("status") && has("actor");
  const top = has("id") || has("type") || has("priority") || (has("actor") && !together);
  const byService = new Map<string, string[]>();
  for (const l of ticket.links) {
    byService.set(service(l.url), [...(byService.get(service(l.url)) ?? []), l.url]);
  }
  const pills =
    (has("location") && ticket.locationName) ||
    (has("labels") && ticket.labels.length > 0) ||
    (has("links") && ticket.links.length > 0) ||
    (has("reactions") && ticket.reactions.length > 0) ||
    (has("due") && ticket.due !== null) ||
    has("time-in-status");
  const bare = shown.size === 0;
  return (
    // The whole card opens the ticket; it can be dragged, and on the backlog it holds a button of its own.
    <article
      draggable
      aria-label={`${ticket.id} ${ticket.title}`}
      data-blocked={ticket.blocked !== null}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG, ticket.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        // A click in a picker, which is drawn outside the card, or on a chip is not for the card.
        const target = e.target as HTMLElement;
        if (!e.currentTarget.contains(target) || target.closest("[data-chip]")) return;
        open();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) open();
      }}
      className={`ticket grid cursor-pointer gap-3 rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring ${bare ? "px-3 py-2" : "p-4"}`}
    >
      {top && (
        <div className="-mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {has("id") && <span>{ticket.id}</span>}
            {has("id") && has("type") && <span>·</span>}
            {has("type") && (
              <TypePicker ticket={ticket}>
                <Chip className="text-muted-foreground">{titleCase(ticket.type)}</Chip>
              </TypePicker>
            )}
          </span>
          <span className="flex items-center gap-2">
            {ticket.blocked && <span>Blocked</span>}
            {has("priority") && (
              <PriorityPicker ticket={ticket} armed={hovered}>
                <Chip className="gap-1 text-muted-foreground" aria-label="Priority">
                  <PriorityIcon priority={ticket.priority} />
                  {ticket.priority !== "none" && titleCase(ticket.priority)}
                </Chip>
              </PriorityPicker>
            )}
            {has("actor") && !together && (
              <ActorPicker ticket={ticket} armed={hovered}>
                <Chip aria-label="Actor">
                  {avatar ?? (
                    <IconUserOff size={16} aria-hidden className="text-muted-foreground" />
                  )}
                </Chip>
              </ActorPicker>
            )}
          </span>
        </div>
      )}
      <div className="flex items-start gap-2 font-medium">
        {has("status") && !together && (
          <StatusPicker ticket={ticket} armed={hovered}>
            <Chip className="mt-0.5" aria-label="Status">
              {status}
            </Chip>
          </StatusPicker>
        )}
        <span className={bare ? "truncate" : ""}>{ticket.title}</span>
      </div>
      {together && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusPicker ticket={ticket} armed={hovered}>
            <Chip className="gap-2" aria-label="Status">
              {status}
              {ticket.backlog ? "Backlog" : ticket.column.name}
            </Chip>
          </StatusPicker>
          <ActorPicker ticket={ticket} armed={hovered}>
            <Chip className="gap-2" aria-label="Actor">
              {avatar}
              {actor ? actor.name : <span className="text-muted-foreground">No actor</span>}
            </Chip>
          </ActorPicker>
        </div>
      )}
      {has("feature") && (
        <FeaturePicker ticket={ticket}>
          <Chip className="justify-start whitespace-normal text-left text-muted-foreground">
            {[project?.name ?? ticket.project, ticket.featureName].filter(Boolean).join(" / ")}
          </Chip>
        </FeaturePicker>
      )}
      {pills && (
        <div className="flex flex-wrap items-center gap-1.5">
          {has("location") && ticket.locationName && (
            <LocationPicker ticket={ticket}>
              <Chip className={PILL}>
                <IconMapPin size={12} aria-hidden />
                {ticket.locationName}
              </Chip>
            </LocationPicker>
          )}
          {has("labels") &&
            ticket.labels.map((l) => (
              <LabelsPicker key={l.id} ticket={ticket} armed={hovered}>
                <Chip className={PILL}>
                  <LabelDot colour={l.colour} />
                  {l.name}
                </Chip>
              </LabelsPicker>
            ))}
          {has("links") &&
            [...byService].map(([name, urls]) => (
              <Chip key={name} asChild className={PILL}>
                <a href={urls[0]} target="_blank" rel="noopener noreferrer">
                  <IconLink size={12} aria-hidden />
                  {urls.length > 1 ? `${name} ${urls.length}` : name}
                </a>
              </Chip>
            ))}
          {has("due") && ticket.due && (
            <DuePicker ticket={ticket} armed={hovered}>
              <Chip className={PILL}>
                <DueIcon due={ticket.due} size={12} />
                {dueLabel(ticket.due)}
              </Chip>
            </DuePicker>
          )}
          {has("time-in-status") && (
            <span className={PILL} title={new Date(ticket.columnSince).toLocaleString()}>
              <IconStopwatch size={12} aria-hidden />
              {since(ticket.columnSince)}
            </span>
          )}
          {has("reactions") &&
            ticket.reactions.map((r) => (
              <span key={r.emoji} className="text-xs text-muted-foreground">
                {`${r.emoji} ${r.actors.length}`}
              </span>
            ))}
        </div>
      )}
      {(has("created") || has("updated") || action) && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="grid gap-1">
            {has("created") && (
              <span title={new Date(ticket.createdAt).toLocaleString()}>
                {`Created ${shortDate(ticket.createdAt)}`}
              </span>
            )}
            {has("updated") && (
              <span title={new Date(ticket.updatedAt).toLocaleString()}>
                {`Updated ${shortDate(ticket.updatedAt)}`}
              </span>
            )}
          </span>
          {action}
        </div>
      )}
    </article>
  );
}

/** One column of a board: a name, a count and its cards. A card can be dropped on it. */
export function Lane({
  id,
  title,
  icon,
  count,
  addTo,
  onDrop,
  children,
}: {
  id: string;
  title: string;
  icon?: ReactNode;
  count: number;
  /** Where "+" goes: the new-ticket page, starting in this lane. */
  addTo?: string;
  onDrop?: (ticket: string) => void;
  children?: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const dragging = (e: DragEvent) => onDrop !== undefined && e.dataTransfer.types.includes(DRAG);
  return (
    <section
      id={id}
      aria-label={title}
      onDragOver={(e) => {
        if (!dragging(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!dragging(e)) return;
        e.preventDefault();
        setOver(false);
        onDrop?.(e.dataTransfer.getData(DRAG));
      }}
      className={`lane group/lane min-h-72 w-72 shrink-0 rounded-xl p-3 ${over ? "bg-muted" : "bg-muted/45"}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </h2>
        <span className="flex items-center gap-1">
          {addTo && (
            <Button
              asChild
              variant="ghost"
              size="icon-xs"
              className="opacity-0 focus-visible:opacity-100 group-hover/lane:opacity-100"
            >
              <Link href={addTo} aria-label={`New ticket in ${title}`}>
                <IconPlus aria-hidden />
              </Link>
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{count}</span>
        </span>
      </div>
      <div className="grid gap-3">
        {count > 0 ? (
          children
        ) : (
          <p className="lane-empty rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
            No tickets here
          </p>
        )}
      </div>
    </section>
  );
}

/** Lanes side by side, scrolling sideways when they do not fit. */
export function Lanes({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-4">{children}</div>
    </section>
  );
}

function TicketTitle({ id }: { id: string }) {
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  return <DialogTitle className="sr-only">{ticket?.title ?? id}</DialogTitle>;
}

/** The ticket named after ?ticket= in the address, opened over the page it was opened from. */
export function TicketDialog() {
  const { query, path, go } = useApp();
  const id = query.get("ticket");
  if (!id) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && go(path)}>
      <DialogContent className="max-h-[90vh] w-[min(64rem,95vw)] max-w-none overflow-y-auto">
        <TicketTitle id={id} />
        <DialogDescription className="sr-only">The ticket and its conversation.</DialogDescription>
        <TicketView key={id} id={id} onGone={() => go(path)} />
      </DialogContent>
    </Dialog>
  );
}

const CARD_PROPERTIES: [string, string][] = [
  ["id", "ID"],
  ["type", "Type"],
  ["priority", "Priority"],
  ["status", "Status"],
  ["actor", "Actor"],
  ["feature", "Feature"],
  ["location", "Location"],
  ["labels", "Labels"],
  ["links", "Links"],
  ["reactions", "Reactions"],
  ["due", "Due date"],
  ["time-in-status", "Time in status"],
  ["created", "Created"],
  ["updated", "Updated"],
];

/** The Display button: which properties a card shows on this project's board and backlog. */
function Display({ project }: { project: Project }) {
  const { act } = useApp();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <IconAdjustmentsHorizontal size={16} aria-hidden />
          Display
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-80 gap-3">
        <p className="m-0 text-xs font-medium text-muted-foreground">Display properties</p>
        <ToggleGroup
          type="multiple"
          aria-label="Display properties"
          className="flex-wrap justify-start gap-1.5"
          value={project.card}
          onValueChange={(show) =>
            void act("catalog.project-card-set", { project: project.id, show })
          }
        >
          {CARD_PROPERTIES.map(([id, name]) => (
            <ToggleGroupItem
              key={id}
              value={id}
              className="h-7 rounded-full border px-3 text-xs font-normal text-muted-foreground data-[state=on]:border-transparent data-[state=on]:bg-muted data-[state=on]:text-foreground"
            >
              {name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex justify-end">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() =>
              void act("catalog.project-card-set", { project: project.id, show: null })
            }
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type Group = {
  id: string;
  title: string;
  kind?: Kind;
  /** What a new ticket made in this lane starts with, as the new-ticket page reads it. */
  start: string;
  tickets: Ticket[];
  drop: (ticket: string) => unknown;
};

const title = (project: Project, screen?: string) =>
  `${projectEmoji(project)} ${project.name}${screen ? ` · ${screen}` : ""}`.trim();

export function BoardPage({ project }: { project: Project }) {
  const { catalog, act } = useApp();
  const [filters, set] = useFilters(`tasks.board.${project.id}`);
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id }) ?? [];
  const board = useRead<BoardData>("tickets.board-read", { project: project.id });
  const view = filters.view;
  // A favourite feature in the sidebar opens the board narrowed to it.
  const { query } = useApp();
  const asked = query.get("feature");
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the address asks for a feature
  useEffect(() => {
    if (asked && asked !== filters.feature) set({ feature: asked });
  }, [asked]);

  const all = narrowed(
    (board?.columns ?? []).flatMap((c) => c.tickets),
    filters,
  );
  // In the status view "Hide done" hides the done columns; in the others, the tickets in them.
  const shown =
    filters.hideDone && view !== "status" ? all.filter((t) => t.column.kind !== "done") : all;
  const by = (key: (t: Ticket) => string | null, id: string | null) =>
    shown.filter((t) => key(t) === id);

  let groups: Group[];
  if (view === "features") {
    groups = [
      ...features.map((f) => ({ id: f.id as string | null, title: f.name })),
      none("No feature"),
    ].map((g) => ({
      id: g.id ?? "none",
      title: g.title,
      start: g.id ? `feature=${g.id}` : "",
      tickets: by((t) => t.feature, g.id),
      drop: (ticket) => act("tickets.ticket-feature-set", { ticket, feature: g.id }),
    }));
  } else if (view === "actors") {
    groups = [
      none("Unassigned"),
      ...catalog.actors
        .filter((a) => !a.archived)
        .map((a) => ({ id: a.id as string | null, title: a.name }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    ].map((g) => ({
      id: g.id ?? "none",
      title: g.title,
      start: g.id ? `assignee=${g.id}` : "",
      tickets: by((t) => t.assignee, g.id),
      drop: (ticket) => act("tickets.ticket-assign", { ticket, actor: g.id }),
    }));
  } else if (view === "locations") {
    groups = [
      none("Unassigned"),
      ...catalog.locations
        .filter((l) => !l.archived)
        .map((l) => ({ id: l.id as string | null, title: l.name }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    ].map((g) => ({
      id: g.id ?? "none",
      title: g.title,
      start: g.id ? `location=${g.id}` : "",
      tickets: by((t) => t.location, g.id),
      drop: (ticket) => act("tickets.ticket-location-set", { ticket, location: g.id }),
    }));
  } else {
    groups = (board?.columns ?? [])
      .filter((c) => !filters.hideDone || c.kind !== "done")
      .map((c) => ({
        id: c.id,
        title: c.name,
        kind: c.kind,
        start: `column=${c.id}`,
        tickets: by((t) => t.column.id, c.id),
        drop: (ticket) => act("tickets.ticket-move", { ticket, column: c.id }),
      }));
  }
  if (filters.hideEmpty) groups = groups.filter((g) => g.tickets.length > 0);

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
      wide
      title={title(project)}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <TooltipProvider>
            <ToggleGroup
              type="single"
              aria-label="Board view"
              className="gap-1 rounded-lg border p-1"
              value={view}
              onValueChange={(v) => {
                if (v) set({ view: v as View });
              }}
            >
              {VIEWS.map(({ id, label, Icon }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value={id}
                      aria-label={`${label} view`}
                      // The tooltip takes over data-state, so the chosen view is marked by class.
                      className={`size-8 p-0 ${view === id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}`}
                    >
                      <Icon size={18} aria-hidden />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </ToggleGroup>
          </TooltipProvider>
          <Display project={project} />
          <EditLink to={`/p/${project.id}/columns`} label="Edit columns" />
          <PrimaryLink to={`/p/${project.id}/new`}>New ticket</PrimaryLink>
        </div>
      }
    >
      <FilterBar
        filters={filters}
        set={set}
        features={features}
        right={
          <>
            <Tick
              label="Hide done"
              checked={filters.hideDone}
              onChange={(hideDone) => set({ hideDone })}
            />
            <Tick
              label="Hide empty columns"
              checked={filters.hideEmpty}
              onChange={(hideEmpty) => set({ hideEmpty })}
            />
          </>
        }
      />
      {missing.length > 0 && (
        <p className="tk-muted">{`This board has ${missing.map((k) => warn[k]).join("; ")}.`}</p>
      )}
      {groups.length > 0 && (
        <h2 className="m-0 text-sm font-semibold">{VIEWS.find((v) => v.id === view)?.heading}</h2>
      )}
      {groups.length > 0 ? (
        <Lanes label={`The board of ${project.name}, by ${view}`}>
          {groups.map((g) => (
            <Lane
              key={g.id}
              id={`column-${g.id}`}
              title={g.title}
              {...(g.kind ? { icon: <StatusIcon kind={g.kind} /> } : {})}
              count={g.tickets.length}
              addTo={`/p/${project.id}/new?${g.start}`}
              onDrop={(ticket) => void g.drop(ticket)}
            >
              {g.tickets.map((t) => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </Lane>
          ))}
        </Lanes>
      ) : (
        <Nothing text="No tickets match. Untick Hide empty columns to show every column." />
      )}
      <TicketDialog />
    </PageBody>
  );
}

const none = (title: string) => ({ id: null as string | null, title });

export function BacklogPage({ project }: { project: Project }) {
  const { act } = useApp();
  const [filters, set] = useFilters(`tasks.backlog.${project.id}`);
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id }) ?? [];
  const backlog = useRead<Ticket[]>("tickets.backlog-read", { project: project.id });
  const tickets = narrowed(backlog ?? [], filters);
  return (
    <PageBody
      wide
      title={title(project, "Backlog")}
      line="Tickets wait here until you put them on the board. Agents looking for work do not see them."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Display project={project} />
          <PrimaryLink to={`/p/${project.id}/new?backlog=1`}>New ticket</PrimaryLink>
        </div>
      }
    >
      <FilterBar filters={filters} set={set} features={features} />
      {tickets.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void act("tickets.ticket-board-send", { ticket: t.id });
                  }}
                >
                  To the board
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <Nothing
          text={
            backlog && backlog.length > 0
              ? "No tickets match these filters."
              : "The backlog is empty. A new ticket made here waits until you put it on the board."
          }
        />
      )}
      <TicketDialog />
    </PageBody>
  );
}
