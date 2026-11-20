// A ticket's activity: one stream in time order. Changes are quiet one-line
// rows; a comment is a card that holds its replies and a row to add one.
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
import { Button } from "@jaetask/toolkit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@jaetask/toolkit/ui/dropdown-menu";
import { Input } from "@jaetask/toolkit/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@jaetask/toolkit/ui/popover";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import {
  IconArrowUp,
  IconCircleCheck,
  IconCopy,
  IconDots,
  IconLink,
  IconMoodPlus,
  IconPaperclip,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { type ReactNode, useRef, useState } from "react";
import { type Comment, type Conversation, OWNER, type Reply, type Ticket, when } from "./api.js";
import { useApp } from "./app.js";

const USUAL = ["👍", "👀", "✅"];

/** How long ago, in the shortest form: now, 5m ago, 3h ago, 18d ago. */
export function ago(at: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / (60 * 24))}d ago`;
}

function Who({ id, name }: { id: string; name: string }) {
  const { catalog } = useApp();
  const icon = catalog.actors.find((a) => a.id === id)?.icon;
  return (
    <span
      aria-hidden
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
    >
      {icon || name.slice(0, 1) || "?"}
    </span>
  );
}

/** A paperclip that picks image files and attaches them to the ticket. */
function Attach({ ticket }: { ticket: string }) {
  const { act } = useApp();
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <Input
        ref={picker}
        type="file"
        aria-label="Attach an image"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          for (const picked of e.target.files ?? []) {
            const reader = new FileReader();
            reader.onload = () => {
              const data = String(reader.result).split(",")[1] ?? "";
              void act("images.image-add", { ticket, name: picked.name, type: picked.type, data });
            };
            reader.readAsDataURL(picked);
          }
          e.target.value = "";
        }}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Attach an image"
        onClick={() => picker.current?.click()}
      >
        <IconPaperclip aria-hidden />
      </Button>
    </>
  );
}

/** The reactions under a comment: a chip for each emoji with its count, then a button to add one. */
function ReactionRow({ comment, used }: { comment: Reply; used: string[] }) {
  const { act } = useApp();
  const [adding, setAdding] = useState(false);
  const toggle = (emoji: string) => {
    const mine = comment.reactions.find((r) => r.emoji === emoji)?.actors.includes(OWNER) ?? false;
    void act(mine ? "comments.reaction-remove" : "comments.reaction-add", {
      comment: comment.id,
      emoji,
    });
  };
  const offered = [...new Set([...used, ...USUAL])];
  return (
    <div className="reactions flex flex-wrap items-center gap-1.5">
      {comment.reactions.map((r) => (
        <Button
          key={r.emoji}
          variant="outline"
          aria-pressed={r.actors.includes(OWNER)}
          aria-label={`${r.emoji} ${r.actors.length}`}
          className={`reaction h-6 gap-1 rounded-full px-2 text-xs font-normal ${r.actors.includes(OWNER) ? "border-primary/40 bg-accent" : ""}`}
          onClick={() => toggle(r.emoji)}
        >
          <span>{r.emoji}</span>
          <span className="text-muted-foreground">{r.actors.length}</span>
        </Button>
      ))}
      <Popover open={adding} onOpenChange={setAdding}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            aria-label="Add a reaction"
            className={`size-6 rounded-full p-0 text-muted-foreground ${comment.reactions.length === 0 ? "opacity-0 focus-visible:opacity-100 group-hover/comment:opacity-100" : ""}`}
          >
            <IconMoodPlus size={16} aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-auto max-w-64 flex-wrap gap-1 p-2">
          {offered.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              aria-label={`React with ${emoji}`}
              className="size-8 p-0 text-base"
              onClick={() => {
                setAdding(false);
                toggle(emoji);
              }}
            >
              {emoji}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CommentBody({
  comment,
  root,
  replies,
  used,
  canWrite,
}: {
  comment: Reply;
  root?: Comment;
  replies?: Reply[];
  used: string[];
  canWrite: boolean;
}) {
  const { act, go, path } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const copy = (text: string) => void navigator.clipboard?.writeText(text);
  const link = `${window.location.origin}${window.location.pathname}#/t/${comment.ticket}?comment=${comment.id}`;
  const markdown = () =>
    [comment, ...(replies ?? [])]
      .filter((c) => !c.removed)
      .map((c) => `**${c.authorName}** (${when(c.at)})\n\n${c.text}`)
      .join("\n\n---\n\n");
  return (
    <div id={`comment-${comment.id}`} className="comment group/comment grid gap-2 px-4 py-3">
      <div className="flex items-center gap-2">
        <Who id={comment.author} name={comment.authorName} />
        <span className="font-medium">{comment.authorName}</span>
        <span className="text-xs text-muted-foreground" title={when(comment.at)}>
          {`${ago(comment.at)}${comment.editedAt ? " · edited" : ""}`}
        </span>
        {!comment.removed && (
          <span className="ml-auto flex opacity-0 focus-within:opacity-100 group-hover/comment:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Comment actions">
                  <IconDots aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canWrite && comment.author === OWNER && (
                  <DropdownMenuItem onSelect={() => setEditing(comment.text)}>
                    <IconPencil size={16} aria-hidden />
                    Edit
                  </DropdownMenuItem>
                )}
                {root && (
                  <DropdownMenuItem
                    onSelect={() =>
                      void act(
                        root.resolved ? "comments.thread-reopen" : "comments.thread-resolve",
                        {
                          comment: root.id,
                        },
                      )
                    }
                  >
                    <IconCircleCheck size={16} aria-hidden />
                    {root.resolved ? "Reopen thread" : "Resolve thread"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => copy(link)}>
                  <IconLink size={16} aria-hidden />
                  Copy link to comment
                </DropdownMenuItem>
                {root && (
                  <DropdownMenuItem onSelect={() => copy(markdown())}>
                    <IconCopy size={16} aria-hidden />
                    Copy thread as Markdown
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() =>
                    void act<Ticket>("comments.comment-ticket-create", {
                      comment: comment.id,
                    }).then((made) => made && go(`${path}?ticket=${made.id}`))
                  }
                >
                  <IconPlus size={16} aria-hidden />
                  New ticket from comment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setDeleting(true)}>
                  <IconTrash size={16} aria-hidden />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        )}
      </div>
      <div className="grid gap-2 pl-8">
        {editing !== null ? (
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = editing.trim();
              if (!text) return;
              void act("comments.comment-edit", { comment: comment.id, text }).then(
                (done) => done && setEditing(null),
              );
            }}
          >
            <Textarea
              aria-label="Edit comment"
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        ) : (
          <p className={`text ${comment.removed ? "text-muted-foreground" : ""}`}>
            {comment.removed ? "This comment was deleted." : comment.text}
          </p>
        )}
        {!comment.removed && <ReactionRow comment={comment} used={used} />}
      </div>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              Its replies stay. You can undo this from the ticket's activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void act("comments.comment-remove", { comment: comment.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** A box to write in, with the paperclip and the send arrow at its right. */
