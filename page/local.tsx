// Tasks' own small pieces, each made only of toolkit parts: a ticket as a
// list row, the chips for kinds and labels, and a composer that keeps its
// own text.
import { Avatar, Chip, Composer, ListRow } from "@jaetask/toolkit";
import { type ReactNode, useState } from "react";
import { COLOURS, type Colour, type Kind, KINDS, type Project, type Ticket } from "./api.js";
import { actorIcon, useApp } from "./app.js";

/** A project's emoji, or "" when its icon is an icon name or it has none. */
export const projectEmoji = (project: Project) =>
  /^[a-z-]*$/.test(project.icon) ? "" : project.icon;

/** A project's round picture: its emoji or first letter, on its colour when that is a named one. */
export function ProjectAvatar({ project }: { project: Project }) {
  const named = (COLOURS as readonly string[]).includes(project.colour);
  const emoji = projectEmoji(project);
  return (
    <Avatar
      name={project.name}
      {...(named ? { colour: project.colour as Colour } : {})}
      {...(emoji ? { emoji } : {})}
    />
  );
}

/** An actor's round picture: its icon, or the first letter of its name. */
export function ActorAvatar({ id, name }: { id: string | null; name: string }) {
  const { catalog } = useApp();
  const emoji = actorIcon(catalog, id);
  return <Avatar name={name || "?"} {...(emoji ? { emoji } : {})} />;
}

const KIND_COLOUR: Record<Kind, Colour | undefined> = {
  todo: undefined,
  doing: "amber",
  waiting: "purple",
  done: "green",
};

export function KindChip({ kind, text }: { kind: Kind; text?: string }) {
  const colour = KIND_COLOUR[kind];
  return <Chip {...(colour ? { colour } : {})}>{text ?? KINDS[kind]}</Chip>;
}

export function LabelChip({ label }: { label: { name: string; colour: Colour } }) {
  return <Chip colour={label.colour}>{label.name}</Chip>;
}

/** A ticket as a list row. It opens the ticket's page and can be dragged to a column. */
export function TicketRow({ ticket, aside }: { ticket: Ticket; aside?: ReactNode }) {
  const meta = [
    ticket.id,
    ticket.featureName,
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
