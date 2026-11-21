// A ticket's page: what it is, where it is, its images, the questions on it
// and its conversation, all from toolkit parts.

import {
  FormDialog,
  InlineText,
  MarkdownText,
  PageSection,
  RowMenu,
  Thumbs,
  TimeAgo,
} from "@jaetask/toolkit/suite";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import { Button } from "@jaetask/toolkit/ui/button";
import { Checkbox } from "@jaetask/toolkit/ui/checkbox";
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
  IconChevronRight,
  IconHandStop,
  IconMapPin,
  IconPlus,
  IconStack2,
  IconTag,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Activity, Attach, ReactionRow, usePictures } from "./activity.js";
import {
  type Comment,
  type Conversation,
  call,
  type Feature,
  type Image,
  type InputRequest,
  type Kind,
  type Ticket,
  type TicketStep,
} from "./api.js";
import { useApp, useRead } from "./app.js";
import { Editor } from "./editor.js";
import { addLink, Face, LINK_LINE, Nothing, NoActor } from "./local.js";
import { AddLinkDialog } from "@jaetask/toolkit/suite";
import { EvidenceSection } from "./evidence.js";
import { FilesSection } from "./files.js";
import { linkHost, ServiceIcon } from "@jaetask/toolkit/suite";
import { RequestCard } from "./pages.js";
import { LabelDot, PRIORITY_NAME, PriorityIcon, RailRow, StatusIcon } from "./pickers.js";
import {
  ActorPicker,
  DueIcon,
  DuePicker,
  dueLabel,
  FeaturePicker,
  LabelsPicker,
  LocationPicker,
  PriorityPicker,
  StatusPicker,
  TypePicker,
} from "./properties.js";
import { TicketActions, TicketMenu } from "./ticket-menu.js";

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
  // The ticket's own title is the page's heading: its id and project sit above it, small.
  return (
    <div className="max-w-5xl pt-1">
      <TicketView id={id} />
    </div>
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
  const [editing, setEditing] = useState<string | null>(null);
  if (!open && steps.length === 0) return null;
  const add = () => {
    const wanted = title.trim();
    if (!wanted) return;
    setTitle("");
    void act("steps.ticket-step-add", { ticket, title: wanted });
  };
  return (
    <PageSection
      id="steps"
      title="Steps"
      count={steps.length > 0 ? `${steps.filter((s) => s.done).length} of ${steps.length}` : ""}
    >
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
            {editing === step.id ? (
              // Enter or leaving the box saves the new wording; Escape leaves it as it was.
              <Input
                autoFocus
                aria-label={`Rename ${step.title}`}
                className="h-7 flex-1"
                maxLength={200}
                defaultValue={step.title}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    e.currentTarget.value = step.title;
                    e.currentTarget.blur();
                  }
                }}
                onBlur={(e) => {
                  const wanted = e.currentTarget.value.trim();
                  setEditing(null);
                  if (wanted && wanted !== step.title) {
                    void act("steps.ticket-step-rename", { step: step.id, title: wanted });
                  }
                }}
              />
            ) : (
              <Button
                variant="ghost"
                disabled={!open}
                className={`h-auto min-w-0 flex-1 cursor-text justify-start whitespace-normal p-0 text-left font-normal hover:bg-transparent disabled:opacity-100 ${step.done ? "text-muted-foreground line-through" : ""}`}
                onClick={() => setEditing(step.id)}
              >
                {step.title}
              </Button>
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
    </PageSection>
  );
}

