// A ticket as one line of a list: its status, id and title, then what it carries, quietly.
// A click opens it over the page; a right click opens its menu; it can be dragged.
import { DueIcon, dueLabel } from "@jaetask/toolkit/suite";
import type { ReactNode } from "react";
import type { Ticket } from "./api.js";
import { useApp } from "./app.js";
import { ActorAvatar, NoActor, TICKET_DRAG } from "./local.js";
import { LabelDot, PriorityIcon, StatusIcon } from "./pickers.js";
import { TicketMenu } from "./ticket-menu.js";

export function TicketLine({
  ticket,
  lead,
  aside,
  status = true,
  feature = true,
}: {
  ticket: Ticket;
  /** Something before the line, such as a tick box. */
  lead?: ReactNode;
  /** Something at its end, after the actor. */
  aside?: ReactNode;
  /** False where the list already says the status, or the feature. */
  status?: boolean;
  feature?: boolean;
}) {
  const { go, path } = useApp();
  const open = () => go(`${path}?ticket=${ticket.id}`);
  return (
    <li className="tk-list-row p-0!">
      <TicketMenu ticket={ticket}>
        <article
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the line opens its ticket with Enter, as a card does
          tabIndex={0}
          draggable={ticket.state === "open"}
          aria-label={`${ticket.id} ${ticket.title}`}
          data-blocked={ticket.blocked !== null}
          onDragStart={(e) => {
            e.dataTransfer.setData(TICKET_DRAG, ticket.id);
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
          className="ticket-line flex w-full min-w-0 cursor-pointer items-center gap-3 px-5 py-2 text-sm hover:bg-muted/40"
        >
          {lead && <span data-chip>{lead}</span>}
          {status && <StatusIcon kind={ticket.column.kind} backlog={ticket.backlog} />}
          <span className="w-16 shrink-0 text-xs text-muted-foreground">{ticket.id}</span>
          <span className="min-w-0 flex-1 truncate">{ticket.title}</span>
          {ticket.blocked && (
            <span className="shrink-0 text-xs text-muted-foreground">Blocked</span>
          )}
          {feature && ticket.featureName && (
            <span className="hidden max-w-40 shrink-0 truncate text-xs text-muted-foreground lg:inline">
              {ticket.featureName}
            </span>
          )}
          {ticket.labels.length > 0 && (
            <span
              className="hidden shrink-0 items-center gap-1 md:flex"
              title={ticket.labels.map((l) => l.name).join(", ")}
            >
              {ticket.labels.slice(0, 4).map((l) => (
                <LabelDot key={l.id} colour={l.colour} />
              ))}
            </span>
          )}
          {ticket.due && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <DueIcon due={ticket.due} size={12} />
              {dueLabel(ticket.due)}
            </span>
          )}
          {ticket.priority !== "none" && <PriorityIcon priority={ticket.priority} />}
          {ticket.assignee ? (
            <ActorAvatar id={ticket.assignee} name={ticket.assigneeName} size={20} />
          ) : (
            <NoActor size={20} />
          )}
          {aside && <span data-chip>{aside}</span>}
        </article>
      </TicketMenu>
    </li>
  );
}
