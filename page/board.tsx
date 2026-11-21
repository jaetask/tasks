import {
  EmptyLine,
  Field,
  type FilterChoice,
  FilterMenu,
  FormDialog,
  IconAction,
  InlineText,
  Link,
  ListCard,
  PageControls,
  PageGroup,
  PageGroups,
  ProjectIcon,
  PropertyPills,
  RowMenu,
  type ViewChoice as SuiteViewChoice,
  ViewToggle,
  WorkPage,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@jaetask/toolkit/ui/dialog";
import { Input } from "@jaetask/toolkit/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@jaetask/toolkit/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@jaetask/toolkit/ui/toggle-group";
import {
  IconAdjustmentsHorizontal,
  IconCircleCheck,
  IconLayoutKanban,
  IconList,
  IconMapPin,
  IconPlus,
  IconStack2,
  IconStopwatch,
  IconUsers,
} from "@tabler/icons-react";
import { Children, type DragEvent, type ReactNode, useEffect, useState } from "react";
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
import { ServiceIcon, service } from "@jaetask/toolkit/suite";
import { ActorAvatar, Picker, projectLook, NoActor, Tick, TICKET_DRAG } from "./local.js";
export { Tick };
import { LabelDot, labelChoice, PRIORITY_NAME, PriorityIcon, StatusIcon } from "./pickers.js";
import { TicketLine } from "./ticket-line.js";
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
import { newTicketAt, useNewTicketKey } from "./new-ticket.js";
import { TicketView } from "./ticket.js";
import { TicketMenu } from "./ticket-menu.js";

export const VIEWS: readonly ViewChoice[] = [
  { id: "status", label: "Status", Icon: IconCircleCheck, heading: "Progress" },
  { id: "features", label: "Features", Icon: IconStack2, heading: "Features" },
  { id: "actors", label: "Actors", Icon: IconUsers, heading: "Who is working" },
  { id: "locations", label: "Locations", Icon: IconMapPin, heading: "Where work happens" },
];
type View = "features" | "actors" | "locations" | "status" | "projects";
type ViewChoice = SuiteViewChoice<View> & { heading: string };

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
  projects: string[];
  layout: Layout | "";
};
export type Layout = "list" | "board";
export type { Filters, View, ViewChoice };
const ALL: Filters = {
  view: "status",
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
  projects: [],
  layout: "",
};

export function useFilters(
  key: string,
  start: Partial<Filters> = {},
): [Filters, (patch: Partial<Filters>) => void] {
  const read = (): Filters => {
    try {
      return { ...ALL, ...start, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
    } catch {
      return { ...ALL, ...start };
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
      } catch {}
    },
  ];
}

const matches = (wanted: string, value: string | null) =>
  wanted === "" || (wanted === "none" ? value === null : value === wanted);

export function narrowed(tickets: Ticket[], f: Filters): Ticket[] {
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

export function FilterBar({
  filters,
  set,
  features,
  projects,
  right,
}: {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  features?: Feature[];
  projects?: Project[];
  right?: ReactNode;
}) {
  const { catalog } = useApp();
  const one = (value: string) => (value ? [value] : []);
  const choices: FilterChoice[] = [
    ...(projects
      ? [
          {
            id: "projects",
            label: "Project",
            many: true,
            options: projects.map((p) => ({ id: p.id, name: p.name })),
          },
        ]
      : []),
    {
      id: "actor",
      label: "Actor",
      options: [
        { id: "none", name: "Unassigned" },
        ...catalog.actors.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name })),
      ],
    },
    ...(features
      ? [
          {
            id: "feature",
            label: "Feature",
            options: [
              { id: "none", name: "No feature" },
              ...features.map((f) => ({ id: f.id, name: f.name })),
            ],
          },
        ]
      : []),
    {
      id: "location",
      label: "Location",
      options: [
        { id: "none", name: "No location" },
        ...catalog.locations.map((l) => ({ id: l.id, name: l.name })),
      ],
    },
    {
      id: "label",
      label: "Label",
      options: catalog.labels.map(labelChoice),
    },
    { id: "type", label: "Type", options: TYPES.map((t) => ({ id: t, name: titleCase(t) })) },
    {
      id: "priority",
      label: "Priority",
      options: PRIORITIES.map((p) => ({ id: p, name: PRIORITY_NAME[p] })),
    },
    {
      id: "due",
      label: "Due date",
      options: [
        { id: "overdue", name: "Overdue" },
        { id: "upcoming", name: "Not overdue" },
        { id: "any", name: "Has a due date" },
        { id: "none", name: "No due date" },
      ],
    },
  ];
  return (
    <PageControls>
      <Input
        aria-label="Search tickets"
        placeholder="Search this page..."
        className="h-8 max-w-56"
        value={filters.text}
        onChange={(e) => set({ text: e.target.value })}
      />
      <FilterMenu
        filters={choices}
        values={{
          projects: filters.projects,
          actor: one(filters.actor),
          feature: one(filters.feature),
          location: one(filters.location),
          label: one(filters.label),
          type: one(filters.type),
          priority: one(filters.priority),
          due: one(filters.due),
        }}
        onChange={(id, chosen) =>
          set(id === "projects" ? { projects: chosen } : { [id]: chosen[0] ?? "" })
        }
      />
      {right && <div className="ml-auto flex flex-wrap items-center gap-4">{right}</div>}
    </PageControls>
  );
}

