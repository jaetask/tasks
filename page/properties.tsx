import type { ReactNode, RefObject } from "react";
import { DueDatePicker } from "@jaetask/toolkit/suite";
import { type Feature, OWNER, PRIORITIES, type Ticket, TYPES } from "./api.js";
import { useApp, useRead } from "./app.js";
import { Face, NoActor } from "./local.js";
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
        { id: "", name: "No actor", icon: <NoActor /> },
        ...catalog.actors
          .filter((a) => !a.archived || a.id === ticket.assignee)
          .map((a) => ({
            id: a.id,
            name: a.name,
            icon: <Face name={a.name} emoji={a.icon} colour={a.colour} />,
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

export function LabelsPicker({
  ticket,
  children,
  armed,
  anchor,
}: Shared & {
  /** A part that stays put, such as the Labels heading: the list opens beside it. */
  anchor?: RefObject<HTMLElement | null>;
}) {
  const { catalog, act } = useApp();
  return (
    <PropertyPicker
      label="Labels"
      {...(anchor ? { anchor, side: "left" as const } : {})}
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

/** The due date picker of a ticket: the toolkit's, saving through the ticket's Action. */
export function DuePicker({ ticket, children, armed = true }: Shared) {
  const { act } = useApp();
  return (
    <DueDatePicker
      value={ticket.due}
      disabled={!open(ticket)}
      armed={armed}
      onChange={(due) => void act("tickets.ticket-due-set", { ticket: ticket.id, due })}
    >
      {children}
    </DueDatePicker>
  );
}

export { DueIcon, dueLabel, dueState } from "@jaetask/toolkit/suite";
