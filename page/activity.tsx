// A ticket's activity: one stream in time order. Changes are quiet one-line
// rows; a comment is a card that holds its replies and a row to add one.

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
  const actor = catalog.actors.find((a) => a.id === id);
  const icon = actor?.icon;
  const shown = name || actor?.name || "";
  return (
    <span
      aria-hidden
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
    >
      {icon || shown.slice(0, 1) || "?"}
    </span>
  );
}

/** A paperclip that picks image files and attaches them to the ticket. */
const IMAGES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
/** Small images are kept with the ticket's images and shown as thumbnails. */
const SMALL_IMAGE = 2 * 1024 * 1024;

/** Attaches files to a ticket: small images as its images, anything else as its files. */
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

/** Stores a picture put into a ticket's text as one of its files, and says where it is read. */
export function usePictures(ticket: string) {
  const { upload } = useApp();
  // The same function from one render to the next: the editor is built again when it changes.
  return useCallback(
    async (file: File) => {
      const stored = await upload(ticket, file);
      if (!stored) throw new Error("The picture could not be stored.");
      return { src: `/api/files/${stored.id}`, alt: file.name };
    },
    [ticket, upload],
  );
}

/** The paperclip of a ticket: whatever is chosen is attached to it. */
export function Attach({ ticket, shortcut }: { ticket: string; shortcut?: boolean }) {
  const attach = useAttach(ticket);
  return <AttachButton onFiles={attach} {...(shortcut ? { shortcut } : {})} />;
}

/** The reactions under a comment or a description: a pill for each emoji, then the add button. */
export function ReactionRow({
  reactions,
  onToggle,
}: {
  reactions: { emoji: string; actors: string[] }[];
  /** Adds the owner's reaction when `active`, takes it back when not. */
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
  /** True for a reply that another reply follows. */
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
      // Between two replies the line starts under the words, not at the card's edge.
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
      {/* A comment's text starts under its avatar; a reply's lines up with its name. */}
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
  // The editor starts again, empty, after each send.
  const [sent, setSent] = useState(0);
  const attach = useAttach(ticket);
  // A file pasted or dropped into the box is attached to the ticket; text is the editor's.
  // A picture goes into the text where it was put, which is the editor's own work.
  const pictures = usePictures(ticket);
  const take = (e: { preventDefault(): void }, files: FileList | undefined) => {
    const others = [...(files ?? [])].filter((f) => !f.type.startsWith("image/"));
    if (others.length === 0) return;
    e.preventDefault();
    attach(others);
  };
  const send = () => {
    const wanted = text.trim();
    if (!wanted) return;
    setText("");
    setSent(sent + 1);
    void onSend(wanted);
  };
  return (
    <form
      className={
        tall
          ? // Room on the left for the editor's handle, which sits beside the line being written.
            "write grid gap-1 rounded-xl border bg-card py-3 pr-3 pl-9"
          : // A reply is one short line beside an avatar: no handle there.
            "write flex items-start gap-2 px-4 py-2 [&_.drag-handle]:hidden"
      }
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      // Return sends; Shift+Return starts a new line. Caught before the editor, which would
      // otherwise start a paragraph. Left alone while the editor's own menu is choosing a block,
      // and while a word is still being composed on an input-method keyboard.
      onKeyDownCapture={(e) => {
        if (e.key !== "Enter" || e.shiftKey || e.altKey || e.nativeEvent.isComposing) return;
        if (document.querySelector(".an-rich-md-slash-menu")) return;
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