export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const DRAG = TICKET_DRAG;

const _KIND_DOT: Record<Kind, string> = {
  todo: "bg-muted-foreground/50",
  doing: "bg-amber-500",
  waiting: "bg-violet-500",
  done: "bg-emerald-500",
};
const since = (at: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (60 * 24))}d`;
};
const shortDate = (at: string) => {
  const date = new Date(at);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
};
const PILL =
  "inline-flex h-6 items-center gap-1.5 rounded-full border bg-transparent px-2 text-xs font-normal";

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

export function TicketCard({
  ticket,
  action,
  show,
  across,
}: {
  ticket: Ticket;
  action?: ReactNode;
  across?: boolean;
  show?: readonly string[];
}) {
  const { catalog, go, path } = useApp();
  const [hovered, setHovered] = useState(false);
  const project = catalog.projects.find((p) => p.id === ticket.project);
  const actor = catalog.actors.find((a) => a.id === ticket.assignee);
  const shown = new Set(show ?? project?.card ?? []);
  const has = (property: string) => shown.has(property);
  const open = () => go(`${path}?ticket=${ticket.id}`);
  const avatar = actor && <ActorAvatar id={actor.id} name={actor.name} />;
  const status = <StatusIcon kind={ticket.column.kind} backlog={ticket.backlog} />;
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
    <TicketMenu ticket={ticket}>
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
          const target = e.target as HTMLElement;
          if (!e.currentTarget.contains(target) || target.closest("[data-chip]")) return;
          open();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target === e.currentTarget) open();
        }}
        className={`ticket grid cursor-pointer gap-3 rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md ${bare ? "px-3 py-2" : "p-4"}`}
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
              {has("priority") && (ticket.priority !== "none" || hovered) && (
                <PriorityPicker ticket={ticket} armed={hovered}>
                  <Chip className="gap-1 text-muted-foreground" aria-label="Priority">
                    <PriorityIcon priority={ticket.priority} />
                    {ticket.priority !== "none" && titleCase(ticket.priority)}
                  </Chip>
                </PriorityPicker>
              )}
              {has("actor") && !together && (
                <ActorPicker ticket={ticket} armed={hovered}>
                  <Chip aria-label="Actor">{avatar ?? <NoActor size={20} />}</Chip>
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
                {avatar || <NoActor size={20} />}
                {actor ? actor.name : <span className="text-muted-foreground">No actor</span>}
              </Chip>
            </ActorPicker>
          </div>
        )}
        {has("feature") && ticket.featureName && (
          <FeaturePicker ticket={ticket}>
            <Chip className="justify-start whitespace-normal text-left text-muted-foreground">
              {ticket.featureName}
            </Chip>
          </FeaturePicker>
        )}
        {(pills || (across && project)) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {across && project && (
              <Chip asChild className={PILL}>
                <Link href={`/p/${project.id}/board`} aria-label={`The board of ${project.name}`}>
                  <ProjectIcon {...projectLook(project)} size={12} />
                  {project.name}
                </Link>
              </Chip>
            )}
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
                    <ServiceIcon url={urls[0] ?? ""} size={12} />
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
    </TicketMenu>
  );
}

const LANE_FIRST = 30;
const LANE_MORE = 100;

export function Lane({
  id,
  title,
  icon,
  count,
  addTo,
  menu,
  empty = "No tickets here",
  rename,
  onDrop,
  children,
}: {
  menu?: ReactNode;
  empty?: string;
  rename?: {
    editing: boolean;
    onEditing: (editing: boolean) => void;
    onSave: (name: string) => void;
  };
  id: string;
  title: string;
  icon?: ReactNode;
  count: number;
  addTo?: string;
  onDrop?: (ticket: string) => void;
  children?: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const [shown, setShown] = useState(LANE_FIRST);
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
          {rename ? (
            <InlineText
              value={title}
              label={`Rename the column ${title}`}
              className="text-sm font-medium"
              editing={rename.editing}
              onEditingChange={rename.onEditing}
              onSave={rename.onSave}
            />
          ) : (
            title
          )}
          <span className="text-xs font-normal text-muted-foreground">{count}</span>
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
          {menu}
        </span>
      </div>
      <div className="grid gap-3">
        {count > 0 ? (
          <>
            {Children.toArray(children).slice(0, shown)}
            {count > shown && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setShown(shown + LANE_MORE)}
              >
                {`Show ${Math.min(LANE_MORE, count - shown)} more of ${count - shown}`}
              </Button>
            )}
          </>
        ) : (
          <p className="lane-empty rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}

export function Lanes({
  label,
  after,
  children,
}: {
  label: string;
  after?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-4">
        {children}
        {after}
      </div>
    </section>
  );
}

function TicketTitle({ id }: { id: string }) {
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  return <DialogTitle className="sr-only">{ticket?.title ?? id}</DialogTitle>;
}

export function TicketDialog() {
  const { query, path, go } = useApp();
  const id = query.get("ticket");
  if (!id) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && go(path)}>
      <DialogContent
        motion="instant"
        className="inset-0 m-auto h-[90vh] w-[min(64rem,95vw)] max-w-none translate-none content-start overflow-y-auto"
      >
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

export function LayoutChoice({
  value,
  onChange,
}: {
  value: Layout;
  onChange: (layout: Layout) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Show as"
      className="grid grid-cols-2 gap-2"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as Layout);
      }}
    >
      <ToggleGroupItem value="list" className="gap-2">
        <IconList size={16} aria-hidden />
        List
      </ToggleGroupItem>
      <ToggleGroupItem value="board" className="gap-2">
        <IconLayoutKanban size={16} aria-hidden />
        Board
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function Display({
  project,
  layout,
  onLayout,
}: {
  project?: Project;
  layout: Layout;
  onLayout: (layout: Layout) => void;
}) {
  const { act } = useApp();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Display"
          title="Display"
          className="text-muted-foreground [&_svg]:size-4"
        >
          <IconAdjustmentsHorizontal aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-80 gap-3">
        <LayoutChoice value={layout} onChange={onLayout} />
        {project && (
          <>
            <p className="m-0 border-t pt-3 text-xs font-medium text-muted-foreground">
              Display properties
            </p>
            <PropertyPills
              label="Display properties"
              options={CARD_PROPERTIES}
              value={project.card}
              onChange={(show) =>
                void act("catalog.project-card-set", { project: project.id, show })
              }
            />
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <span className="text-xs font-medium text-muted-foreground">Ordering</span>
              <Picker
                label="Ordering"
                value={project.ordering}
                options={ORDERINGS}
                className="h-8 w-36"
                onChange={(ordering) =>
                  void act("catalog.project-ordering-set", { project: project.id, ordering })
                }
              />
            </div>
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
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function GroupList({
  groups,
  across,
}: {
  groups: { id: string; title: string; icon?: ReactNode; tickets: Ticket[] }[];
  across?: boolean;
}) {
  return (
    <PageGroups>
      {groups.map((g) => (
        <PageGroup key={g.id} title={g.title} icon={g.icon} count={g.tickets.length}>
          {g.tickets.length > 0 && (
            <ListCard>
              {g.tickets.map((t) => (
                <TicketLine key={t.id} ticket={t} status={across ?? false} />
              ))}
            </ListCard>
          )}
        </PageGroup>
      ))}
    </PageGroups>
  );
}

const ORDERINGS = [
  { id: "created", name: "Created" },
  { id: "priority", name: "Priority" },
  { id: "due", name: "Due date" },
  { id: "updated", name: "Updated" },
];
const RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
export function ordered(tickets: Ticket[], ordering: Project["ordering"]): Ticket[] {
  if (ordering === "created") return tickets;
  const key = (t: Ticket): number | string =>
    ordering === "priority"
      ? (RANK[t.priority] ?? 4)
      : ordering === "due"
        ? (t.due ?? "9999")
        : -Date.parse(t.updatedAt);
  return [...tickets].sort((a, b) => {
    const [x, y] = [key(a), key(b)];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

function ColumnMenu({
  project,
  column,
  name,
  count,
  onRename,
}: {
  project: Project;
  column: string;
  name: string;
  count: number;
  onRename: () => void;
}) {
  const { act } = useApp();
  const at = project.columns.findIndex((c) => c.id === column);
  const kind = project.columns[at]?.kind;
  const move = (before: string | undefined) =>
    void act("catalog.column-move", { column, ...(before ? { before } : {}) });
  return (
    <RowMenu
      label={`Column ${name}`}
      items={[
        { label: "Rename", onSelect: onRename },
        {
          label: "It means",
          items: (Object.keys(KINDS) as Kind[]).map((k) => ({
            label: KIND_TITLE[k],
            ...(k === kind ? { hint: "now" } : {}),
            onSelect: () => void act("catalog.column-kind-set", { column, kind: k }),
          })),
        },
        {
          label: "Move left",
          disabled: at <= 0,
          onSelect: () => move(project.columns[at - 1]?.id),
        },
        {
          label: "Move right",
          disabled: at < 0 || at >= project.columns.length - 1,
          onSelect: () => move(project.columns[at + 2]?.id),
        },
        "line",
        {
          label: "Archive all",
          disabled: count === 0,
          onSelect: () => void act("tickets.column-archive", { column }),
        },
        {
          label: "Remove column",
          disabled: project.columns.length === 1,
          onSelect: () => void act("catalog.column-remove", { column }),
        },
      ]}
    />
  );
}

export const KIND_TITLE: Record<Kind, string> = {
  todo: "To do",
  doing: "Doing",
  waiting: "Review",
  done: "Done",
};

function AddColumn({ project }: { project: Project }) {
  const { act } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("waiting");
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Add a column"
        title="Add a column"
        className="mt-2 shrink-0 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <IconPlus size={16} aria-hidden />
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New column"
        line={`It goes last on the board of ${project.name}; move it from its menu.`}
        saveLabel="Add column"
        onSave={async () => {
          const made = await act("catalog.column-add", { project: project.id, name, kind });
          if (made) setName("");
          return made !== null;
        }}
      >
        <Field label="Name" htmlFor="column-name">
          <Input
            id="column-name"
            autoFocus
            required
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label="It means"
          hint="What a ticket in it is: waiting to start, being worked on, waiting for review, or done."
        >
          <Picker
            label="It means"
            value={kind}
            className="w-full"
            onChange={(v) => setKind(v as Kind)}
            options={(Object.keys(KINDS) as Kind[]).map((k) => ({ id: k, name: KIND_TITLE[k] }))}
          />
        </Field>
      </FormDialog>
    </>
  );
}

export type Group = {
  id: string;
  title: string;
  kind?: Kind;
  start: string;
  tickets: Ticket[];
  drop: (ticket: string) => unknown;
};

const title = (project: Project, screen?: string) =>
  `${project.name}${screen ? ` · ${screen}` : ""}`;
export const titleIcon = (project: Project) => <ProjectIcon {...projectLook(project)} size={18} />;

export function BoardPage({ project }: { project: Project }) {
  const { catalog, act, path } = useApp();
  const [renaming, setRenaming] = useState<string | null>(null);
  useNewTicketKey(true);
  const [filters, set] = useFilters(`tasks.board.${project.id}`);
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id }) ?? [];
  const board = useRead<BoardData>("tickets.board-read", { project: project.id });
  const view = filters.view;
  const layout = filters.layout || "board";
  const { query } = useApp();
  const asked = query.get("feature");
  const where = query.get("location");
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the address asks for one
  useEffect(() => {
    if (asked && asked !== filters.feature) set({ feature: asked });
    if (where && where !== filters.location) set({ location: where });
  }, [asked, where]);

  const all = narrowed(
    (board?.columns ?? []).flatMap((c) => c.tickets),
    filters,
  );
  const shown =
    filters.hideDone && view !== "status" ? all.filter((t) => t.column.kind !== "done") : all;
  const by = (key: (t: Ticket) => string | null, id: string | null) =>
    ordered(
      shown.filter((t) => key(t) === id),
      project.ordering,
    );

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
    <WorkPage
      wide
      icon={titleIcon(project)}
      title={title(project)}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle views={VIEWS} value={view} onChange={(v) => set({ view: v })} />
          <Display project={project} layout={layout} onLayout={(l) => set({ layout: l })} />
          <IconAction
            primary
            label="New ticket"
            icon={<IconPlus aria-hidden />}
            href={newTicketAt(path)}
          />
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
      {groups.length > 0 && layout === "list" ? (
        <GroupList
          groups={groups.map((g) => ({
            ...g,
            ...(g.kind ? { icon: <StatusIcon kind={g.kind} /> } : {}),
          }))}
        />
      ) : groups.length > 0 ? (
        <Lanes
          label={`The board of ${project.name}, by ${view}`}
          {...(view === "status" ? { after: <AddColumn project={project} /> } : {})}
        >
          {groups.map((g) => (
            <Lane
              key={g.id}
              id={`column-${g.id}`}
              title={g.title}
              {...(g.kind ? { icon: <StatusIcon kind={g.kind} /> } : {})}
              count={g.tickets.length}
              {...(view === "status"
                ? {
                    menu: (
                      <ColumnMenu
                        project={project}
                        column={g.id}
                        name={g.title}
                        count={g.tickets.length}
                        onRename={() => setRenaming(g.id)}
                      />
                    ),
                    rename: {
                      editing: renaming === g.id,
                      onEditing: (on: boolean) => setRenaming(on ? g.id : null),
                      onSave: (name: string) =>
                        void act("catalog.column-rename", { column: g.id, name }),
                    },
                  }
                : {})}
              addTo={newTicketAt(path, g.start)}
              onDrop={(ticket) => void g.drop(ticket)}
            >
              {g.tickets.map((t) => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </Lane>
          ))}
        </Lanes>
      ) : (
        <EmptyLine>No tickets match. Untick Hide empty columns to show every column.</EmptyLine>
      )}
      <TicketDialog />
    </WorkPage>
  );
}

const none = (title: string) => ({ id: null as string | null, title });

export function BacklogPage({ project }: { project: Project }) {
  const { path } = useApp();
  useNewTicketKey(true);
  const [filters, set] = useFilters(`tasks.backlog.${project.id}`);
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id }) ?? [];
  const backlog = useRead<Ticket[]>("tickets.backlog-read", { project: project.id });
  const tickets = ordered(narrowed(backlog ?? [], filters), project.ordering);
  const layout = filters.layout || "list";
  return (
    <WorkPage
      wide
      icon={titleIcon(project)}
      title={title(project, "Backlog")}
      help="Tickets wait here until you put them on the board. Agents looking for work do not see them. To put one on the board, drag it onto Board in the sidebar, or right click it."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Display project={project} layout={layout} onLayout={(l) => set({ layout: l })} />
          <IconAction
            primary
            label="New ticket"
            icon={<IconPlus aria-hidden />}
            href={newTicketAt(path, "backlog=1")}
          />
        </div>
      }
    >
      <FilterBar filters={filters} set={set} features={features} />
      {tickets.length > 0 && layout === "board" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      ) : tickets.length > 0 ? (
        <ListCard>
          {tickets.map((t) => (
            <TicketLine key={t.id} ticket={t} status={false} />
          ))}
        </ListCard>
      ) : (
        <EmptyLine>
          {!backlog
            ? ""
            : backlog.length > 0
              ? "No tickets match these filters."
              : "The backlog is empty. A new ticket made here waits until you put it on the board."}
        </EmptyLine>
      )}
      <TicketDialog />
    </WorkPage>
  );
}
