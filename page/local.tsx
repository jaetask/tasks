// Tasks' own small pieces, each made only of toolkit parts: a ticket as a
// list row, the badges for kinds and labels, and short forms of the parts
// the pages use most.
import { Composer, ListRow, PROJECT_ICONS } from "@jaetask/toolkit/suite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@jaetask/toolkit/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@jaetask/toolkit/ui/avatar";
import { Badge } from "@jaetask/toolkit/ui/badge";
import { Button } from "@jaetask/toolkit/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from "@jaetask/toolkit/ui/empty";
import { Input } from "@jaetask/toolkit/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@jaetask/toolkit/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@jaetask/toolkit/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@jaetask/toolkit/ui/toggle-group";
import { type ReactNode, useState } from "react";
import { type Colour, KINDS, type Kind, type Project, type Ticket } from "./api.js";
import { actorIcon, useApp } from "./app.js";

type Option = { id: string; name: string };

// A Select item cannot have an empty value, so "" travels as this.
const NONE = "__none";

/** A dropdown over options. An option with the id "" is the "none" or "any" choice. */
export function Picker({
  id,
  label,
  value,
  onChange,
  options,
  className,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger id={id} aria-label={label} className={className ?? "w-auto min-w-40"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id || NONE} value={o.id || NONE}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Pick one of a few values. */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={label}
      className="flex-wrap justify-start"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as T);
      }}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.id} value={o.id}>
          {o.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Pick any number of a few values. */
export function Choices({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: Option[];
  onChange: (value: string[]) => void;
}) {
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      aria-label={label}
      className="flex-wrap justify-start"
      value={value}
      onValueChange={onChange}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.id} value={o.id}>
          {o.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Tabs that narrow a list. */
export function TabBar<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList aria-label={label}>
        {options.map((o) => (
          <TabsTrigger key={o.id} value={o.id}>
            {o.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** What a list shows when it has nothing. */
export function Nothing({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <Empty className="border border-dashed p-6">
      <EmptyHeader>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

const TINT: Record<Colour, string> = {
  blue: "bg-blue-100 text-blue-900",
  teal: "bg-teal-100 text-teal-900",
  green: "bg-green-100 text-green-900",
  amber: "bg-amber-100 text-amber-900",
  purple: "bg-purple-100 text-purple-900",
  pink: "bg-pink-100 text-pink-900",
};

/** A small badge, in one of the named colours when given one. */
export function Pill({ children, colour }: { children: ReactNode; colour?: Colour }) {
  return (
    <Badge
      variant="secondary"
      className={`pill ${colour ? `border-transparent ${TINT[colour]}` : ""}`}
    >
      {children}
    </Badge>
  );
}

/** A round picture: an emoji, or the first letter of a name. */
export function Face({ name, emoji }: { name: string; emoji?: string }) {
  return (
    <Avatar className="size-6 text-xs" aria-hidden>
      <AvatarFallback>{emoji || (name.trim()[0] ?? "?").toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

/** Delete for good, confirmed by typing the name. */
export function DeleteForGood({
  name,
  what,
  label,
  onConfirm,
}: {
  name: string;
  what: string;
  label: string;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  return (
    <AlertDialog onOpenChange={() => setTyped("")}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Delete ${name} for good?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {`${what} will be deleted. This cannot be undone. Type ${name} to confirm.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          aria-label={`Type ${name} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={typed !== name} onClick={onConfirm}>
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** A project's emoji, or "" when its icon is an icon name or it has none. */
export const projectEmoji = (project: Project) =>
  /^[a-z-]*$/.test(project.icon) ? "" : project.icon;

/** A project's round picture: its emoji or first letter. */
export function ProjectAvatar({ project }: { project: Project }) {
  return <Face name={project.name} emoji={projectEmoji(project)} />;
}

/** An actor's round picture: its icon, or the first letter of its name. */
export function ActorAvatar({ id, name }: { id: string | null; name: string }) {
  const { catalog } = useApp();
  return <Face name={name || "?"} emoji={actorIcon(catalog, id)} />;
}

const KIND_COLOUR: Record<Kind, Colour | undefined> = {
  todo: undefined,
  doing: "amber",
  waiting: "purple",
  done: "green",
};

export function KindChip({ kind, text }: { kind: Kind; text?: string }) {
  const colour = KIND_COLOUR[kind];
  return <Pill {...(colour ? { colour } : {})}>{text ?? KINDS[kind]}</Pill>;
}

export function LabelChip({ label }: { label: { name: string; colour: Colour } }) {
  return <Pill colour={label.colour}>{label.name}</Pill>;
}

/** A ticket as a list row. It opens the ticket's page and can be dragged to a column. */
export function TicketRow({
  ticket,
  aside,
  column,
}: {
  ticket: Ticket;
  aside?: ReactNode;
  /** Show which column it is in, for views that do not group by column. */
  column?: boolean;
}) {
  const meta = [
    ticket.id,
    column ? ticket.column.name : "",
    ticket.featureName,
    ticket.locationName ? `📍 ${ticket.locationName}` : "",
    ticket.comments > 0 ? `💬 ${ticket.comments}` : "",
    ticket.images > 0 ? `🖼 ${ticket.images}` : "",
    ticket.awaiting > 0 ? `❓ ${ticket.awaiting}` : "",
  ].filter(Boolean);
  return (
    <ListRow
      to={`/t/${ticket.id}`}
      dragId={ticket.id}
      blocked={ticket.blocked !== null}
      aside={
        aside ??
        (ticket.assignee ? (
          <ActorAvatar id={ticket.assignee} name={ticket.assigneeName} />
        ) : undefined)
      }
    >
      <b>{ticket.title}</b>
      {ticket.blocked && <span className="tk-muted">{`Blocked: ${ticket.blocked}`}</span>}
      {ticket.labels.length > 0 && (
        <span>
          {ticket.labels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </span>
      )}
      <span className="tk-muted">{meta.join(" · ")}</span>
    </ListRow>
  );
}

/** One line to add something: a comment, an inbox item, an answer. */
export function Say({
  label,
  button,
  onSubmit,
}: {
  label: string;
  button: string;
  onSubmit: (text: string) => unknown;
}) {
  const [text, setText] = useState("");
  return (
    <Composer
      label={label}
      placeholder={label}
      button={button}
      value={text}
      onChange={setText}
      onSubmit={(said) => {
        setText("");
        void onSubmit(said);
      }}
    />
  );
}

// Projects made before the picker have a colour name; this is the swatch each one maps to.
const NAMED: Record<string, string> = {
  blue: "#6366f1", // toolkit-guard-allow
  teal: "#1db4cb", // toolkit-guard-allow
  green: "#48b685", // toolkit-guard-allow
  amber: "#ed9140", // toolkit-guard-allow
  purple: "#a855f7", // toolkit-guard-allow
  pink: "#c99b94", // toolkit-guard-allow
};

/** A project's colour as hex, and its icon name, whatever form they were stored in. */
export const projectLook = (project: { icon: string; colour: string }) => ({
  projectIcon: (PROJECT_ICONS as readonly string[]).includes(project.icon)
    ? project.icon
    : "folder",
  iconColour: NAMED[project.colour] ?? project.colour,
});
