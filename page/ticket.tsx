// A ticket's page: what it is, where it is, its images, the questions on it
// and its conversation, all from toolkit parts.

import { InlineMarkdown } from "@jaetask/toolkit/app/review";
import { PageBody, Thumbs } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Checkbox } from "@jaetask/toolkit/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@jaetask/toolkit/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@jaetask/toolkit/ui/dropdown-menu";
import { Input } from "@jaetask/toolkit/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@jaetask/toolkit/ui/tooltip";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronRight,
  IconLink,
  IconMapPin,
  IconNote,
  IconPlus,
  IconStack2,
  IconTag,
  IconUserOff,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Activity, Attach, ReactionRow } from "./activity.js";
import {
  type Comment,
  type Conversation,
  call,
  type Feature,
  type Image,
  type InputRequest,
  type Kind,
  OWNER,
  PRIORITIES,
  type Ticket,
  type TicketStep,
  TYPES,
  when,
} from "./api.js";
import { useApp, useRead } from "./app.js";
import { Editor } from "./editor.js";
import { DeleteForGood, Face, Nothing } from "./local.js";
import { RequestCard } from "./pages.js";
import {
  LabelDot,
  PRIORITY_NAME,
  PriorityIcon,
  PropertyPicker,
  RailRow,
  StatusIcon,
} from "./pickers.js";

