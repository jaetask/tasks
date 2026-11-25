import { type Entity, EntityNav, Link, ProjectIcon } from "@jaetask/toolkit/suite";
import { ContextMenuItem } from "@jaetask/toolkit/ui/context-menu";
import {
  IconInbox,
  IconLayersIntersect,
  IconLayoutKanban,
  IconList,
  IconStack2,
} from "@tabler/icons-react";
import type { DragEvent } from "react";
import type { Feature, Project } from "./api.js";
import { useApp, useRead } from "./app.js";
import { projectLook, TICKET_DRAG } from "./local.js";

const STORE = "tasks:nav-expanded";

function Favourites({ project, feature }: { project: Project; feature: string | null }) {
  const features = useRead<Feature[]>("tickets.feature-find", { project: project.id }) ?? [];
  return (
    <>
      {features
        .filter((f) => f.favourite)
        .map((f) => (
          <Link
            key={f.id}
            href={`/p/${project.id}/board?feature=${encodeURIComponent(f.id)}`}
            aria-current={feature === f.id ? "page" : undefined}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-foreground"
            title={f.name}
          >
            <IconLayersIntersect size={15} className="shrink-0" />
            <span className="truncate">{f.name}</span>
          </Link>
        ))}
    </>
  );
}

export function ProjectsNav({ collapsed }: { collapsed: boolean }) {
  const { catalog, act, go, path, query } = useApp();
  const parts = path.split("/").filter(Boolean);
  const selected = parts[0] === "p" ? (parts[1] ?? null) : null;
  const screen = selected ? (parts[2] ?? "board") : null;
  const selectedFeature = screen === "board" ? query.get("feature") : null;
  const projects = catalog.projects.filter((p) => !p.archived);

  const ticketDrop = (id: "backlog" | "board") => ({
    accepts: (e: DragEvent) => e.dataTransfer.types.includes(TICKET_DRAG),
    onDrop: (e: DragEvent) => {
      const ticket = e.dataTransfer.getData(TICKET_DRAG);
      if (!ticket) return;
      void act(id === "board" ? "tickets.ticket-board-send" : "tickets.ticket-backlog-send", {
        ticket,
      });
    },
  });

  const entities: Entity[] = projects.map((p) => {
    const here = selected === p.id;
    const onBoard = here && (screen === "board" || screen === "columns") && !selectedFeature;
    return {
      id: p.id,
      name: p.name,
      href: `/p/${p.id}/board`,
      mark: <ProjectIcon {...projectLook(p)} size={18} />,
      current: here && screen === "board" && !selectedFeature,
      menu: (
        <ContextMenuItem onSelect={() => go("/settings/projects")}>
          Project settings
        </ContextMenuItem>
      ),
      links: [
        {
          key: "intake",
          label: "Intake",
          href: `/p/${p.id}/intake`,
          icon: <IconInbox size={16} className="shrink-0" />,
          current: here && screen === "intake" && !selectedFeature,
        },
        {
          key: "backlog",
          label: "Backlog",
          href: `/p/${p.id}/backlog`,
          icon: <IconList size={16} className="shrink-0" />,
          current: here && screen === "backlog" && !selectedFeature,
          drop: ticketDrop("backlog"),
        },
        {
          key: "board",
          label: "Board",
          href: `/p/${p.id}/board`,
          icon: <IconLayoutKanban size={16} className="shrink-0" />,
          current: onBoard,
          drop: ticketDrop("board"),
        },
        {
          key: "features",
          label: "Features",
          href: `/p/${p.id}/features`,
          icon: <IconStack2 size={16} className="shrink-0" />,
          current: here && screen === "features",
          openNested: here && !!selectedFeature,
          nested: () => <Favourites project={p} feature={here ? selectedFeature : null} />,
        },
      ],
    };
  });

  async function move(id: string, target: number) {
    const rest = projects.filter((p) => p.id !== id);
    const before = rest[target];
    await act("catalog.project-move", { project: id, ...(before ? { before: before.id } : {}) });
  }

  return (
    <EntityNav
      label="Projects"
      entities={entities}
      collapsed={collapsed}
      selected={selected}
      storageKey={STORE}
      kind="project"
      onMove={move}
    />
  );
}
