// The menu a right click opens on a ticket: on its card, and on its properties when it is open.
import { Button } from "@jaetask/toolkit/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@jaetask/toolkit/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@jaetask/toolkit/ui/dialog";
import { Input } from "@jaetask/toolkit/ui/input";
import { type ReactElement, useState } from "react";
import { day, endOfWeek } from "../src/due.js";
import type { Ticket } from "./api.js";
import { useApp } from "./app.js";

/** What the menu asks for in a dialog before it acts. */
const ASKS = {
  link: {
    title: "Add link",
    line: "A web address that belongs to this ticket, such as a pull request.",
    placeholder: "https://",
    save: "Add link",
  },
  block: {
    title: "Mark as blocked",
    line: "Say why. Agents looking for work skip a blocked ticket.",
    placeholder: "What it waits for",
    save: "Mark as blocked",
  },
} as const;

export function TicketMenu({ ticket, children }: { ticket: Ticket; children: ReactElement }) {
  const { act, go, path } = useApp();
  const [ask, setAsk] = useState<keyof typeof ASKS | null>(null);
  const [text, setText] = useState("");
  const id = ticket.id;
  const copy = (value: string) => void navigator.clipboard?.writeText(value);
  const link = `${window.location.origin}${window.location.pathname}#/t/${id}`;
  const now = new Date();
  const from = (days: number) =>
    day(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
  const due = (value: string | null) =>
    void act("tickets.ticket-due-set", { ticket: id, due: value });
  const duplicate = async () => {
    const made = await act<Ticket>("tickets.ticket-create", {
      project: ticket.project,
      title: ticket.title,
      description: ticket.description,
      labels: ticket.labels.map((l) => l.id),
      type: ticket.type,
      priority: ticket.priority,
      links: ticket.links.map((l) => l.url),
      backlog: true,
      ...(ticket.assignee ? { assignee: ticket.assignee } : {}),
      ...(ticket.feature ? { feature: ticket.feature } : {}),
      ...(ticket.location ? { location: ticket.location } : {}),
    });
    if (made) go(`${path}?ticket=${made.id}`);
  };
  const answer = async () => {
    const value = text.trim();
    if (!ask || !value) return;
    const done =
      ask === "link"
        ? await act("tickets.ticket-link-add", { ticket: id, url: value })
        : await act("tickets.ticket-block", { ticket: id, note: value });
    if (done) {
      setAsk(null);
      setText("");
    }
  };
  if (ticket.state !== "open") return children;
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56" aria-label={`Ticket ${id}`}>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Due date</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onSelect={() => due(from(1))}>Tomorrow</ContextMenuItem>
              <ContextMenuItem onSelect={() => due(endOfWeek(now))}>
                End of this week
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => due(from(7))}>In one week</ContextMenuItem>
              {ticket.due && (
                <ContextMenuItem onSelect={() => due(null)}>Remove due date</ContextMenuItem>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onSelect={() => setAsk("link")}>Add link...</ContextMenuItem>
          <ContextMenuItem onSelect={() => go(`/p/${ticket.project}/new?related=${id}`)}>
            Create related
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Mark as</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem disabled={ticket.blocked !== null} onSelect={() => setAsk("block")}>
                Blocked...
              </ContextMenuItem>
              <ContextMenuItem
                disabled={ticket.blocked === null}
                onSelect={() => void act("tickets.ticket-unblock", { ticket: id })}
              >
                Not blocked
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Copy</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onSelect={() => copy(id)}>
                Copy ID
                <ContextMenuShortcut>{id}</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => copy(ticket.title)}>Copy title</ContextMenuItem>
              <ContextMenuItem onSelect={() => copy(link)}>Copy link</ContextMenuItem>
              <ContextMenuItem onSelect={() => copy(`${id} ${ticket.title}`)}>
                Copy ID and title
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onSelect={() => void duplicate()}>Make a copy</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={() =>
              void act(
                ticket.backlog ? "tickets.ticket-board-send" : "tickets.ticket-backlog-send",
                {
                  ticket: id,
                },
              )
            }
          >
            {ticket.backlog ? "Put on the board" : "Send to the backlog"}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => void act("tickets.ticket-archive", { ticket: id })}>
            Archive
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <Dialog
        open={ask !== null}
        onOpenChange={(next) => {
          if (!next) {
            setAsk(null);
            setText("");
          }
        }}
      >
        {ask && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{`${ASKS[ask].title} · ${id}`}</DialogTitle>
              <DialogDescription>{ASKS[ask].line}</DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              aria-label={ASKS[ask].title}
              placeholder={ASKS[ask].placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void answer();
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAsk(null)}>
                Cancel
              </Button>
              <Button disabled={!text.trim()} onClick={() => void answer()}>
                {ASKS[ask].save}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
