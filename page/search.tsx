// Search across every project's tickets: "/" or Cmd+K opens it, as does the sidebar's button.
import { ProjectIcon } from "@jaetask/toolkit/suite";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@jaetask/toolkit/ui/command";
import { useEffect, useState } from "react";
import type { Ticket } from "./api.js";
import { useApp, useRead } from "./app.js";
import { projectLook } from "./local.js";
import { StatusIcon } from "./pickers.js";

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Opens the search with "/" or Cmd+K. Returns whether it is open, and the way to set that. */
export function useSearchKey(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const k = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target);
      if (!k && !(slash && !document.querySelector('[role="dialog"], [role="menu"]'))) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  return [open, setOpen];
}

const LIMIT = 30;

function Results({ text, onPick }: { text: string; onPick: (ticket: Ticket) => void }) {
  const { catalog } = useApp();
  const wanted = text.trim();
  const id = /^[a-z]+-\d+$/i.test(wanted) ? wanted.toUpperCase() : null;
  const exact = useRead<Ticket>(id ? "tickets.ticket-read" : null, { ticket: id });
  const open = useRead<Ticket[]>(wanted ? "tickets.ticket-find" : null, { text: wanted });
  const archived = useRead<Ticket[]>(wanted ? "tickets.ticket-find" : null, {
    text: wanted,
    state: "archived",
  });
  const found = [
    ...(exact ? [exact] : []),
    ...(open ?? []).filter((t) => t.id !== exact?.id),
    ...(archived ?? []).filter((t) => t.id !== exact?.id),
  ];
  if (!wanted)
    return <CommandEmpty>Type a ticket's id, or words from its title or text.</CommandEmpty>;
  return (
    <>
      <CommandEmpty>{open ? "No ticket matches." : "Searching..."}</CommandEmpty>
      {found.length > 0 && (
        <CommandGroup
          heading={found.length > LIMIT ? `The first ${LIMIT} of ${found.length}` : "Tickets"}
        >
          {found.slice(0, LIMIT).map((t) => {
            const project = catalog.projects.find((p) => p.id === t.project);
            return (
              <CommandItem
                key={t.id}
                value={`${t.id} ${t.title}`}
                onSelect={() => onPick(t)}
                className="gap-3 px-3 py-2"
              >
                {t.state === "open" ? (
                  <StatusIcon kind={t.column.kind} backlog={t.backlog} />
                ) : (
                  <span className="w-4" />
                )}
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{t.id}</span>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                {t.state !== "open" && (
                  <span className="text-xs text-muted-foreground">Archived</span>
                )}
                {project && <ProjectIcon {...projectLook(project)} size={14} />}
              </CommandItem>
            );
          })}
        </CommandGroup>
      )}
    </>
  );
}

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { go } = useApp();
  const [text, setText] = useState("");
  // What is searched for follows the typing a moment later, so each key is not a search.
  const [asked, setAsked] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAsked(text), 200);
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => {
    if (!open) setText("");
  }, [open]);
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      commandProps={{ shouldFilter: false, label: "Search tickets" }}
    >
      <CommandInput
        aria-label="Search every ticket"
        placeholder="Search every ticket..."
        value={text}
        onValueChange={setText}
      />
      <CommandList>
        {open && (
          <Results
            text={asked}
            onPick={(t) => {
              onOpenChange(false);
              go(`/t/${t.id}`);
            }}
          />
        )}
      </CommandList>
    </CommandDialog>
  );
}
