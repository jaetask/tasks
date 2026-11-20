// The picker of each ticket property, used by the ticket's rail and by the
// card on a board, so the two can never differ.
import { Calendar } from "@jaetask/toolkit/ui/calendar";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@jaetask/toolkit/ui/command";
import { Kbd } from "@jaetask/toolkit/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@jaetask/toolkit/ui/popover";
import { IconCalendar, IconCalendarOff, IconUserOff } from "@tabler/icons-react";
import { type ReactNode, useEffect, useState } from "react";
import { day, endOfWeek, parseDue } from "../src/due.js";
import { type Feature, OWNER, PRIORITIES, type Ticket, TYPES } from "./api.js";
import { useApp, useRead } from "./app.js";
import { Face } from "./local.js";
import { LabelDot, PRIORITY_NAME, PriorityIcon, PropertyPicker, StatusIcon } from "./pickers.js";

type Shared = {
  ticket: Ticket;
  /** The row or chip that opens the picker. */
  children: ReactNode;
  /** False while its key should not open it, as on a card that is not hovered. */
  armed?: boolean;
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const open = (ticket: Ticket) => ticket.state === "open";
// The backlog is the first choice of status: off the board, before any column.
const BACKLOG = "backlog";

export function StatusPicker({ ticket, children, armed }: Shared) {
  const { catalog, act } = useApp();
  const project = catalog.projects.find((p) => p.id === ticket.project);
  return (
    <PropertyPicker
      label="Status"
      placeholder="Change status..."
      hint="S"
      armed={armed}
      disabled={!open(ticket)}
      chosen={[ticket.backlog ? BACKLOG : ticket.column.id]}
      choices={[
        { id: BACKLOG, name: "Backlog", icon: <StatusIcon kind="todo" backlog /> },
        ...(project?.columns ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          icon: <StatusIcon kind={c.kind} />,
        })),
      ]}
      onPick={(column) =>
        void (async () => {
          if (column === BACKLOG) {
            if (!ticket.backlog) await act("tickets.ticket-backlog-send", { ticket: ticket.id });
            return;
          }
          // A backlog ticket goes on the board first, then to the column picked.
          if (ticket.backlog) await act("tickets.ticket-board-send", { ticket: ticket.id });
          await act("tickets.ticket-move", { ticket: ticket.id, column });
        })()
      }
    >
      {children}
    </PropertyPicker>
  );
}

export function PriorityPicker({ ticket, children, armed }: Shared) {
  const { act } = useApp();
  return (
    <PropertyPicker
      label="Priority"
      placeholder="Set priority to..."
      hint="P"
      armed={armed}
      disabled={!open(ticket)}
      chosen={[ticket.priority]}
      choices={PRIORITIES.map((p) => ({
        id: p,
        name: PRIORITY_NAME[p],
        icon: <PriorityIcon priority={p} />,
      }))}
      onPick={(priority) =>
        void act("tickets.ticket-priority-set", { ticket: ticket.id, priority })
      }
    >
      {children}
    </PropertyPicker>
  );
}

export function ActorPicker({
  ticket,
  children,
  armed,
  note,
  onAssigned,
}: Shared & { note?: string; onAssigned?: () => void }) {
  const { catalog, act } = useApp();
  return (
    <PropertyPicker
      label="Actor"
      placeholder="Assign to..."
      hint="A"
      armed={armed}
      disabled={!open(ticket)}
      chosen={[ticket.assignee ?? ""]}
      choices={[
        { id: "", name: "No actor", icon: <IconUserOff size={16} aria-hidden /> },
        ...catalog.actors
          .filter((a) => !a.archived || a.id === ticket.assignee)
          .map((a) => ({
            id: a.id,
            name: a.name,
            icon: <Face name={a.name} emoji={a.icon} />,
            ...(a.id === OWNER ? {} : { group: "Agents" }),
          })),
      ]}
      onPick={(picked) => {
        const handoff = (note ?? "").trim();
        onAssigned?.();
        void act("tickets.ticket-assign", {
          ticket: ticket.id,
          actor: picked || null,
          ...(handoff && picked ? { note: handoff } : {}),
        });
      }}
    >
      {children}
    </PropertyPicker>
  );
}

export function LocationPicker({ ticket, children }: Shared) {
  const { catalog, act } = useApp();
  return (
    <PropertyPicker
      label="Location"
      placeholder="Set location to..."
      disabled={!open(ticket)}
      chosen={[ticket.location ?? ""]}
      choices={[
        { id: "", name: "No location" },
        ...catalog.locations
          .filter((l) => !l.archived || l.id === ticket.location)
          .map((l) => ({ id: l.id, name: l.name })),
      ]}
      onPick={(location) =>
        void act("tickets.ticket-location-set", {
          ticket: ticket.id,
          location: location || null,
        })
      }
    >
      {children}
    </PropertyPicker>
  );
}

export function FeaturePicker({ ticket, children }: Shared) {
  const { act } = useApp();
  const features = useRead<Feature[]>("tickets.feature-find", { project: ticket.project });
  return (
    <PropertyPicker
      label="Feature"
      placeholder="Set feature to..."
      disabled={!open(ticket)}
      chosen={[ticket.feature ?? ""]}
      choices={[
        { id: "", name: "No feature" },
        ...(features ?? []).map((f) => ({ id: f.id, name: f.name })),
      ]}
      onPick={(feature) =>
        void act("tickets.ticket-feature-set", { ticket: ticket.id, feature: feature || null })
      }
    >
      {children}
    </PropertyPicker>
  );
}

