// A ticket's page: what it is, where it is, its images, the questions on it
// and its conversation, all from toolkit parts.
import {
  ActivityRow,
  Button,
  Card,
  Chip,
  Comment as CommentPart,
  ConfirmDelete,
  EditLink,
  EmptyCard,
  Facts,
  FileButton,
  PageBody,
  Panel,
  Reactions,
  Thread,
  Thumbs,
} from "@jaetask/toolkit";
import { useEffect, useState } from "react";
import {
  type Comment,
  type Conversation,
  call,
  type Image,
  type InputRequest,
  OWNER,
  type Reply,
  type Ticket,
  when,
} from "./api.js";
import { actorLabel, useApp, useRead } from "./app.js";
import { ActorAvatar, KindChip, LabelChip, Say } from "./local.js";
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
                    surface="white"
                    aria-pressed={replyTo === comment.id}
                    onClick={() => onReply(replyTo === comment.id ? null : comment.id)}
                  >
                    {replyTo === comment.id ? "Replying…" : "Reply"}
                  </Button>
                )}
                <Button
                  surface="white"
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

export function TicketPage({ id }: { id: string }) {
  const { catalog, act, go } = useApp();
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  const conversation = useRead<Conversation>("comments.conversation-read", { ticket: id });
  const images = useRead<Image[]>("images.image-list", { ticket: id });
  const requests = useRead<InputRequest[]>("input.input-list", { ticket: id, state: "awaiting" });
  const thumbs = useThumbs(images);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  if (!ticket) {
    return (
      <PageBody title={id} line="This ticket is not here.">
        <Panel id="gone" title="Ticket" line="It may have been deleted.">
          <EmptyCard text={`No ticket has the id ${id}.`} />
        </Panel>
      </PageBody>
    );
  }
  const open = ticket.state === "open";
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
  const replying = conversation?.entries.find(
    (e) => e.type === "comment" && e.comment.id === replyTo,
  ) as { comment: Comment } | undefined;
  return (
    <PageBody title={ticket.title} line={`${ticket.id} · ${ticket.project}`}>
      <Panel
        id="ticket"
        title="Ticket"
        line="What the work is."
        {...(open ? { action: <EditLink to={`/t/${id}/edit`} /> } : {})}
      >
        <Card>
          {ticket.labels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
          <p className={ticket.description ? "text" : "text tk-muted"}>
            {ticket.description || "No description."}
          </p>
        </Card>
      </Panel>

      <Panel
        id="place"
        title="Where it is"
        line="Its column, who it is assigned to, and whether it is blocked."
        {...(open ? { action: <EditLink to={`/t/${id}/place`} /> } : {})}
      >
        <Facts
          items={[
            {
              label: "Column",
              value: ticket.backlog ? (
                "In the backlog"
              ) : (
                <>
                  {ticket.column.name} <KindChip kind={ticket.column.kind} />
                </>
              ),
            },
            {
              label: "Assigned to",
              value: ticket.assignee ? actorLabel(catalog, ticket.assignee) : "Nobody",
            },
            {
              label: "Blocked",
              value: ticket.blocked ? <Chip colour="amber">{ticket.blocked}</Chip> : "No",
            },
            { label: "Feature", value: ticket.featureName || "None" },
            ...(ticket.location ? [{ label: "Location", value: ticket.locationName }] : []),
            ...(open ? [] : [{ label: "State", value: ticket.state }]),
          ]}
        />
        {!open && (
          <>
            <Button
              variant="primary"
              onClick={() => void act("tickets.ticket-restore", { ticket: id })}
            >
              Restore
            </Button>
            <ConfirmDelete
              name={ticket.id}
              what="This ticket, with its comments and images"
              label="Delete forever"
              onConfirm={() => {
                void act("tickets.ticket-delete", { ticket: id }).then(() => go("/archive"));
              }}
            />
          </>
        )}
      </Panel>

      {requests && requests.length > 0 && (
        <Panel id="questions" title="Questions for you" line="An agent is waiting for your answer.">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </Panel>
      )}

      <Panel
        id="images"
        title="Images"
        line="Screenshots and pictures, up to 2 MiB each."
        action={
          <FileButton
            label="Add an image"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onFiles={attach}
          />
        }
      >
        {thumbs.length > 0 ? (
          <Thumbs items={thumbs} onRemove={(image) => void act("images.image-remove", { image })} />
        ) : (
          <EmptyCard text="No images yet." />
        )}
      </Panel>

      <Panel
        id="conversation"
        title="Conversation"
        line="Comments, and a line for each change to the ticket."
      >
        <Thread label={`The conversation on ${ticket.id}`}>
          {(conversation?.entries ?? []).map((entry) =>
            entry.type === "comment" ? (
              <CommentView
                key={entry.comment.id}
                comment={entry.comment}
                replies={entry.comment.replies}
                replyTo={replyTo}
                onReply={setReplyTo}
              />
            ) : (
              <ActivityRow
                key={entry.change.id}
                time={when(entry.change.at)}
                {...(entry.change.undoable
                  ? {
                      action: (
                        <Button
                          surface="white"
                          onClick={() =>
                            void act("history.change-undo", { change: entry.change.id })
                          }
                        >
                          Undo
                        </Button>
                      ),
                    }
                  : {})}
              >
                {`${entry.change.actorName} ${entry.change.summary}${entry.change.undoable ? "" : " (undone)"}`}
              </ActivityRow>
            ),
          )}
        </Thread>
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
      </Panel>
    </PageBody>
  );
}
