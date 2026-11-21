// The projects in the sidebar: each opens to its Intake, Backlog, Board and
// Features, with its favourite features under Features. A project can be
// dragged, or moved up and down, to reorder the list.
import { Link, ProjectIcon } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@jaetask/toolkit/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@jaetask/toolkit/ui/context-menu";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronRight,
  IconGripVertical,
  IconInbox,
  IconLayersIntersect,
  IconLayoutKanban,
  IconList,
  IconStack2,
} from "@tabler/icons-react";
import { type DragEvent, useEffect, useState } from "react";
import type { Feature, Project } from "./api.js";
import { useApp, useRead } from "./app.js";
import { projectLook, TICKET_DRAG } from "./local.js";

const STORE = "tasks:nav-expanded";

/** A project's favourite features, each a link to its board narrowed to that feature. */
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
  const [moving, setMoving] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
      if (saved && typeof saved === "object")
        return Object.fromEntries(
          Object.entries(saved).filter(([, v]) => typeof v === "boolean"),
        ) as Record<string, boolean>;
    } catch {}
    return {};
  });
  function remember(key: string, open: boolean) {
    setExpanded((previous) => {
      const next = { ...previous, [key]: open };
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const parts = path.split("/").filter(Boolean);
  const selected = parts[0] === "p" ? (parts[1] ?? null) : null;
  const screen = selected ? (parts[2] ?? "board") : null;
  const selectedFeature = screen === "board" ? query.get("feature") : null;
  useEffect(() => {
    if (!selected) return;
    setExpanded((previous) => {
      const keys = [`project:${selected}`];
      if (selectedFeature) keys.push(`features:${selected}`);
      const missing = keys.filter((key) => previous[key] === undefined);
      if (!missing.length) return previous;
      const next = { ...previous };
      for (const key of missing) next[key] = true;
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selected, selectedFeature]);

  const projects = catalog.projects.filter((p) => !p.archived);
  async function move(id: string, target: number) {
    if (moving) return;
    const from = projects.findIndex((p) => p.id === id);
    if (from < 0 || from === target || target < 0 || target >= projects.length) return;
    const rest = projects.filter((p) => p.id !== id);
    const before = rest[target];
    setMoving(true);
    try {
      await act("catalog.project-move", { project: id, ...(before ? { before: before.id } : {}) });
    } finally {
      setMoving(false);
    }
  }
  if (!projects.length) return null;
  return (
    <nav
      aria-label="Projects"
      className={
        collapsed ? "grid gap-1" : "grid max-h-[60vh] shrink-0 gap-1 overflow-y-auto px-3 pb-4"
      }
    >
      {!collapsed && <p className="px-3 text-xs font-medium text-muted-foreground">Projects</p>}
      {projects.map((p, index) => (
        <Collapsible
          key={p.id}
          open={expanded[`project:${p.id}`] ?? selected === p.id}
          onOpenChange={(open) => remember(`project:${p.id}`, open)}
          className="shrink-0"
        >
          <ContextMenu>
            <ContextMenuTrigger asChild>
              {/* biome-ignore lint/a11y/noStaticElementInteractions: a project can be dropped on a row to reorder; the arrow buttons do the same by keyboard */}
              <div
                className="group flex items-center rounded-md hover:bg-sidebar-accent"
                onDragOver={(e) => {
                  if (dragged) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragged) void move(dragged, index);
                  setDragged(null);
                }}
              >
                {!collapsed && (
                  // biome-ignore lint/a11y/noStaticElementInteractions: the drag handle; the arrow buttons do the same by keyboard
                  <span
                    draggable={!moving}
                    onDragStart={(e) => {
                      setDragged(p.id);
                      e.dataTransfer.setData("text/plain", p.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragged(null)}
                    title={`Drag to reorder ${p.name}`}
                    className="cursor-grab p-1 text-muted-foreground"
                  >
                    <IconGripVertical size={14} />
                  </span>
                )}
                <Link
                  href={`/p/${p.id}/board`}
                  title={p.name}
                  aria-label={p.name}
                  // Going to a project opens it, even when it was closed by hand before.
                  onClick={() => remember(`project:${p.id}`, true)}
                  aria-current={
                    selected === p.id && screen === "board" && !selectedFeature ? "page" : undefined
                  }
                  className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-sm aria-[current=page]:bg-sidebar-accent"
                >
                  <ProjectIcon {...projectLook(p)} size={18} />
                  {!collapsed && <span className="truncate">{p.name}</span>}
                </Link>
                {!collapsed && (
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Toggle ${p.name} project`}
                      className="size-6 shrink-0 p-1"
                    >
                      <IconChevronRight
                        size={14}
                        className={
                          (expanded[`project:${p.id}`] ?? selected === p.id)
                            ? "rotate-90 transition-transform"
                            : "transition-transform"
                        }
                      />
                    </Button>
                  </CollapsibleTrigger>
                )}
                {!collapsed && (
                  <div className="ml-auto flex shrink-0 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${p.name} up`}
                      title="Move up"
                      disabled={index === 0 || moving}
                      onClick={() => void move(p.id, index - 1)}
                      className="size-6 p-1 disabled:opacity-30"
                    >
                      <IconArrowUp size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${p.name} down`}
                      title="Move down"
                      disabled={index === projects.length - 1 || moving}
                      onClick={() => void move(p.id, index + 1)}
                      className="size-6 p-1 disabled:opacity-30"
                    >
                      <IconArrowDown size={12} />
                    </Button>
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => go("/settings/projects")}>
                Project settings
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          {!collapsed && (
            <CollapsibleContent className="ml-7 grid gap-1 pl-2">
              {(
                [
                  ["intake", "Intake", IconInbox],
                  ["backlog", "Backlog", IconList],
                  ["board", "Board", IconLayoutKanban],
                ] as const
              ).map(([id, label, Icon]) => (
                <Link
                  key={id}
                  href={`/p/${p.id}/${id}`}
                  // A ticket dragged from the backlog onto Board goes on the board, and one
                  // dragged from the board onto Backlog goes back.
                  {...(id === "intake"
                    ? {}
                    : {
                        onDragOver: (e: DragEvent) => {
                          if (!e.dataTransfer.types.includes(TICKET_DRAG)) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        },
                        onDrop: (e: DragEvent) => {
                          const ticket = e.dataTransfer.getData(TICKET_DRAG);
                          if (!ticket) return;
                          e.preventDefault();
                          void act(
                            id === "board"
                              ? "tickets.ticket-board-send"
                              : "tickets.ticket-backlog-send",
                            { ticket },
                          );
                        },
                      })}
                  aria-current={
                    selected === p.id &&
                    (screen === id || (id === "board" && screen === "columns")) &&
                    !selectedFeature
                      ? "page"
                      : undefined
                  }
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-foreground"
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                </Link>
              ))}
              <Collapsible
                open={expanded[`features:${p.id}`] ?? (selected === p.id && !!selectedFeature)}
                onOpenChange={(open) => remember(`features:${p.id}`, open)}
              >
                <div className="flex items-center rounded-md hover:bg-sidebar-accent">
                  <Link
                    href={`/p/${p.id}/features`}
                    aria-current={selected === p.id && screen === "features" ? "page" : undefined}
                    className="flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-foreground"
                  >
                    <IconStack2 size={16} className="shrink-0" />
                    Features
                  </Link>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Toggle ${p.name} features`}
                      className="size-6 shrink-0 p-1"
                    >
                      <IconChevronRight
                        size={14}
                        className={
                          (expanded[`features:${p.id}`] ?? (selected === p.id && !!selectedFeature))
                            ? "rotate-90 transition-transform"
                            : "transition-transform"
                        }
                      />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="ml-3 grid gap-1 pl-2">
                  <Favourites project={p} feature={selected === p.id ? selectedFeature : null} />
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          )}
        </Collapsible>
      ))}
    </nav>
  );
}
