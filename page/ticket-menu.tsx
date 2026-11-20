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
import { type ReactElement, useRef, useState } from "react";

import type { Ticket } from "./api.js";
import { AddLinkDialog, day, endOfWeek } from "@jaetask/toolkit/suite";
import { useApp } from "./app.js";
import { addLink, LINK_LINE } from "./local.js";

export function TicketMenu({ ticket, children }: { ticket: Ticket; children: ReactElement }) {
  const { act, go, path } = useApp();
  const [ask, setAsk] = useState<"link" | "block" | null>(null);
  const wanted = useRef<"link" | "block" | null>(null);
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
  if (ticket.state !== "open") return children;
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent
          className="w-56"
          aria-label={`Ticket ${id}`}
          // A dialog the menu asks for opens once the menu has closed and given up the focus;
          // opened sooner, the closing menu would take the focus out of the dialog's box.
          onCloseAutoFocus={(e) => {
            if (wanted.current === null) return;
            e.preventDefault();
            setAsk(wanted.current);
            wanted.current = null;
          }}
        >
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
          <ContextMenuItem
            onSelect={() => {
              wanted.current = "link";
            }}
          >
            Add link...
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => go(`/p/${ticket.project}/new?related=${id}`)}>
            Create related
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Mark as</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem
                disabled={ticket.blocked !== null}
                onSelect={() => {
                  wanted.current = "block";
                }}
              >
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
      <AddLinkDialog
        to={id}
        line={LINK_LINE}
        open={ask === "link"}
        onOpenChange={(next) => setAsk(next ? "link" : null)}
        onAdd={addLink(act, id)}
      />
      <Dialog open={ask === "block"} onOpenChange={(next) => setAsk(next ? "block" : null)}>
        {ask === "block" && (
          <DialogContent className="max-w-md">
            {/* A form, so Enter marks it blocked with what the box holds. */}
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const note = String(new FormData(e.currentTarget).get("note") ?? "").trim();
                if (!note) return;
                void act("tickets.ticket-block", { ticket: id, note }).then(
                  (done) => done && setAsk(null),
                );
              }}
            >
              <DialogHeader>
                <DialogTitle>{`Mark as blocked · ${id}`}</DialogTitle>
                <DialogDescription>
                  Say why. Agents looking for work skip a blocked ticket.
                </DialogDescription>
              </DialogHeader>
              <Input
                autoFocus
                required
                name="note"
                aria-label="Mark as blocked"
                placeholder="What it waits for"
                maxLength={500}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAsk(null)}>
                  Cancel
                </Button>
                <Button type="submit">Mark as blocked</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
