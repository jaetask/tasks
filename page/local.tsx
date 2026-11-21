import { IconCircleDashed, IconUser } from "@tabler/icons-react";
import { Composer, IconAvatar, PROJECT_ICONS } from "@jaetask/toolkit/suite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@jaetask/toolkit/ui/alert-dialog";
import { Badge } from "@jaetask/toolkit/ui/badge";
import { Checkbox } from "@jaetask/toolkit/ui/checkbox";
import { Input } from "@jaetask/toolkit/ui/input";
import { Label } from "@jaetask/toolkit/ui/label";
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
import { type Colour, KINDS, type Kind, type Project } from "./api.js";
import { useApp } from "./app.js";

type Option = { id: string; name: string };

const NONE = "__none";

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

export function Tick({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Label className="flex items-center gap-2 text-xs">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </Label>
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

export function Face({
  name,
  emoji,
  colour,
  size = 24,
}: {
  name: string;
  emoji?: string;
  colour?: string;
  size?: number;
}) {
  return <IconAvatar name={name} icon={emoji ?? ""} colour={colour ?? ""} size={size} />;
}

export function DeleteForGood({
  name,
  what,
  label,
  open,
  onOpenChange,
  onConfirm,
}: {
  name: string;
  what: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setTyped("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Delete ${name} for good?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {`${what} will be deleted. This cannot be undone. Type ${name} to confirm.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          autoFocus
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

export const projectEmoji = (project: Project) =>
  /^[a-z-]*$/.test(project.icon) ? "" : project.icon;

export function ProjectAvatar({ project }: { project: Project }) {
  return <Face name={project.name} emoji={projectEmoji(project)} />;
}

export function ActorAvatar({
  id,
  name,
  size,
}: {
  id: string | null;
  name: string;
  size?: number;
}) {
  const { catalog } = useApp();
  const actor = catalog.actors.find((a) => a.id === id);
  return (
    <Face
      name={actor?.name || name || "?"}
      emoji={actor?.icon ?? ""}
      colour={actor?.colour ?? ""}
      {...(size ? { size } : {})}
    />
  );
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

export const TICKET_DRAG = "application/x-tasks-ticket";

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

const NAMED: Record<string, string> = {
  blue: "#6366f1", // toolkit-guard-allow
  teal: "#1db4cb", // toolkit-guard-allow
  green: "#48b685", // toolkit-guard-allow
  amber: "#ed9140", // toolkit-guard-allow
  purple: "#a855f7", // toolkit-guard-allow
  pink: "#c99b94", // toolkit-guard-allow
};

export const namedColour = (name: string) => NAMED[name] ?? name;

export const projectLook = (project: { icon: string; colour: string }) => ({
  projectIcon: (PROJECT_ICONS as readonly string[]).includes(project.icon)
    ? project.icon
    : "folder",
  iconColour: NAMED[project.colour] ?? project.colour,
});

export const LINK_LINE = "A web address that belongs to this ticket, such as a pull request.";

export const addLink =
  (act: (action: string, input: unknown) => Promise<unknown>, ticket: string) =>
  async (url: string, title: string | undefined) =>
    (await act("tickets.ticket-link-add", { ticket, url, ...(title ? { title } : {}) })) !== null;

export function NoActor({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center text-muted-foreground"
    >
      <IconCircleDashed size={size} />
      <IconUser size={Math.round(size * 0.55)} className="absolute" />
    </span>
  );
}
