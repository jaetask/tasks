// The pickers of a ticket's properties: a quiet row that opens a list with a
// search box. A letter key opens one; a number key picks a row.
import { Button } from "@jaetask/toolkit/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@jaetask/toolkit/ui/command";
import { Kbd } from "@jaetask/toolkit/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@jaetask/toolkit/ui/popover";
import {
  IconAlertSquareFilled,
  IconAntennaBars2,
  IconAntennaBars3,
  IconAntennaBars5,
  IconCheck,
  IconCircle,
  IconCircleCheckFilled,
  IconCircleDotted,
  IconCircleHalf2,
  IconLineDashed,
  IconProgressCheck,
} from "@tabler/icons-react";
import { type ReactNode, useEffect, useState } from "react";
import type { Colour, Kind } from "./api.js";

/** The small circle that says what a column means. A backlog ticket has the dotted one. */
export function StatusIcon({ kind, backlog }: { kind: Kind; backlog?: boolean }) {
  if (backlog) return <IconCircleDotted size={16} aria-hidden className="text-muted-foreground" />;
  if (kind === "doing") return <IconCircleHalf2 size={16} aria-hidden className="text-amber-500" />;
  if (kind === "waiting") {
    return <IconProgressCheck size={16} aria-hidden className="text-emerald-600" />;
  }
  if (kind === "done") {
    return <IconCircleCheckFilled size={16} aria-hidden className="text-emerald-600" />;
  }
  return <IconCircle size={16} aria-hidden className="text-muted-foreground" />;
}

export const PRIORITY_NAME = {
  none: "No priority",
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

/** A priority's grey icon: dashes for none, a square for urgent, bars for the rest. */
export function PriorityIcon({ priority }: { priority: keyof typeof PRIORITY_NAME }) {
  const look = { size: 16, "aria-hidden": true, className: "text-muted-foreground" } as const;
  if (priority === "urgent") return <IconAlertSquareFilled {...look} />;
  if (priority === "high") return <IconAntennaBars5 {...look} />;
  if (priority === "medium") return <IconAntennaBars3 {...look} />;
  if (priority === "low") return <IconAntennaBars2 {...look} />;
  return <IconLineDashed {...look} />;
}

const DOT: Record<Colour, string> = {
  blue: "bg-blue-500",
  teal: "bg-teal-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};
/** A label's tiny colour dot. */
export function LabelDot({ colour }: { colour: Colour }) {
  return (
    <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${DOT[colour]}`} />
  );
}

export type Choice = { id: string; name: string; icon?: ReactNode; group?: string };

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * A row that opens a searchable list. `chosen` holds one id, or several when `many`. The key in
 * `hint` opens it from anywhere on the ticket; the number beside a row picks it.
 */
export function PropertyPicker({
  label,
  placeholder,
  hint,
  choices,
  chosen,
  onPick,
  many,
  onCreate,
  disabled,
  children,
}: {
  label: string;
  placeholder: string;
  hint?: string;
  choices: Choice[];
  chosen: string[];
  onPick: (id: string) => void;
  many?: boolean;
  /** Makes a new choice from the words typed, when none matches. */
  onCreate?: (name: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!hint || disabled) return;
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (e.key.toLowerCase() !== hint.toLowerCase()) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [hint, disabled]);
  const pick = (id: string) => {
    onPick(id);
    if (!many) setOpen(false);
  };
  // Chosen ones first when several can be chosen; otherwise the order given.
  const ordered = many
    ? [
        ...choices.filter((c) => chosen.includes(c.id)),
        ...choices.filter((c) => !chosen.includes(c.id)),
      ]
    : choices;
  const groups = [...new Set(ordered.map((c) => c.group ?? ""))];
  const numbered = !many && ordered.length <= 10;
  const wanted = search.trim();
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command
          onKeyDown={(e) => {
            if (!numbered || search !== "" || !/^[0-9]$/.test(e.key)) return;
            const target = ordered.find(
              (_, i) => String(i + (zeroFirst(ordered) ? 0 : 1)) === e.key,
            );
            if (!target) return;
            e.preventDefault();
            pick(target.id);
          }}
        >
          <div className="flex items-center gap-2 pr-2">
            <CommandInput
              aria-label={label}
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !onCreate || !wanted) return;
                if (choices.some((c) => c.name.toLowerCase() === wanted.toLowerCase())) return;
                e.preventDefault();
                onCreate(wanted);
                setSearch("");
              }}
            />
            {hint && <Kbd>{hint}</Kbd>}
          </div>
          <CommandList>
            <CommandEmpty>
              {onCreate && wanted ? `Press Enter to add "${wanted}"` : "Nothing matches."}
            </CommandEmpty>
            {groups.map((group, g) => (
              <div key={group}>
                {g > 0 && <CommandSeparator />}
                <CommandGroup {...(group ? { heading: group } : {})}>
                  {ordered
                    .filter((c) => (c.group ?? "") === group)
                    .map((c) => {
                      const number = ordered.indexOf(c) + (zeroFirst(ordered) ? 0 : 1);
                      return (
                        <CommandItem
                          key={c.id || "none"}
                          value={c.name}
                          onSelect={() => pick(c.id)}
                        >
                          {c.icon}
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          {chosen.includes(c.id) && <IconCheck size={16} aria-hidden />}
                          {numbered && (
                            <span
                              aria-hidden
                              className="w-3 text-right text-xs text-muted-foreground"
                            >
                              {number}
                            </span>
                          )}
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// A list that starts with a "none" choice numbers from 0, as "No priority" is 0.
const zeroFirst = (choices: Choice[]) => choices[0]?.id === "" || choices[0]?.id === "none";

/** The quiet button a property row is: an icon and a value, grey on hover. */
export function RailRow({
  icon,
  children,
  muted,
  ...rest
}: {
  icon?: ReactNode;
  children: ReactNode;
  muted?: boolean;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      className={`h-8 w-full min-w-0 justify-start gap-2 overflow-hidden px-2 font-normal ${muted ? "text-muted-foreground" : ""}`}
      {...rest}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </Button>
  );
}
