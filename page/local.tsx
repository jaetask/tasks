// Small pieces the toolkit does not have yet, composed from its parts and
// tokens: columns of ticket rows that take a drop, tabs, pick-many
// checkboxes and a one-line composer.
import { Button, Card, cx, Input, ListCard, ListRow } from "@jaetask/toolkit";
import { type FormEvent, type ReactNode, useState } from "react";
import { type Colour, type Kind, KINDS, type Label, OWNER, type Ticket } from "./api.js";

export function LabelChip({ label }: { label: { name: string; colour: Colour } }) {
  return <span className={`label ${label.colour}`}>{label.name}</span>;
}

export function KindChip({ kind, text }: { kind: Kind; text?: string }) {
  return <span className={`kind ${kind}`}>{text ?? KINDS[kind]}</span>;
}

export function Initial({ id, name }: { id: string; name: string }) {
  return (
    <span className={cx("initial", id === OWNER && "owner")} title={name}>
      {(name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

/** A ticket as a list row. It opens the ticket's page and can be dragged to another column. */
export function TicketRow({ ticket, aside }: { ticket: Ticket; aside?: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: dragging is an extra; the row inside is a link
    <div
      className={cx("ticket-row", ticket.blocked && "blocked")}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", ticket.id)}
    >
      <ListRow
        to={`/t/${ticket.id}`}
        aside={
          aside ??
          (ticket.assignee ? (
            <Initial id={ticket.assignee} name={ticket.assigneeName} />
          ) : undefined)
        }
      >
        {ticket.labels.length > 0 && (
          <span className="bars">
            {ticket.labels.map((l: Label) => (
              <span key={l.id} className={`bar ${l.colour}`} title={l.name} />
            ))}
          </span>
        )}
        <b>{ticket.title}</b>
        {ticket.blocked && <span className="blocked-note">Blocked: {ticket.blocked}</span>}
        <span className="ticket-meta">
          <span className="mono">{ticket.id}</span>
          {ticket.featureName && <span>{ticket.featureName}</span>}
          {ticket.comments > 0 && <span>💬 {ticket.comments}</span>}
          {ticket.images > 0 && <span>🖼 {ticket.images}</span>}
          {ticket.awaiting > 0 && (
            <span title="Questions waiting for you">❓ {ticket.awaiting}</span>
          )}
        </span>
      </ListRow>
    </div>
  );
}

export type Lane = { id: string; title: string; kind: Kind; count?: boolean; tickets: Ticket[] };

/**
 * Columns of tickets, each a toolkit card holding a list. Dropping a ticket
 * on a column calls `onDrop`.
 */
export function Lanes({
  lanes,
  onDrop,
}: {
  lanes: Lane[];
  onDrop: (ticket: string, lane: string) => void;
}) {
  const [over, setOver] = useState<string | null>(null);
  return (
    <div className="lanes">
      {lanes.map((lane) => (
        <section
          key={lane.id}
          className={cx("lane", over === lane.id && "over")}
          aria-label={lane.title}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(lane.id);
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(null);
            const ticket = e.dataTransfer.getData("text/plain");
            if (ticket) onDrop(ticket, lane.id);
          }}
        >
          <Card>
            <div className="lane-head">
              <b>{lane.title}</b>
              <KindChip
                kind={lane.kind}
                {...(lane.count ? { text: String(lane.tickets.length) } : {})}
              />
            </div>
            {lane.tickets.length > 0 ? (
              <ListCard>
                {lane.tickets.map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </ListCard>
            ) : (
              <span className="tk-muted small">No tickets.</span>
            )}
          </Card>
        </section>
      ))}
    </div>
  );
}

/** Buttons to pick one view of a list, such as Unread or Acknowledged. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map(([id, text]) => (
        <Button
          key={id}
          type="button"
          surface="white"
          role="tab"
          aria-selected={value === id}
          className={cx(value === id && "tab-on")}
          onClick={() => onChange(id)}
        >
          {text}
        </Button>
      ))}
    </div>
  );
}

/** Checkboxes to pick any number of values, on an edit page. */
export function PickMany({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: { id: string; name: string }[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="pick-many">
      {options.map((o) => (
        <label key={o.id} className="check">
          <input
            type="checkbox"
            checked={value.includes(o.id)}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, o.id] : value.filter((v) => v !== o.id))
            }
          />
          {o.name}
        </label>
      ))}
    </div>
  );
}

/** One line to add something: a comment, an inbox item, an answer. */
export function Composer({
  placeholder,
  button,
  onSubmit,
}: {
  placeholder: string;
  button: string;
  onSubmit: (text: string) => unknown;
}) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const said = text.trim();
    if (!said) return;
    setText("");
    void onSubmit(said);
  };
  return (
    <form className="composer" onSubmit={submit}>
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit">{button}</Button>
    </form>
  );
}

/** A small label above a value. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <span className="tk-kicker">{label}</span>
      <div>{children}</div>
    </div>
  );
}