export function TypePicker({ ticket, children }: Shared) {
  const { act } = useApp();
  return (
    <PropertyPicker
      label="Type"
      placeholder="Set type to..."
      disabled={!open(ticket)}
      chosen={[ticket.type]}
      choices={TYPES.map((t) => ({ id: t, name: titleCase(t) }))}
      onPick={(type) => void act("tickets.ticket-type-set", { ticket: ticket.id, type })}
    >
      {children}
    </PropertyPicker>
  );
}

export function LabelsPicker({ ticket, children, armed }: Shared) {
  const { catalog, act } = useApp();
  return (
    <PropertyPicker
      label="Labels"
      placeholder="Change or add labels..."
      hint="L"
      armed={armed}
      many
      disabled={!open(ticket)}
      chosen={ticket.labels.map((l) => l.id)}
      choices={catalog.labels.map((l) => ({
        id: l.id,
        name: l.name,
        icon: <LabelDot colour={l.colour} />,
      }))}
      onPick={(label) =>
        void act(
          ticket.labels.some((l) => l.id === label)
            ? "tickets.ticket-label-remove"
            : "tickets.ticket-label-add",
          { ticket: ticket.id, label },
        )
      }
      onCreate={(name) =>
        void act<{ id: string }>("catalog.label-create", { name, colour: "blue" }).then(
          (made) => made && act("tickets.ticket-label-add", { ticket: ticket.id, label: made.id }),
        )
      }
    >
      {children}
    </PropertyPicker>
  );
}

/** A due day as people say it: Today, Tomorrow, Fri, or a short date further out. */
export function dueLabel(due: string, now: Date = new Date()): string {
  const date = new Date(`${due}T00:00:00`);
  const days = Math.round(
    (date.getTime() - new Date(`${day(now)}T00:00:00`).getTime()) / 86_400_000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** overdue, soon (today or tomorrow) or later: what colours a due date's icon. */
export function dueState(due: string, now: Date = new Date()): "overdue" | "soon" | "later" {
  const today = day(now);
  if (due < today) return "overdue";
  return due <= day(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
    ? "soon"
    : "later";
}

const full = (due: string) =>
  new Date(`${due}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** The due date picker: type a date in words, or pick a row. Shift+D opens it. */
export function DuePicker({ ticket, children, armed = true }: Shared) {
  const { act } = useApp();
  const [shown, setShown] = useState(false);
  const [search, setSearch] = useState("");
  const [calendar, setCalendar] = useState(false);
  const can = open(ticket);
  useEffect(() => {
    if (!can || !armed) return;
    const on = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (
        typing ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        !e.shiftKey ||
        e.key.toLowerCase() !== "d"
      ) {
        return;
      }
      e.preventDefault();
      setShown(true);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [can, armed]);
  const set = (due: string | null) => {
    setShown(false);
    void act("tickets.ticket-due-set", { ticket: ticket.id, due });
  };
  const now = new Date();
  const typed = parseDue(search, now);
  const rows: [string, string][] = [
    ["Tomorrow", day(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))],
    ["End of this week", endOfWeek(now)],
    ["In one week", day(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7))],
  ];
  return (
    <Popover
      open={shown}
      onOpenChange={(next) => {
        setShown(next);
        if (!next) {
          setSearch("");
          setCalendar(false);
        }
      }}
    >
      <PopoverTrigger asChild disabled={!can}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        {calendar ? (
          <Calendar
            mode="single"
            {...(ticket.due ? { selected: new Date(`${ticket.due}T00:00:00`) } : {})}
            onSelect={(picked: Date | undefined) => picked && set(day(picked))}
          />
        ) : (
          <Command shouldFilter={false}>
            <div className="flex items-center gap-2 pr-2">
              <CommandInput
                aria-label="Due date"
                placeholder="Try: 24h, 7 days, Feb 9"
                value={search}
                onValueChange={setSearch}
              />
              <Kbd>⇧D</Kbd>
            </div>
            <CommandList>
              <CommandGroup>
                {typed && (
                  <CommandItem value="typed" onSelect={() => set(typed)}>
                    <IconCalendar size={16} aria-hidden />
                    <span className="flex-1">{dueLabel(typed, now)}</span>
                    <span className="text-xs text-muted-foreground">{full(typed)}</span>
                  </CommandItem>
                )}
                {ticket.due && (
                  <CommandItem value="remove" onSelect={() => set(null)}>
                    <IconCalendarOff size={16} aria-hidden />
                    <span className="flex-1">Remove due date</span>
                    <span className="text-xs text-muted-foreground">{full(ticket.due)}</span>
                  </CommandItem>
                )}
                <CommandItem value="custom" onSelect={() => setCalendar(true)}>
                  <IconCalendar size={16} aria-hidden />
                  <span className="flex-1">Custom...</span>
                </CommandItem>
                {rows.map(([name, due]) => (
                  <CommandItem key={name} value={name} onSelect={() => set(due)}>
                    <IconCalendar size={16} aria-hidden />
                    <span className="flex-1">{name}</span>
                    <span className="text-xs text-muted-foreground">{full(due)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

const DUE_ICON = {
  overdue: "text-red-600",
  soon: "text-orange-500",
  later: "text-muted-foreground",
} as const;
/** The calendar icon of a due date: red when overdue, orange when due within a day. */
export function DueIcon({ due, size = 16 }: { due: string | null; size?: number }) {
  return (
    <IconCalendar
      size={size}
      aria-hidden
      className={due ? DUE_ICON[dueState(due)] : "text-muted-foreground"}
    />
  );
}