/** Asked when a ticket is given to an actor: what the next actor needs to know. It can be left empty. */
function HandoffDialog({
  ticket,
  to,
  onClose,
}: {
  ticket: Ticket;
  to: string;
  onClose: () => void;
}) {
  const { catalog, act } = useApp();
  const [note, setNote] = useState("");
  const name = catalog.actors.find((a) => a.id === to)?.name ?? to;
  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Hand ${ticket.id} to ${name}`}
      line="A note for the next actor: what is done, and what comes next. It is left on the ticket as a comment. Leave it empty for none."
      saveLabel="Assign"
      onSave={async () =>
        (await act("tickets.ticket-assign", {
          ticket: ticket.id,
          actor: to,
          ...(note.trim() ? { note: note.trim() } : {}),
        })) !== null
      }
    >
      <Textarea
        autoFocus
        aria-label="Handoff note"
        placeholder="Handoff note (optional)"
        value={note}
        maxLength={5000}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          // Enter assigns; Shift+Enter starts a new line.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
    </FormDialog>
  );
}

/** What a ticket is, its steps, images and conversation, with its properties in a rail on the right. */
export function TicketView({ id, onGone }: { id: string; onGone?: () => void }) {
  const { catalog, act, go } = useApp();
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  const conversation = useRead<Conversation>("comments.conversation-read", { ticket: id });
  const images = useRead<Image[]>("images.image-list", { ticket: id });
  // Every question asked on the ticket: those awaiting an answer first, then the answered ones.
  const asked = useRead<InputRequest[]>("input.input-list", { ticket: id });
  const awaiting = (asked ?? []).filter((r) => r.state === "awaiting");
  const requests = asked && [...awaiting, ...asked.filter((r) => r.state !== "awaiting")];
  const _features = useRead<Feature[]>(ticket ? "tickets.feature-find" : null, {
    project: ticket?.project,
  });
  const thumbs = useThumbs(images);
  const [replyTo, _setReplyTo] = useState<string | null>(null);
  const [_tab, _setTab] = useState<"comments" | "activity">("comments");
  const [handTo, setHandTo] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  // What the description editor holds, until it is saved on leaving it.
  const draft = useRef<string | null>(null);
  // The labels list opens beside this heading, which does not move as labels come and go.
  const labelsAt = useRef<HTMLHeadingElement>(null);
  const pictures = usePictures(id);
  if (!ticket) return <Nothing text={`No ticket has the id ${id}.`} />;
  const open = ticket.state === "open";
  const project = catalog.projects.find((p) => p.id === ticket.project);
  const actor = catalog.actors.find((a) => a.id === ticket.assignee);
  const entries = conversation?.entries ?? [];
  // Everything written on the ticket: a file shown inside it is not listed again under it.
  const written = [
    ticket?.description ?? "",
    ...entries.flatMap((e) =>
      e.type === "comment" ? [e.comment.text, ...e.comment.replies.map((r) => r.text)] : [],
    ),
  ].join("\n");
  const comments = entries.filter((e) => e.type === "comment");
  const _changes = entries.length - comments.length;
  const _replying = comments.find((e) => e.type === "comment" && e.comment.id === replyTo) as
    | { comment: Comment }
    | undefined;
  const gone = () => (onGone ? onGone() : go("/archive"));
  return (
    <div className="grid gap-6 text-sm lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="grid min-w-0 content-start gap-5">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-xs text-muted-foreground">
            {[ticket.id, project?.name ?? ticket.project, ticket.featureName]
              .filter(Boolean)
              .join(" / ")}
            {!open && ` · ${titleCase(ticket.state)}`}
          </p>
          {/* Leaves room for the dialog's own close button, which sits in this corner. */}
          <span>
            <TicketActions ticket={ticket} onGone={gone} />
          </span>
        </div>

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
                onImageUpload={pictures}
              />
            </div>
          ) : (
            <div className="body min-w-0 break-words">
              <MarkdownText content={ticket.description || "No description."} />
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
            {open && <Attach ticket={id} shortcut />}
          </div>
        </section>

        {(ticket.links.length > 0 || open) && (
          <PageSection
            id="links"
            title="Resources"
            count={ticket.links.length || ""}
            {...(open ? { onAdd: () => setAdding(true), addLabel: "Add a link" } : {})}
          >
            {ticket.links.map((l) => (
              <div
                key={l.id}
                className="resource group flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
              >
                <ServiceIcon url={l.url} className="shrink-0" />
                {renaming === l.id ? (
                  <InlineText
                    value={l.title || linkHost(l.url)}
                    label="Link title"
                    className="font-medium"
                    maxLength={200}
                    editing
                    onEditingChange={(on) => setRenaming(on ? l.id : null)}
                    onSave={(next) =>
                      void act("tickets.ticket-link-describe", {
                        link: l.id,
                        title: next,
                        description: l.description,
                      })
                    }
                  />
                ) : (
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    title={l.url}
                    className={`hover:underline ${l.title ? "max-w-[50%] shrink-0 truncate font-medium" : "min-w-0 truncate"}`}
                  >
                    {l.title || l.url.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                )}
                <span
                  className="min-w-0 flex-1 truncate text-muted-foreground"
                  title={l.description}
                >
                  {l.title ? l.description || linkHost(l.url) : ""}
                </span>
                {open && (
                  <RowMenu
                    quiet
                    label={`Link ${l.title || l.url}`}
                    items={[
                      { label: "Rename", onSelect: () => setRenaming(l.id) },
                      {
                        label: "Copy link",
                        onSelect: () => void navigator.clipboard?.writeText(l.url),
                      },
                      {
                        label: "Remove",
                        onSelect: () =>
                          void act("tickets.ticket-link-remove", { ticket: id, link: l.id }),
                      },
                    ]}
                  />
                )}
              </div>
            ))}
            {ticket.links.length === 0 && (
              <p className="m-0 text-xs text-muted-foreground">No links yet.</p>
            )}
            <AddLinkDialog
              to={id}
              line={LINK_LINE}
              open={adding}
              onOpenChange={setAdding}
              onAdd={addLink(act, id)}
            />
          </PageSection>
        )}

        <Steps ticket={id} open={open} />
        <EvidenceSection ticket={ticket} open={open} />

        <section id="images" className="grid gap-2">
          {thumbs.length > 0 && (
            <Thumbs
              items={thumbs}
              onRemove={(image) => void act("images.image-remove", { image })}
            />
          )}
        </section>

        <FilesSection ticket={id} open={open} inText={written} />

        <Activity ticket={id} conversation={conversation} canWrite={open} />

        {requests && requests.length > 0 && (
          <PageSection
            id="questions"
            title="Human input"
            count={
              awaiting.length > 0
                ? `${awaiting.length} awaiting your answer`
                : `${requests.length} answered`
            }
            defaultOpen={awaiting.length > 0}
          >
            <div className="grid gap-2">
              {requests.map((r) => (
                <RequestCard key={r.id} request={r} />
              ))}
            </div>
          </PageSection>
        )}
      </div>

      <TicketMenu ticket={ticket} onGone={gone}>
        <aside id="place" aria-label="Properties" className="grid min-w-0 content-start gap-2">
          <h3 className="m-0 px-2 text-xs font-medium text-muted-foreground">Properties</h3>
          <StatusPicker ticket={ticket}>
            <RailRow
              data-property="status"
              icon={<StatusIcon kind={ticket.column.kind} backlog={ticket.backlog} />}
            >
              {open ? (ticket.backlog ? "Backlog" : ticket.column.name) : titleCase(ticket.state)}
            </RailRow>
          </StatusPicker>
          <PriorityPicker ticket={ticket}>
            <RailRow
              data-property="priority"
              muted={ticket.priority === "none"}
              icon={<PriorityIcon priority={ticket.priority} />}
            >
              {ticket.priority === "none" ? "Set priority" : PRIORITY_NAME[ticket.priority]}
            </RailRow>
          </PriorityPicker>
          <div className="group/row flex min-w-0 items-center">
            <ActorPicker ticket={ticket} onPick={(picked) => setHandTo(picked)}>
              <RailRow
                data-property="actor"
                muted={!actor}
                icon={
                  actor ? (
                    <Face name={actor.name} emoji={actor.icon} colour={actor.colour} />
                  ) : (
                    <NoActor size={20} />
                  )
                }
              >
                {actor ? actor.name : "No actor"}
              </RailRow>
            </ActorPicker>
            {actor && (
              <GoTo
                label="Go to actor"
                onClick={() => go(`/overview?actor=${encodeURIComponent(actor.id)}`)}
              />
            )}
          </div>
          {(catalog.locations.length > 0 || ticket.location) && (
            <div className="group/row flex items-center gap-1">
              <LocationPicker ticket={ticket}>
                <RailRow
                  data-property="location"
                  muted={!ticket.location}
                  icon={<IconMapPin size={16} aria-hidden className="text-muted-foreground" />}
                >
                  {ticket.locationName || "No location"}
                </RailRow>
              </LocationPicker>
              {ticket.location && (
                <GoTo
                  label="Go to location"
                  onClick={() =>
                    go(
                      `/p/${ticket.project}/board?location=${encodeURIComponent(ticket.location ?? "")}`,
                    )
                  }
                />
              )}
            </div>
          )}
          <div className="group/row flex min-w-0 items-center">
            <FeaturePicker ticket={ticket}>
              <RailRow
                data-property="feature"
                muted={!ticket.feature}
                icon={<IconStack2 size={16} aria-hidden className="text-muted-foreground" />}
              >
                {ticket.featureName || "No feature"}
              </RailRow>
            </FeaturePicker>
            {ticket.feature && (
              <GoTo
                label="Go to feature"
                onClick={() =>
                  go(
                    `/p/${ticket.project}/board?feature=${encodeURIComponent(ticket.feature ?? "")}`,
                  )
                }
              />
            )}
          </div>
          <DuePicker ticket={ticket}>
            <RailRow data-property="due" muted={!ticket.due} icon={<DueIcon due={ticket.due} />}>
              {ticket.due ? dueLabel(ticket.due) : "Set due date"}
            </RailRow>
          </DuePicker>
          <TypePicker ticket={ticket}>
            <RailRow
              data-property="type"
              icon={<IconTag size={16} aria-hidden className="text-muted-foreground" />}
            >
              {titleCase(ticket.type)}
            </RailRow>
          </TypePicker>
          {ticket.blocked !== null && (
            <div
              data-property="blocked"
              className="group flex min-w-0 items-start gap-2 rounded-md bg-muted/50 px-2 py-1.5"
            >
              <IconHandStop size={16} aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
              <span className="min-w-0 flex-1 break-words">
                <span className="font-medium">Blocked</span>
                {ticket.blocked ? ` · ${ticket.blocked}` : ""}
              </span>
              {open && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Not blocked"
                  title="Not blocked"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => void act("tickets.ticket-unblock", { ticket: id })}
                >
                  <IconX aria-hidden />
                </Button>
              )}
            </div>
          )}
          <h3 ref={labelsAt} className="m-0 mt-3 px-2 text-xs font-medium text-muted-foreground">
            Labels
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 px-2">
            {ticket.labels.map((l) => (
              <span
                key={l.id}
                className="pill flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
              >
                <LabelDot colour={l.colour} />
                {l.name}
              </span>
            ))}
            <LabelsPicker ticket={ticket} anchor={labelsAt}>
              <Button
                variant="ghost"
                aria-label="Change or add labels"
                className="size-6 rounded-full p-0 text-muted-foreground"
              >
                <IconPlus size={14} aria-hidden />
              </Button>
            </LabelsPicker>
          </div>
          <div className="mt-3 grid gap-1 border-t pt-3 text-xs text-muted-foreground">
            <TimeAgo at={ticket.updatedAt} prefix="Updated" />
            <TimeAgo at={ticket.createdAt} prefix="Created" />
          </div>
          {handTo !== null && (
            <HandoffDialog ticket={ticket} to={handTo} onClose={() => setHandTo(null)} />
          )}
        </aside>
      </TicketMenu>
    </div>
  );
}