/** The images of a ticket with their data, read one by one as they are needed. */
function useThumbs(images: Image[] | undefined) {
  const [data, setData] = useState<Record<string, string>>({});
  const wanted = (images ?? []).map((i) => i.id).join(" ");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `wanted` stands for the images
  useEffect(() => {
    for (const image of images ?? []) {
      if (data[image.id]) continue;
      void call("images.image-read", { image: image.id }).then((outcome) => {
        const full = outcome.output as { type: string; data: string } | undefined;
        if (outcome.state === "succeeded" && full?.data) {
          setData((had) => ({ ...had, [image.id]: `data:${full.type};base64,${full.data}` }));
        }
      });
    }
  }, [wanted]);
  return (images ?? [])
    .filter((i) => data[i.id])
    .map((i) => ({ id: i.id, src: data[i.id] as string, alt: i.name }));
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const _KIND_DOT: Record<Kind, string> = {
  todo: "bg-muted-foreground/50",
  doing: "bg-amber-500",
  waiting: "bg-violet-500",
  done: "bg-emerald-500",
};

/** A ticket's own page, for its address. From a board it opens in a dialog with the same view. */
export function TicketPage({ id }: { id: string }) {
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  return (
    <PageBody title={id} line={ticket ? undefined : "This ticket is not here."}>
      <TicketView id={id} />
    </PageBody>
  );
}

/** A small round button that goes to where a property's value is shown across tickets. */
function GoTo({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            aria-label={label}
            className="size-6 shrink-0 rounded-full p-0 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
            onClick={onClick}
          >
            <IconChevronRight size={14} aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** A ticket's checklist: tick a step, leave a note on it, add one at the end. */
function Steps({ ticket, open }: { ticket: string; open: boolean }) {
  const { act } = useApp();
  const steps = useRead<TicketStep[]>("steps.ticket-step-list", { ticket }) ?? [];
  const [title, setTitle] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [note, setNote] = useState("");
  if (!open && steps.length === 0) return null;
  const add = () => {
    const wanted = title.trim();
    if (!wanted) return;
    setTitle("");
    void act("steps.ticket-step-add", { ticket, title: wanted });
  };
  return (
    <section id="steps" aria-label="Ticket steps" className="grid gap-1">
      <h3 className="text-xs font-medium text-muted-foreground">
        {steps.length > 0
          ? `Steps · ${steps.filter((s) => s.done).length} of ${steps.length}`
          : "Steps"}
      </h3>
      {steps.map((step, index) => (
        <div key={step.id} className="step group rounded-md px-1 hover:bg-muted/40">
          <div className="flex items-center gap-2 py-1">
            <Checkbox
              aria-label={step.title}
              checked={step.done}
              disabled={!open}
              onCheckedChange={(v) =>
                void act(v === true ? "steps.ticket-step-check" : "steps.ticket-step-uncheck", {
                  step: step.id,
                })
              }
            />
            <Button
              variant="ghost"
              className={`h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left font-normal hover:bg-transparent ${step.done ? "text-muted-foreground line-through" : ""}`}
              onClick={() => {
                setShown(shown === step.id ? null : step.id);
                setNote("");
              }}
            >
              {step.title}
            </Button>
            {step.notes.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <IconNote size={14} aria-hidden />
                {step.notes.length}
              </span>
            )}
            {open && (
              <span className="flex opacity-0 focus-within:opacity-100 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move ${step.title} up`}
                  disabled={index === 0}
                  onClick={() =>
                    void act("steps.ticket-step-move", {
                      step: step.id,
                      before: steps[index - 1]?.id,
                    })
                  }
                >
                  <IconArrowUp aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move ${step.title} down`}
                  disabled={index === steps.length - 1}
                  onClick={() =>
                    void act("steps.ticket-step-move", {
                      step: step.id,
                      ...(steps[index + 2] ? { before: steps[index + 2]?.id } : {}),
                    })
                  }
                >
                  <IconArrowDown aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${step.title}`}
                  onClick={() => void act("steps.ticket-step-remove", { step: step.id })}
                >
                  <IconX aria-hidden />
                </Button>
              </span>
            )}
          </div>
          {shown === step.id && (
            <div className="mb-2 ml-6 grid gap-2 border-l-2 pl-3">
              {step.notes.map((n) => (
                <div key={n.id}>
                  <div className="body min-w-0 break-words">
                    <InlineMarkdown content={n.text} renderLists />
                  </div>
                  <p className="m-0 text-xs text-muted-foreground">{`${n.byName} · ${when(n.at)}`}</p>
                </div>
              ))}
              {open && (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = note.trim();
                    if (!text) return;
                    setNote("");
                    void act("steps.ticket-step-note", { step: step.id, text });
                  }}
                >
                  <Input
                    aria-label={`Note for ${step.title}`}
                    placeholder="Record what was checked or link to a result"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button type="submit" variant="outline">
                    Add note
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      ))}
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input
            aria-label="New step"
            placeholder="Add a step"
            className="border-transparent shadow-none hover:border-input focus-visible:border-input"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
        </form>
      )}
    </section>
  );
}

/** What a ticket is, its steps, images and conversation, with its properties in a rail on the right. */
export function TicketView({ id, onGone }: { id: string; onGone?: () => void }) {
  const { catalog, act, go, narrow, setNarrow } = useApp();
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  const conversation = useRead<Conversation>("comments.conversation-read", { ticket: id });
  const images = useRead<Image[]>("images.image-list", { ticket: id });
  const requests = useRead<InputRequest[]>("input.input-list", { ticket: id, state: "awaiting" });
  const features = useRead<Feature[]>(ticket ? "tickets.feature-find" : null, {
    project: ticket?.project,
  });
  const thumbs = useThumbs(images);
  const [replyTo, _setReplyTo] = useState<string | null>(null);
  const [_tab, _setTab] = useState<"comments" | "activity">("comments");
  const [handoff, setHandoff] = useState("");
  const [link, setLink] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  // What the description editor holds, until it is saved on leaving it.
  const draft = useRef<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  if (!ticket) return <Nothing text={`No ticket has the id ${id}.`} />;
  const open = ticket.state === "open";
  const project = catalog.projects.find((p) => p.id === ticket.project);
  const actor = catalog.actors.find((a) => a.id === ticket.assignee);
  const entries = conversation?.entries ?? [];
  const comments = entries.filter((e) => e.type === "comment");
  const _changes = entries.length - comments.length;
  const _replying = comments.find((e) => e.type === "comment" && e.comment.id === replyTo) as
    | { comment: Comment }
    | undefined;
  const gone = () => (onGone ? onGone() : go("/archive"));
  const quiet = "h-8 w-full border-transparent bg-transparent px-2 shadow-none hover:bg-muted/60";
  return (
    <div className="grid gap-6 text-sm lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="grid min-w-0 content-start gap-5">
        <p className="m-0 text-xs text-muted-foreground">
          {[ticket.id, project?.name ?? ticket.project, ticket.featureName]
            .filter(Boolean)
            .join(" / ")}
        </p>

        <section id="ticket" className="grid gap-3">
          <Input
            aria-label="Title"
            className="h-auto border-transparent px-0 text-lg font-semibold shadow-none hover:border-input focus-visible:border-input md:text-lg"
            disabled={!open}
            value={title ?? ticket.title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            onBlur={() => {
              const wanted = (title ?? "").trim();
              setTitle(null);
              if (wanted && wanted !== ticket.title) {
                void act("tickets.ticket-edit", { ticket: id, title: wanted });
              }
            }}
          />
          {open ? (
            <div className="description min-w-0 break-words">
              <Editor
                key={ticket.description}
                label="Description"
                placeholder="Add a description..."
                value={ticket.description}
                onChange={(markdown) => {
                  draft.current = markdown;
                }}
                onBlur={() => {
                  const wanted = draft.current;
                  if (wanted !== null && wanted.trim() !== ticket.description.trim()) {
                    void act("tickets.ticket-edit", { ticket: id, description: wanted });
                  }
                }}
                className="text-sm outline-none"
              />
            </div>
          ) : (
            <div className="body min-w-0 break-words">
              <InlineMarkdown content={ticket.description || "No description."} renderLists />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <ReactionRow
              reactions={ticket.reactions}
              onToggle={(emoji, active) =>
                void act(
                  active ? "tickets.ticket-reaction-add" : "tickets.ticket-reaction-remove",
                  {
                    ticket: id,
                    emoji,
                  },
                )
              }
            />
            {open && <Attach ticket={id} />}
          </div>
        </section>

        {(ticket.links.length > 0 || open) && (
          <section id="links" aria-label="Links" className="grid gap-1">
            {ticket.links.map((l) => (
              <div key={l.id} className="group flex items-center gap-2">
                <IconLink size={14} aria-hidden className="shrink-0 text-muted-foreground" />
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 break-all underline underline-offset-2"
                >
                  {l.url}
                </a>
                {open && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove the link ${l.url}`}
                    className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() =>
                      void act("tickets.ticket-link-remove", { ticket: id, link: l.id })
                    }
                  >
                    <IconX aria-hidden />
                  </Button>
                )}
              </div>
            ))}
            {open && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const url = link.trim();
                  if (!url) return;
                  void act("tickets.ticket-link-add", { ticket: id, url }).then(
                    (done) => done && setLink(""),
                  );
                }}
              >
                <Input
                  aria-label="New link"
                  placeholder="Add a link"
                  className="border-transparent shadow-none hover:border-input focus-visible:border-input"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </form>
            )}
          </section>
        )}

        <Steps ticket={id} open={open} />

        <section id="images" className="grid gap-2">
          {thumbs.length > 0 && (
            <Thumbs
              items={thumbs}
              onRemove={(image) => void act("images.image-remove", { image })}
            />
          )}
        </section>

        <Activity ticket={id} conversation={conversation} canWrite={open} />

        {requests && requests.length > 0 && (
          <Collapsible defaultOpen>
            <section id="questions" className="grid gap-2">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto justify-start gap-2 p-0 hover:bg-transparent"
                >
                  <IconChevronRight size={14} aria-hidden />
                  {`Human input · ${requests.length} awaiting your answer`}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid gap-2">
                {requests.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </CollapsibleContent>
            </section>
          </Collapsible>
        )}
      </div>

      <aside id="place" aria-label="Properties" className="grid min-w-0 content-start gap-2">
        <div className="mb-1 flex justify-start px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
                <IconChevronDown size={14} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {open ? (
                <>
                  <DropdownMenuItem onSelect={() => go(`/t/${id}/edit`)}>
                    Edit ticket
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      void act(
                        ticket.backlog
                          ? "tickets.ticket-board-send"
                          : "tickets.ticket-backlog-send",
                        { ticket: id },
                      )
                    }
                  >
                    {ticket.backlog ? "Put on the board" : "Send to the backlog"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => void act("tickets.ticket-archive", { ticket: id })}
                  >
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void act("tickets.ticket-cancel", { ticket: id })}
                  >
                    Cancel ticket
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onSelect={() => void act("tickets.ticket-restore", { ticket: id })}
                >
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h3 className="m-0 px-2 text-xs font-medium text-muted-foreground">Properties</h3>
        <PropertyPicker
          label="Status"
          placeholder="Change status..."
          hint="S"
          disabled={!open}
          chosen={ticket.backlog ? [] : [ticket.column.id]}
          choices={(project?.columns ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            icon: <StatusIcon kind={c.kind} />,
          }))}
          onPick={(column) =>
            void (async () => {
              // A backlog ticket goes on the board first, then to the column picked.
              if (ticket.backlog) await act("tickets.ticket-board-send", { ticket: id });
              await act("tickets.ticket-move", { ticket: id, column });
            })()
          }
        >
          <RailRow
            data-property="status"
            icon={<StatusIcon kind={ticket.column.kind} backlog={ticket.backlog} />}
          >
            {open ? (ticket.backlog ? "Backlog" : ticket.column.name) : titleCase(ticket.state)}
          </RailRow>
        </PropertyPicker>
        <PropertyPicker
          label="Priority"
          placeholder="Set priority to..."
          hint="P"
          disabled={!open}
          chosen={[ticket.priority]}
          choices={PRIORITIES.map((p) => ({
            id: p,
            name: PRIORITY_NAME[p],
            icon: <PriorityIcon priority={p} />,
          }))}
          onPick={(priority) => void act("tickets.ticket-priority-set", { ticket: id, priority })}
        >
          <RailRow
            data-property="priority"
            muted={ticket.priority === "none"}
            icon={<PriorityIcon priority={ticket.priority} />}
          >
            {ticket.priority === "none" ? "Set priority" : PRIORITY_NAME[ticket.priority]}
          </RailRow>
        </PropertyPicker>
        <div className="group/row flex min-w-0 items-center">
          <PropertyPicker
            label="Actor"
            placeholder="Assign to..."
            hint="A"
            disabled={!open}
            chosen={[ticket.assignee ?? ""]}
            choices={[
              { id: "", name: "No actor", icon: <IconUserOff size={16} aria-hidden /> },
              ...catalog.actors
                .filter((a) => !a.archived || a.id === ticket.assignee)
                .map((a) => ({
                  id: a.id,
                  name: a.name,
                  icon: <Face name={a.name} emoji={a.icon} />,
                  ...(a.id === OWNER ? {} : { group: "Agents" }),
                })),
            ]}
            onPick={(picked) => {
              const note = handoff.trim();
              setHandoff("");
              void act("tickets.ticket-assign", {
                ticket: id,
                actor: picked || null,
                ...(note && picked ? { note } : {}),
              });
            }}
          >
            <RailRow
              data-property="actor"
              muted={!actor}
              icon={
                actor ? (
                  <Face name={actor.name} emoji={actor.icon} />
                ) : (
                  <IconUserOff size={16} aria-hidden />
                )
              }
            >
              {actor ? actor.name : "No actor"}
            </RailRow>
          </PropertyPicker>
          {actor && (
            <GoTo
              label="Go to actor"
              onClick={() => {
                setNarrow({ ...narrow, actor: actor.id });
                go("/overview");
              }}
            />
          )}
        </div>
        {open && (
          <Input
            aria-label="Handoff note"
            placeholder="Handoff note for the next actor"
            className={quiet}
            value={handoff}
            onChange={(e) => setHandoff(e.target.value)}
          />
        )}
        {(catalog.locations.length > 0 || ticket.location) && (
          <PropertyPicker
            label="Location"
            placeholder="Set location to..."
            disabled={!open}
            chosen={[ticket.location ?? ""]}
            choices={[
              { id: "", name: "No location" },
              ...catalog.locations
                .filter((l) => !l.archived || l.id === ticket.location)
                .map((l) => ({ id: l.id, name: l.name })),
            ]}
            onPick={(location) =>
              void act("tickets.ticket-location-set", { ticket: id, location: location || null })
            }
          >
            <RailRow
              data-property="location"
              muted={!ticket.location}
              icon={<IconMapPin size={16} aria-hidden className="text-muted-foreground" />}
            >
              {ticket.locationName || "No location"}
            </RailRow>
          </PropertyPicker>
        )}
        <div className="group/row flex min-w-0 items-center">
          <PropertyPicker
            label="Feature"
            placeholder="Set feature to..."
            disabled={!open}
            chosen={[ticket.feature ?? ""]}
            choices={[
              { id: "", name: "No feature" },
              ...(features ?? []).map((f) => ({ id: f.id, name: f.name })),
            ]}
            onPick={(feature) =>
              void act("tickets.ticket-feature-set", { ticket: id, feature: feature || null })
            }
          >
            <RailRow
              data-property="feature"
              muted={!ticket.feature}
              icon={<IconStack2 size={16} aria-hidden className="text-muted-foreground" />}
            >
              {ticket.featureName || "No feature"}
            </RailRow>
          </PropertyPicker>
          {ticket.feature && (
            <GoTo
              label="Go to feature"
              onClick={() =>
                go(`/p/${ticket.project}/board?feature=${encodeURIComponent(ticket.feature ?? "")}`)
              }
            />
          )}
        </div>
        <PropertyPicker
          label="Type"
          placeholder="Set type to..."
          disabled={!open}
          chosen={[ticket.type]}
          choices={TYPES.map((t) => ({ id: t, name: titleCase(t) }))}
          onPick={(type) => void act("tickets.ticket-type-set", { ticket: id, type })}
        >
          <RailRow
            data-property="type"
            icon={<IconTag size={16} aria-hidden className="text-muted-foreground" />}
          >
            {titleCase(ticket.type)}
          </RailRow>
        </PropertyPicker>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = (blocked ?? "").trim();
            setBlocked(null);
            void act(text ? "tickets.ticket-block" : "tickets.ticket-unblock", {
              ticket: id,
              ...(text ? { note: text } : {}),
            });
          }}
        >
          <Input
            aria-label="Blocked"
            placeholder="Not blocked"
            className={quiet}
            disabled={!open}
            value={blocked ?? ticket.blocked ?? ""}
            onChange={(e) => setBlocked(e.target.value)}
            onBlur={(e) => {
              if (blocked !== null && blocked.trim() !== (ticket.blocked ?? "")) {
                e.currentTarget.form?.requestSubmit();
              } else setBlocked(null);
            }}
          />
        </form>
        <div className="mt-3 flex items-center justify-between px-2">
          <h3 className="m-0 text-xs font-medium text-muted-foreground">Labels</h3>
          <PropertyPicker
            label="Labels"
            placeholder="Change or add labels..."
            hint="L"
            many
            disabled={!open}
            chosen={ticket.labels.map((l) => l.id)}
            choices={catalog.labels.map((l) => ({
              id: l.id,
              name: l.name,
              icon: <LabelDot colour={l.colour} />,
            }))}
            onPick={(label) =>
              void act(
                ticket.labels.some((l) => l.id === label)
                  ? "tickets.ticket-label-remove"
                  : "tickets.ticket-label-add",
                { ticket: id, label },
              )
            }
            onCreate={(name) =>
              void act<{ id: string }>("catalog.label-create", { name, colour: "blue" }).then(
                (made) => made && act("tickets.ticket-label-add", { ticket: id, label: made.id }),
              )
            }
          >
            <Button
              variant="ghost"
              aria-label="Change or add labels"
              className="size-6 rounded-full p-0 text-muted-foreground"
            >
              <IconPlus size={14} aria-hidden />
            </Button>
          </PropertyPicker>
        </div>
        {ticket.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2">
            {ticket.labels.map((l) => (
              <span
                key={l.id}
                className="pill flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
              >
                <LabelDot colour={l.colour} />
                {l.name}
              </span>
            ))}
          </div>
        )}
        {!open && (
          <div className="mt-2 flex flex-wrap gap-2">
            <DeleteForGood
              name={ticket.id}
              what="This ticket, with its comments and images"
              label="Delete forever"
              onConfirm={() => {
                void act("tickets.ticket-delete", { ticket: id }).then(gone);
              }}
            />
          </div>
        )}
        <div className="mt-3 grid gap-1 border-t pt-3 text-xs text-muted-foreground">
          <span>{`Updated ${when(ticket.updatedAt)}`}</span>
          <span>{`Created ${when(ticket.createdAt)}`}</span>
        </div>
      </aside>
    </div>
  );
}