function Write({
  label,
  tall,
  ticket,
  lead,
  onSend,
}: {
  label: string;
  tall?: boolean;
  ticket: string;
  lead?: ReactNode;
  onSend: (text: string) => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const send = () => {
    const wanted = text.trim();
    if (!wanted) return;
    setText("");
    void onSend(wanted);
  };
  const tools = (
    <span className="flex items-center gap-1">
      <Attach ticket={ticket} />
      <Button
        type="submit"
        variant={text.trim() ? "default" : "ghost"}
        size="icon-sm"
        aria-label="Send"
        className="rounded-full"
      >
        <IconArrowUp aria-hidden />
      </Button>
    </span>
  );
  return (
    <form
      className={
        tall ? "grid gap-1 rounded-xl border bg-card p-3" : "flex items-center gap-2 px-4 py-2"
      }
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      {lead}
      {tall ? (
        <>
          <Textarea
            aria-label={label}
            placeholder={`${label}...`}
            className="min-h-16 resize-none border-0 p-1 shadow-none focus-visible:ring-0"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
          />
          <div className="flex justify-end">{tools}</div>
        </>
      ) : (
        <>
          <Input
            aria-label={label}
            placeholder={`${label}...`}
            className="h-8 flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {tools}
        </>
      )}
    </form>
  );
}

function ThreadCard({
  comment,
  used,
  canWrite,
}: {
  comment: Comment;
  used: string[];
  canWrite: boolean;
}) {
  const { act } = useApp();
  const [shown, setShown] = useState(false);
  if (comment.resolved && !shown) {
    return (
      <div className="thread flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-muted-foreground">
        <IconCircleCheck size={16} aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {`Resolved · ${comment.authorName}: ${comment.text.split("\n")[0]}`}
        </span>
        <span className="text-xs">
          {comment.replies.length === 1 ? "1 reply" : `${comment.replies.length} replies`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setShown(true)}>
          Show
        </Button>
      </div>
    );
  }
  return (
    <div className="thread divide-y rounded-xl border bg-card">
      <CommentBody
        comment={comment}
        root={comment}
        replies={comment.replies}
        used={used}
        canWrite={canWrite}
      />
      {comment.replies.map((r) => (
        <CommentBody key={r.id} comment={r} used={used} canWrite={canWrite} />
      ))}
      {canWrite && !comment.resolved && (
        <Write
          label="Leave a reply"
          ticket={comment.ticket}
          lead={<Who id={OWNER} name="" />}
          onSend={(text) =>
            act("comments.comment-add", { ticket: comment.ticket, text, reply_to: comment.id })
          }
        />
      )}
      {comment.resolved && (
        <div className="flex justify-end px-4 py-2">
          <Button variant="ghost" size="sm" onClick={() => setShown(false)}>
            Hide
          </Button>
        </div>
      )}
    </div>
  );
}

export function Activity({
  ticket,
  conversation,
  canWrite,
}: {
  ticket: string;
  conversation: Conversation | undefined;
  canWrite: boolean;
}) {
  const { act } = useApp();
  const entries = conversation?.entries ?? [];
  // The emoji already used on this ticket come first when adding a reaction.
  const used = [
    ...new Set(
      entries.flatMap((e) =>
        e.type === "comment"
          ? [e.comment, ...e.comment.replies].flatMap((c) => c.reactions.map((r) => r.emoji))
          : [],
      ),
    ),
  ];
  return (
    <section id="conversation" aria-label="Activity" className="grid gap-3">
      <h3 className="m-0 text-sm font-medium">Activity</h3>
      {entries.map((entry) =>
        entry.type === "comment" ? (
          <ThreadCard
            key={entry.comment.id}
            comment={entry.comment}
            used={used}
            canWrite={canWrite}
          />
        ) : (
          <div
            key={entry.change.id}
            className="activity group/event flex items-center gap-2 px-4 text-xs text-muted-foreground"
          >
            <Who id={entry.change.actor} name={entry.change.actorName} />
            <span className="min-w-0">
              {`${entry.change.actorName} ${entry.change.summary}${entry.change.undoable ? "" : " (undone)"} · `}
              <span title={when(entry.change.at)}>{ago(entry.change.at)}</span>
            </span>
            {entry.change.undoable && (
              <Button
                variant="ghost"
                size="xs"
                className="ml-auto opacity-0 focus-visible:opacity-100 group-hover/event:opacity-100"
                onClick={() => void act("history.change-undo", { change: entry.change.id })}
              >
                Undo
              </Button>
            )}
          </div>
        ),
      )}
      {canWrite && (
        <Write
          tall
          label="Leave a comment"
          ticket={ticket}
          onSend={(text) => act("comments.comment-add", { ticket, text })}
        />
      )}
    </section>
  );
}
