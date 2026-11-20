// The Overview: every project's open tickets on one board, grouped by project, actor, location or
// status, with the same filters as a project's board.
import { PageBody, PageLink, Panel, ProjectIcon, ViewToggle } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@jaetask/toolkit/ui/dropdown-menu";
import {
  IconChevronDown,
  IconCircleCheck,
  IconFolders,
  IconMapPin,
  IconUsers,
} from "@tabler/icons-react";
import { type ReactNode, useEffect } from "react";
import { KINDS, type Kind, type Overview, type Ticket } from "./api.js";
import { useApp, useRead } from "./app.js";
import {
  FilterBar,
  Lane,
  Lanes,
  narrowed,
  Tick,
  TicketCard,
  TicketDialog,
  useFilters,
  type ViewChoice,
} from "./board.js";
import { Nothing, projectLook } from "./local.js";
import { StatusIcon } from "./pickers.js";

const VIEWS: readonly ViewChoice[] = [
  { id: "status", label: "Status", Icon: IconCircleCheck, heading: "Progress" },
  { id: "projects", label: "Projects", Icon: IconFolders, heading: "Projects" },
  { id: "actors", label: "Actors", Icon: IconUsers, heading: "Who is working" },
  { id: "locations", label: "Locations", Icon: IconMapPin, heading: "Where work happens" },
];

type Group = {
  id: string;
  title: string;
  icon?: ReactNode;
  addTo?: string;
  tickets: Ticket[];
  drop?: (ticket: string) => unknown;
};

export function OverviewPage() {
  const { catalog, act, query } = useApp();
  const projects = catalog.projects.filter((p) => !p.archived);
  const [filters, set] = useFilters("tasks.overview", { view: "status" });
  const overview = useRead<Overview>("tickets.overview-read", {});
  // The arrow beside a ticket's actor opens the Overview narrowed to that actor.
  const asked = query.get("actor");
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the address asks for an actor
  useEffect(() => {
    if (asked && asked !== filters.actor) set({ actor: asked });
  }, [asked]);
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
  const view = VIEWS.some((v) => v.id === filters.view) ? filters.view : "status";
  const every = (overview?.kinds ?? []).flatMap((k) => k.tickets);
  const chosen = filters.projects.filter((id) => projects.some((p) => p.id === id));
  const all = narrowed(
    every.filter((t) => chosen.length === 0 || chosen.includes(t.project)),
    { ...filters, feature: "" },
  );
  // In the status view "Hide done" hides the done lane; in the others, the tickets that are done.
  const shown =
    filters.hideDone && view !== "status" ? all.filter((t) => t.column.kind !== "done") : all;
  const by = (key: (t: Ticket) => string | null, id: string | null) =>
    shown.filter((t) => key(t) === id);
  const named = <T extends { id: string; name: string; archived: boolean }>(list: T[]) =>
    list.filter((x) => !x.archived).sort((a, b) => a.name.localeCompare(b.name));

  let groups: Group[];
  if (view === "projects") {
    groups = projects
      .filter((p) => chosen.length === 0 || chosen.includes(p.id))
      .map((p) => ({
        id: p.id,
        title: p.name,
        icon: <ProjectIcon {...projectLook(p)} size={16} />,
        addTo: `/p/${p.id}/new`,
        tickets: by((t) => t.project, p.id),
      }));
  } else if (view === "actors") {
    groups = [{ id: null as string | null, name: "Unassigned" }, ...named(catalog.actors)].map(
      (a) => ({
        id: a.id ?? "none",
        title: a.name,
        tickets: by((t) => t.assignee, a.id),
        drop: (ticket: string) => act("tickets.ticket-assign", { ticket, actor: a.id }),
      }),
    );
  } else if (view === "locations") {
    groups = [{ id: null as string | null, name: "Unassigned" }, ...named(catalog.locations)].map(
      (l) => ({
        id: l.id ?? "none",
        title: l.name,
        tickets: by((t) => t.location, l.id),
        drop: (ticket: string) => act("tickets.ticket-location-set", { ticket, location: l.id }),
      }),
    );
  } else {
    // Dropping a ticket on a kind moves it to its own board's first column of that kind.
    const drop = (id: string, kind: Kind) => {
      const project = projects.find((p) => id.startsWith(`${p.id}-`));
      const column = project?.columns.find((c) => c.kind === kind);
      if (column) return act("tickets.ticket-move", { ticket: id, column: column.id });
    };
    groups = (Object.keys(KINDS) as Kind[])
      .filter((kind) => !filters.hideDone || kind !== "done")
      .map((kind) => ({
        id: kind,
        title: KINDS[kind],
        icon: <StatusIcon kind={kind} />,
        tickets: by((t) => t.column.kind, kind),
        drop: (ticket: string) => drop(ticket, kind),
      }));
  }
  if (filters.hideEmpty) groups = groups.filter((g) => g.tickets.length > 0);

  return (
    <PageBody
      wide
      title="Overview"
      line="Every project's open tickets on one board. Drag a ticket to change what the view groups by."
      action={<ViewToggle views={VIEWS} value={view} onChange={(v) => set({ view: v })} />}
    >
      <FilterBar
        filters={filters}
        set={set}
        lead={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" aria-label="Filter projects">
                {chosen.length === 0 ? "All projects" : `Projects (${chosen.length})`}
                <IconChevronDown size={16} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {projects.map((p) => (
                <DropdownMenuCheckboxItem
                  key={p.id}
                  checked={chosen.includes(p.id)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(on) =>
                    set({
                      projects: on ? [...chosen, p.id] : chosen.filter((id) => id !== p.id),
                    })
                  }
                >
                  {p.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        right={
          <>
            <span className="text-xs text-muted-foreground">{`${shown.length} of ${every.length} tickets`}</span>
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
      {groups.length > 0 && (
        <h2 className="m-0 text-sm font-semibold">{VIEWS.find((v) => v.id === view)?.heading}</h2>
      )}
      {groups.length > 0 ? (
        <Lanes label={`Every project's tickets, by ${view}`}>
          {groups.map((g) => (
            <Lane
              key={g.id}
              id={`group-${g.id}`}
              title={g.title}
              count={g.tickets.length}
              {...(g.icon ? { icon: g.icon } : {})}
              {...(g.addTo ? { addTo: g.addTo } : {})}
              {...(g.drop ? { onDrop: (ticket: string) => void g.drop?.(ticket) } : {})}
            >
              {g.tickets.map((t) => (
                <TicketCard key={t.id} ticket={t} across={view !== "projects"} />
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
