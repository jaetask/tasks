import { EmptyLine, ProjectIcon, ViewToggle, WorkPage } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { IconCircleCheck, IconFolders, IconMapPin, IconUsers } from "@tabler/icons-react";
import { type ReactNode, useEffect, useState } from "react";
import { KINDS, type Kind, type Overview, type Ticket } from "./api.js";
import { useApp, useRead } from "./app.js";
import {
  Display,
  FilterBar,
  GroupList,
  KIND_TITLE,
  Lane,
  Lanes,
  narrowed,
  Tick,
  TicketCard,
  TicketDialog,
  useFilters,
  type ViewChoice,
} from "./board.js";
import { projectLook } from "./local.js";
import { newTicketAt, useNewTicketKey } from "./new-ticket.js";
import { StatusIcon } from "./pickers.js";
import { NewProjectDialog } from "./settings.js";

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

function FirstProject() {
  const [adding, setAdding] = useState(false);
  return (
    <WorkPage title="Overview" help="Every project's tickets, lined up by what their column means.">
      <EmptyLine>
        A project is a body of work, such as an app. Create your first to get a board.
      </EmptyLine>
      <div>
        <Button onClick={() => setAdding(true)}>Create a project</Button>
      </div>
      <NewProjectDialog open={adding} onOpenChange={setAdding} />
    </WorkPage>
  );
}

export function OverviewPage() {
  const { catalog, act, query } = useApp();
  const projects = catalog.projects.filter((p) => !p.archived);
  const [filters, set] = useFilters("tasks.overview", { view: "status", hideDone: true });
  useNewTicketKey(projects.length > 0);
  const overview = useRead<Overview>("tickets.overview-read", {});
  const asked = query.get("actor");
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the address asks for an actor
  useEffect(() => {
    if (asked && asked !== filters.actor) set({ actor: asked });
  }, [asked]);
  if (projects.length === 0) return <FirstProject />;
  const view = VIEWS.some((v) => v.id === filters.view) ? filters.view : "status";
  const layout = filters.layout || "board";
  const every = (overview?.kinds ?? []).flatMap((k) => k.tickets);
  const chosen = filters.projects.filter((id) => projects.some((p) => p.id === id));
  const all = narrowed(
    every.filter((t) => chosen.length === 0 || chosen.includes(t.project)),
    { ...filters, feature: "" },
  );
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
        addTo: newTicketAt("/overview", `project=${p.id}`),
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
    const drop = (id: string, kind: Kind) => {
      const project = projects.find((p) => id.startsWith(`${p.id}-`));
      const column = project?.columns.find((c) => c.kind === kind);
      if (column) return act("tickets.ticket-move", { ticket: id, column: column.id });
    };
    groups = (Object.keys(KINDS) as Kind[])
      .filter((kind) => !filters.hideDone || kind !== "done")
      .map((kind) => ({
        id: kind,
        title: KIND_TITLE[kind],
        icon: <StatusIcon kind={kind} />,
        tickets: by((t) => t.column.kind, kind),
        drop: (ticket: string) => drop(ticket, kind),
      }));
  }
  if (filters.hideEmpty) groups = groups.filter((g) => g.tickets.length > 0);

  return (
    <WorkPage
      wide
      title="Overview"
      help="Every project's open tickets on one board. Drag a ticket to change what the view groups by."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle views={VIEWS} value={view} onChange={(v) => set({ view: v })} />
          <Display layout={layout} onLayout={(l) => set({ layout: l })} />
        </div>
      }
    >
      <FilterBar
        filters={filters}
        set={set}
        projects={projects}
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
      {groups.length > 0 && layout === "list" ? (
        <GroupList groups={groups} across />
      ) : groups.length > 0 ? (
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
        <EmptyLine>No tickets match. Untick Hide empty columns to show every column.</EmptyLine>
      )}
      <TicketDialog />
    </WorkPage>
  );
}
