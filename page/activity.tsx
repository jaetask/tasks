import {
  AddReactionButton,
  AttachButton,
  CommentReactionChips,
  MarkdownText,
} from "@jaetask/toolkit/suite";
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
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import {
  IconArrowUp,
  IconCircleCheck,
  IconCopy,
  IconDots,
  IconLink,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { type ReactNode, useCallback, useState } from "react";
import { type Comment, type Conversation, OWNER, type Reply, type Ticket, when } from "./api.js";
import { useApp } from "./app.js";
import { Editor } from "./editor.js";
import { ActorAvatar } from "./local.js";

export function ago(at: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / (60 * 24))}d ago`;
}

export function inTicket(summary: string, ticket: string): string {
  const id = ticket.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return summary
    .replace(new RegExp(`^created ${id} in ([^:]+): [\\s\\S]*$`), "created this ticket in $1")
    .replace(new RegExp(`\\b${id}\\b`, "g"), "this ticket");
}

function Who({ id, name }: { id: string; name: string }) {
  return <ActorAvatar id={id} name={name} />;
}

const IMAGES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const SMALL_IMAGE = 2 * 1024 * 1024;

function useAttach(ticket: string) {
  const { act, upload } = useApp();
  return (files: Iterable<File> | null | undefined) => {
    for (const picked of files ?? []) {
      if (!IMAGES.includes(picked.type) || picked.size > SMALL_IMAGE) {
        void upload(ticket, picked);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result).split(",")[1] ?? "";
        void act("images.image-add", {
          ticket,
          name: picked.name || "pasted image",
          type: picked.type,
          data,
        });
      };
      reader.readAsDataURL(picked);
    }
  };
}

export function usePictures(ticket: string) {
  const { upload } = useApp();
  return useCallback(
    async (file: File) => {
      const stored = await upload(ticket, file);
      if (!stored) throw new Error("The picture could not be stored.");
      return { src: `/api/files/${stored.id}`, alt: file.name };
    },
    [ticket, upload],
  );
}

export function Attach({ ticket, shortcut }: { ticket: string; shortcut?: boolean }) {
  const attach = useAttach(ticket);
  return <AttachButton onFiles={attach} {...(shortcut ? { shortcut } : {})} />;
}

export function ReactionRow({
  reactions,
  onToggle,
}: {
  reactions: { emoji: string; actors: string[] }[];
  onToggle: (emoji: string, active: boolean) => void;
}) {
  const mine = (emoji: string) =>
    reactions.find((r) => r.emoji === emoji)?.actors.includes(OWNER) ?? false;
  return (
    <div className="reactions flex flex-wrap items-center gap-1.5">
      <CommentReactionChips
        canReact
        reactions={reactions.map((r) => ({
          reaction: r.emoji,
          count: r.actors.length,
          reactedByMe: r.actors.includes(OWNER),
        }))}
        onToggle={onToggle}
      />
      <AddReactionButton onSelect={(emoji) => onToggle(emoji, !mine(emoji))} />
    </div>
  );
}

function CommentBody({
  comment,
  root,
  replies,
  canWrite,
  joined,
}: {
  comment: Reply;
  root?: Comment;
  replies?: Reply[];
  canWrite: boolean;
  joined?: boolean;
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
    <div
      id={`comment-${comment.id}`}
      className={`comment group/comment grid gap-2 px-4 py-3 ${joined ? "relative border-b-0 after:absolute after:right-0 after:bottom-0 after:left-12 after:border-b" : ""}`}
    >
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
      <div className={`grid gap-2 ${root ? "" : "pl-8"}`}>
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
          <div
            className={`body min-w-0 break-words ${comment.removed ? "text-muted-foreground" : ""}`}
          >
            {comment.removed ? (
              "This comment was deleted."
            ) : (
              <MarkdownText content={comment.text} />
            )}
          </div>
        )}
        {!comment.removed && (
          <ReactionRow
            reactions={comment.reactions}
            onToggle={(emoji, active) =>
              void act(active ? "comments.reaction-add" : "comments.reaction-remove", {
                comment: comment.id,
                emoji,
              })
            }
          />
        )}
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
  const [sent, setSent] = useState(0);
  const attach = useAttach(ticket);
  const pictures = usePictures(ticket);
  const take = (e: { preventDefault(): void }, files: FileList | undefined) => {
    const others = [...(files ?? [])].filter((f) => !f.type.startsWith("image/"));
    if (others.length === 0) return;
    e.preventDefault();
    attach(others);
  };
  const send = () => {
    const wanted = text.trim();
    if (!wanted.replace(/[#>*_`~\-\s]/g, "")) return;
    setText("");
    setSent(sent + 1);
    void onSend(wanted);
  };
  return (
    <form
      className={
        tall
          ? "write grid gap-1 rounded-xl border bg-card py-3 pr-3 pl-9"
          : "write flex items-start gap-2 px-4 py-2 [&_.drag-handle]:hidden!"
      }
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      onKeyDownCapture={(e) => {
        if (e.key !== "Enter" || e.shiftKey || e.altKey || e.nativeEvent.isComposing) return;
        if (e.defaultPrevented || document.querySelector(".an-rich-md-slash-menu")) return;
        if (/^\/\S*$/.test(text.trim())) return;
        e.preventDefault();
        e.stopPropagation();
        send();
      }}
      onPasteCapture={(e) => take(e, e.clipboardData.files)}
      onDropCapture={(e) => take(e, e.dataTransfer.files)}
    >
      {lead}
      <div className={`min-w-0 flex-1 ${tall ? "min-h-16" : "pt-0.5"}`}>
        <Editor
          key={sent}
          label={label}
          placeholder={`${label}...`}
          value={text}
          onChange={setText}
          className="text-sm outline-none"
          onImageUpload={pictures}
        />
      </div>
      <span className={`flex items-center gap-1 ${tall ? "justify-end" : ""}`}>
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
    </form>
  );
}

function ThreadCard({ comment, canWrite }: { comment: Comment; canWrite: boolean }) {
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
      <CommentBody comment={comment} root={comment} replies={comment.replies} canWrite={canWrite} />
      {comment.replies.map((r, i) => (
        <CommentBody
          key={r.id}
          comment={r}
          canWrite={canWrite}
          joined={i < comment.replies.length - 1}
        />
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
  return (
    <section id="conversation" aria-label="Activity" className="grid gap-3">
      <h3 className="m-0 text-sm font-medium">Activity</h3>
      {entries.map((entry) =>
        entry.type === "comment" ? (
          <ThreadCard key={entry.comment.id} comment={entry.comment} canWrite={canWrite} />
        ) : (
          <div
            key={entry.change.id}
            className="activity group/event flex items-center gap-2 px-4 text-xs text-muted-foreground"
          >
            <Who id={entry.change.actor} name={entry.change.actorName} />
            <span className="min-w-0">
              {`${entry.change.actorName} ${inTicket(entry.change.summary, ticket)}${entry.change.undone ? " (undone)" : ""} · `}
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
