// A ticket's page: what it is, where it is, its images, the questions on it
// and its conversation, all from toolkit parts.
import {
  Comment as CommentPart,
  FileButton,
  PageBody,
  Reactions,
  Thread,
  Thumbs,
} from "@jaetask/toolkit/suite";
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
import { Label } from "@jaetask/toolkit/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@jaetask/toolkit/ui/popover";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronRight,
  IconLink,
  IconNote,
  IconX,
} from "@tabler/icons-react";
import { type ReactNode, useEffect, useState } from "react";
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
  type Reply,
  type Ticket,
  type TicketStep,
  TYPES,
  when,
} from "./api.js";
import { useApp, useRead } from "./app.js";
import { ActorAvatar, DeleteForGood, Nothing, Picker, Say, TabBar } from "./local.js";
import { RequestCard } from "./pages.js";

const REACTIONS = ["👍", "👀", "✅"];

function CommentView({
  comment,
  replies,
  replyTo,
  onReply,
}: {
  comment: Reply;
  replies?: Reply[];
  replyTo: string | null;
  onReply?: (id: string | null) => void;
}) {
  const { act } = useApp();
  const mine = (emoji: string) =>
    comment.reactions.find((r) => r.emoji === emoji)?.actors.includes(OWNER) ?? false;
  // Every reaction on the comment, then the usual ones nobody has used yet, at 0.
  const items = [
    ...comment.reactions.map((r) => ({
      emoji: r.emoji,
      count: r.actors.length,
      mine: r.actors.includes(OWNER),
    })),
    ...REACTIONS.filter((e) => !comment.reactions.some((r) => r.emoji === e)).map((emoji) => ({
      emoji,
      count: 0,
    })),
  ];
  return (
    <CommentPart
      author={comment.author === OWNER ? comment.authorName : `${comment.authorName} (agent)`}
      avatar={<ActorAvatar id={comment.author} name={comment.authorName} />}
      time={`${when(comment.at)}${comment.editedAt ? " · edited" : ""}`}
      {...(comment.removed
        ? {}
        : {
            reactions: (
              <Reactions
                items={items}
                onToggle={(emoji) =>
                  void act(mine(emoji) ? "comments.reaction-remove" : "comments.reaction-add", {
                    comment: comment.id,
                    emoji,
                  })
                }
              />
            ),
            actions: (
              <>
                {onReply && (
                  <Button
                    variant="secondary"
                    aria-pressed={replyTo === comment.id}
                    onClick={() => onReply(replyTo === comment.id ? null : comment.id)}
                  >
                    {replyTo === comment.id ? "Replying…" : "Reply"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => void act("comments.comment-remove", { comment: comment.id })}
                >
                  Remove
                </Button>
              </>
            ),
          })}
      {...(replies && replies.length > 0
        ? {
            replies: replies.map((r) => <CommentView key={r.id} comment={r} replyTo={replyTo} />),
          }
        : {})}
    >
      {comment.removed ? "This comment was removed." : comment.text}
    </CommentPart>
  );
}

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

const KIND_DOT: Record<Kind, string> = {
  todo: "bg-muted-foreground/50",
  doing: "bg-amber-500",
  waiting: "bg-violet-500",
  done: "bg-emerald-500",
};

/** A ticket's own page, for its address. From a board it opens in a dialog with the same view. */
export function TicketPage({ id }: { id: string }) {
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  return (
    <PageBody title={ticket?.title ?? id} line={ticket ? undefined : "This ticket is not here."}>
      <TicketView id={id} />
    </PageBody>
  );
}

/** One quiet row of the property rail: a name and its control. */
function Property({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
      <span className="text-xs text-muted-foreground">{name}</span>
      <div className="min-w-0">{children}</div>
    </div>
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
                  <p className="text m-0">{n.text}</p>
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
  const { catalog, act, go } = useApp();
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  const conversation = useRead<Conversation>("comments.conversation-read", { ticket: id });
  const images = useRead<Image[]>("images.image-list", { ticket: id });
  const requests = useRead<InputRequest[]>("input.input-list", { ticket: id, state: "awaiting" });
  const features = useRead<Feature[]>(ticket ? "tickets.feature-find" : null, {
    project: ticket?.project,
  });
  const thumbs = useThumbs(images);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [tab, setTab] = useState<"comments" | "activity">("comments");
  const [handoff, setHandoff] = useState("");
  const [link, setLink] = useState("");
  const [blocked, setBlocked] = useState<string | null>(null);
  if (!ticket) return <Nothing text={`No ticket has the id ${id}.`} />;
  const open = ticket.state === "open";
  const project = catalog.projects.find((p) => p.id === ticket.project);
  const attach = (files: File[]) => {
    for (const picked of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result).split(",")[1] ?? "";
        void act("images.image-add", { ticket: id, name: picked.name, type: picked.type, data });
      };
      reader.readAsDataURL(picked);
    }
  };
  const entries = conversation?.entries ?? [];
  const comments = entries.filter((e) => e.type === "comment");
  const changes = entries.length - comments.length;
  const replying = comments.find((e) => e.type === "comment" && e.comment.id === replyTo) as
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
          <p
            className={`text rounded-lg bg-muted/40 p-4 ${ticket.description ? "" : "text-muted-foreground"}`}
          >
            {ticket.description || "No description."}
          </p>
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
          {open && (
            <div>
              <FileButton
                label="Add an image"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onFiles={attach}
              />
            </div>
          )}
        </section>

        <section id="conversation" className="grid gap-3">
          <TabBar
            label="Conversation"
            value={tab}
            options={[
              { id: "comments", name: `Comments (${ticket.comments})` },
              { id: "activity", name: `Activity (${changes})` },
            ]}
            onChange={setTab}
          />
          {tab === "comments" ? (
            <>
              {comments.length > 0 ? (
                <Thread label={`The conversation on ${ticket.id}`}>
                  {comments.map((entry) =>
                    entry.type === "comment" ? (
                      <CommentView
                        key={entry.comment.id}
                        comment={entry.comment}
                        replies={entry.comment.replies}
                        replyTo={replyTo}
                        onReply={setReplyTo}
                      />
                    ) : null,
                  )}
                </Thread>
              ) : (
                <p className="m-0 py-3 text-muted-foreground">No comments yet.</p>
              )}
              <Say
                label={replying ? `Reply to ${replying.comment.authorName}` : "Write a comment"}
                button="Send"
                onSubmit={async (text) => {
                  const to = replyTo;
                  setReplyTo(null);
                  await act("comments.comment-add", {
                    ticket: id,
                    text,
                    ...(to ? { reply_to: to } : {}),
                  });
                }}
              />
            </>
          ) : (
            <div className="grid gap-3">
              {entries.map((entry) =>
                entry.type === "comment" ? null : (
                  <div
                    key={entry.change.id}
                    className="activity flex items-start justify-between gap-3 border-l-2 pl-3"
                  >
                    <div>
                      <p className="m-0">{`${entry.change.actorName} ${entry.change.summary}${entry.change.undoable ? "" : " (undone)"}`}</p>
                      <p className="m-0 text-xs text-muted-foreground">{when(entry.change.at)}</p>
                    </div>
                    {entry.change.undoable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void act("history.change-undo", { change: entry.change.id })}
                      >
                        Undo
                      </Button>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </section>

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

      <aside id="place" aria-label="Properties" className="grid content-start gap-2">
        <div className="mb-1 flex justify-end">
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
        <Property name="Status">
          {open && !ticket.backlog ? (
            <Picker
              label="Status"
              className={quiet}
              value={ticket.column.id}
              onChange={(column) => void act("tickets.ticket-move", { ticket: id, column })}
              options={(project?.columns ?? []).map((c) => ({ id: c.id, name: c.name }))}
            />
          ) : (
            <span className="flex items-center gap-2 px-2">
              <span
                className={`inline-block size-2 rounded-full ${KIND_DOT[ticket.column.kind]}`}
              />
              {open ? "Backlog" : ticket.state}
            </span>
          )}
        </Property>
        <Property name="Actor">
          <Picker
            label="Actor"
            className={quiet}
            value={ticket.assignee ?? ""}
            onChange={(actor) => {
              const note = handoff.trim();
              setHandoff("");
              void act("tickets.ticket-assign", {
                ticket: id,
                actor: actor || null,
                ...(note && actor ? { note } : {}),
              });
            }}
            options={[
              { id: "", name: "Unassigned" },
              ...catalog.actors
                .filter((a) => !a.archived || a.id === ticket.assignee)
                .map((a) => ({ id: a.id, name: `${a.icon} ${a.name}`.trim() })),
            ]}
          />
        </Property>
        {open && (
          <Property name="Handoff">
            <Input
              aria-label="Handoff note"
              placeholder="Note for the next actor"
              className={quiet}
              value={handoff}
              onChange={(e) => setHandoff(e.target.value)}
            />
          </Property>
        )}
        {(catalog.locations.length > 0 || ticket.location) && (
          <Property name="Location">
            <Picker
              label="Location"
              className={quiet}
              value={ticket.location ?? ""}
              onChange={(location) =>
                void act("tickets.ticket-location-set", { ticket: id, location: location || null })
              }
              options={[
                { id: "", name: "None" },
                ...catalog.locations
                  .filter((l) => !l.archived || l.id === ticket.location)
                  .map((l) => ({ id: l.id, name: l.name })),
              ]}
            />
          </Property>
        )}
        <Property name="Feature">
          <Picker
            label="Feature"
            className={quiet}
            value={ticket.feature ?? ""}
            onChange={(feature) =>
              void act("tickets.ticket-feature-set", { ticket: id, feature: feature || null })
            }
            options={[
              { id: "", name: "None" },
              ...(features ?? []).map((f) => ({ id: f.id, name: f.name })),
            ]}
          />
        </Property>
        <Property name="Labels">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={`${quiet} h-auto min-h-8 justify-start whitespace-normal text-left font-normal`}
              >
                {ticket.labels.length > 0 ? ticket.labels.map((l) => l.name).join(", ") : "None"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="grid w-56 gap-2">
              {catalog.labels.length > 0 ? (
                catalog.labels.map((l) => {
                  const on = ticket.labels.some((x) => x.id === l.id);
                  return (
                    <Label key={l.id} className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={on}
                        onCheckedChange={() =>
                          void act(
                            on ? "tickets.ticket-label-remove" : "tickets.ticket-label-add",
                            {
                              ticket: id,
                              label: l.id,
                            },
                          )
                        }
                      />
                      {l.name}
                    </Label>
                  );
                })
              ) : (
                <p className="m-0 text-muted-foreground">No labels yet.</p>
              )}
            </PopoverContent>
          </Popover>
        </Property>
        <Property name="Type">
          <Picker
            label="Type"
            className={quiet}
            value={ticket.type}
            onChange={(type) => void act("tickets.ticket-type-set", { ticket: id, type })}
            options={TYPES.map((t) => ({ id: t, name: titleCase(t) }))}
          />
        </Property>
        <Property name="Priority">
          <Picker
            label="Priority"
            className={quiet}
            value={ticket.priority}
            onChange={(priority) =>
              void act("tickets.ticket-priority-set", { ticket: id, priority })
            }
            options={PRIORITIES.map((p) => ({ id: p, name: titleCase(p) }))}
          />
        </Property>
        <Property name="Blocked">
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
              placeholder="No"
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
        </Property>
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
