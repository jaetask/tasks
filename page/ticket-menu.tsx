import {
  AddLinkDialog,
  day,
  endOfWeek,
  FormDialog,
  type MenuEntry,
  RowMenu,
} from "@jaetask/toolkit/suite";
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
import { Input } from "@jaetask/toolkit/ui/input";
import { type ReactElement, type ReactNode, useRef, useState } from "react";

import type { Ticket } from "./api.js";
import { useApp } from "./app.js";
import { addLink, DeleteForGood, LINK_LINE } from "./local.js";

type Ask = "link" | "block" | "delete" | null;

function useTicketMenu(
  ticket: Ticket,
  onGone?: () => void,
): { items: MenuEntry[]; dialogs: ReactNode } {
  const { catalog, act, go, path } = useApp();
  const [ask, setAsk] = useState<Ask>(null);
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
  const others = catalog.projects.filter((p) => !p.archived && p.id !== ticket.project);
  const copies: MenuEntry = {
    label: "Copy",
    items: [
      { label: "Copy ID", hint: id, onSelect: () => copy(id) },
      { label: "Copy title", onSelect: () => copy(ticket.title) },
      { label: "Copy link", onSelect: () => copy(link) },
      { label: "Copy ID and title", onSelect: () => copy(`${id} ${ticket.title}`) },
    ],
  };
  const items: MenuEntry[] =
    ticket.state === "open"
      ? [
          {
            label: "Due date",
            items: [
              { label: "Tomorrow", onSelect: () => due(from(1)) },
              { label: "End of this week", onSelect: () => due(endOfWeek(now)) },
              { label: "In one week", onSelect: () => due(from(7)) },
              ...(ticket.due ? [{ label: "Remove due date", onSelect: () => due(null) }] : []),
            ],
          },
          { label: "Add link...", onSelect: () => setAsk("link") },
          {
            label: "Create related...",
            onSelect: () => go(`${path}?new=1&project=${ticket.project}&related=${id}`),
          },
          {
            label: "Mark as",
            items: [
              {
                label: "Blocked...",
                disabled: ticket.blocked !== null,
                onSelect: () => setAsk("block"),
              },
              {
                label: "Not blocked",
                disabled: ticket.blocked === null,
                onSelect: () => void act("tickets.ticket-unblock", { ticket: id }),
              },
            ],
          },
          {
            label: "Move to project",
            disabled: others.length === 0,
            items: others.map((p) => ({
              label: p.name,
              onSelect: () =>
                void act<Ticket>("tickets.ticket-project-set", { ticket: id, project: p.id }).then(
                  (moved) => {
                    if (!moved) return;
                    if (path === `/t/${id}`) go(`/t/${moved.id}`);
                    else if (window.location.hash.includes(`ticket=${id}`)) {
                      go(`${path}?ticket=${moved.id}`);
                    }
                  },
                ),
            })),
          },
          copies,
          { label: "Make a copy", onSelect: () => void duplicate() },
          "line",
          {
            label: ticket.backlog ? "Put on the board" : "Send to the backlog",
            onSelect: () =>
              void act(
                ticket.backlog ? "tickets.ticket-board-send" : "tickets.ticket-backlog-send",
                { ticket: id },
              ),
          },
          { label: "Archive", onSelect: () => void act("tickets.ticket-archive", { ticket: id }) },
          {
            label: "Cancel ticket",
            onSelect: () => void act("tickets.ticket-cancel", { ticket: id }),
          },
        ]
      : [
          { label: "Restore", onSelect: () => void act("tickets.ticket-restore", { ticket: id }) },
          copies,
          "line",
          { label: "Delete forever...", onSelect: () => setAsk("delete") },
        ];
  const dialogs = (
    <>
      <AddLinkDialog
        to={id}
        line={LINK_LINE}
        open={ask === "link"}
        onOpenChange={(next) => setAsk(next ? "link" : null)}
        onAdd={addLink(act, id)}
      />
      <BlockDialog
        ticket={id}
        open={ask === "block"}
        onOpenChange={(next) => setAsk(next ? "block" : null)}
      />
      <DeleteForGood
        name={id}
        what="This ticket, with its comments, images and files,"
        label="Delete forever"
        open={ask === "delete"}
        onOpenChange={(next) => setAsk(next ? "delete" : null)}
        onConfirm={() => void act("tickets.ticket-delete", { ticket: id }).then(() => onGone?.())}
      />
    </>
  );
  return { items, dialogs };
}

function BlockDialog({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { act } = useApp();
  const [note, setNote] = useState("");
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Mark as blocked · ${ticket}`}
      line="Say why. Agents looking for work skip a blocked ticket."
      saveLabel="Mark as blocked"
      onSave={async () => {
        const said = note.trim();
        if (!said) return false;
        const done = await act("tickets.ticket-block", { ticket, note: said });
        if (done) setNote("");
        return done !== null;
      }}
    >
      <Input
        autoFocus
        required
        aria-label="Mark as blocked"
        placeholder="What it waits for"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
      />
    </FormDialog>
  );
}

function ContextEntries({ items }: { items: MenuEntry[] }) {
  return (
    <>
      {items.map((item, i) => {
        // biome-ignore lint/suspicious/noArrayIndexKey: a menu's lines never reorder
        if (item === "line") return <ContextMenuSeparator key={i} />;
        if ("content" in item) return null;
        if ("items" in item)
          return (
            <ContextMenuSub key={item.label}>
              <ContextMenuSubTrigger disabled={item.disabled ?? false}>
                {item.label}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextEntries items={item.items} />
              </ContextMenuSubContent>
            </ContextMenuSub>
          );
        return (
          <ContextMenuItem
            key={item.label}
            disabled={item.disabled ?? false}
            onSelect={item.onSelect}
          >
            {item.label}
            {item.hint && <ContextMenuShortcut>{item.hint}</ContextMenuShortcut>}
          </ContextMenuItem>
        );
      })}
    </>
  );
}

export function TicketMenu({
  ticket,
  onGone,
  children,
}: {
  ticket: Ticket;
  onGone?: () => void;
  children: ReactElement;
}) {
  const { items, dialogs } = useTicketMenu(ticket, onGone);
  const after = useRef<(() => void) | null>(null);
  const later = (entries: MenuEntry[]): MenuEntry[] =>
    entries.map((e) =>
      e === "line" || "content" in e
        ? e
        : "items" in e
          ? { ...e, items: later(e.items) }
          : e.label.endsWith("...")
            ? {
                ...e,
                onSelect: () => {
                  after.current = e.onSelect;
                },
              }
            : e,
    );
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent
          className="w-56"
          aria-label={`Ticket ${ticket.id}`}
          onCloseAutoFocus={(e) => {
            const run = after.current;
            after.current = null;
            if (!run) return;
            e.preventDefault();
            run();
          }}
        >
          <ContextEntries items={later(items)} />
        </ContextMenuContent>
      </ContextMenu>
      {dialogs}
    </>
  );
}

export function TicketActions({ ticket, onGone }: { ticket: Ticket; onGone?: () => void }) {
  const { items, dialogs } = useTicketMenu(ticket, onGone);
  return (
    <>
      <RowMenu label={`Ticket ${ticket.id}`} items={items} />
      {dialogs}
    </>
  );
}
