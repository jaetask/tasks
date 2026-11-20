// A ticket's page: what it is, where it is, its images, the questions on it
// and its conversation. The conversation is a toolkit list: a row for each
// comment and a row for each change.
import {
  Button,
  Card,
  ConfirmDelete,
  EditLink,
  EmptyCard,
  ListCard,
  ListRow,
  PageBody,
  Panel,
} from "@jaetask/toolkit";
import { useEffect, useRef, useState } from "react";
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
import { actorName, useApp, useRead } from "./app.js";
import { Composer, Fact, Initial, KindChip, LabelChip } from "./local.js";
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
  const { catalog, act } = useApp();
  const mine = (actors: string[]) => actors.includes(OWNER);
  const react = (emoji: string, on: boolean) =>
    void act(on ? "comments.reaction-remove" : "comments.reaction-add", {
      comment: comment.id,
      emoji,
    });
  return (
    <div className={replies ? "comment" : "comment reply"}>
      <div className="who">
        <Initial id={comment.author} name={comment.authorName} />
        <b>{comment.authorName}</b>
        {comment.author !== OWNER && <span className="agent">agent</span>}
        <span className="tk-muted small">
          {when(comment.at)}
          {comment.editedAt ? " · edited" : ""}
        </span>
      </div>
      <p className={comment.removed ? "text tk-muted" : "text"}>
        {comment.removed ? "This comment was removed." : comment.text}
      </p>
      {!comment.removed && (
        <div className="reactions">
          {comment.reactions.map((r) => (
            <Button
              key={r.emoji}
              surface="white"
              className="reaction"
              aria-pressed={mine(r.actors)}
              title={r.actors.map((a) => actorName(catalog, a)).join(", ")}
              onClick={() => react(r.emoji, mine(r.actors))}
            >
              {`${r.emoji} ${r.actors.length}`}
            </Button>
          ))}
          {REACTIONS.filter((e) => !comment.reactions.some((r) => r.emoji === e)).map((e) => (
            <Button
              surface="white"
              key={e}
              className="reaction add"
              aria-label={`React with ${e}`}
              onClick={() => react(e, false)}
            >
              {`+${e}`}
            </Button>
          ))}
          {onReply && (
            <Button
              surface="white"
              className="reaction"
              aria-pressed={replyTo === comment.id}
              onClick={() => onReply(replyTo === comment.id ? null : comment.id)}
            >
              {replyTo === comment.id ? "Replying…" : "Reply"}
            </Button>
          )}
          <Button
            surface="white"
            className="reaction"
            onClick={() => void act("comments.comment-remove", { comment: comment.id })}
          >
            Remove
          </Button>
        </div>
      )}
      {replies?.map((r) => (
        <CommentView key={r.id} comment={r} replyTo={replyTo} />
      ))}
    </div>
  );
}

function Thumb({ image }: { image: Image }) {
  const { act } = useApp();
  const [src, setSrc] = useState("");
  useEffect(() => {
    void call("images.image-read", { image: image.id }).then((outcome) => {
      const full = outcome.output as { type: string; data: string } | undefined;
      if (outcome.state === "succeeded" && full?.data) {
        setSrc(`data:${full.type};base64,${full.data}`);
      }
    });
  }, [image.id]);
  return (
    <div className="thumb">
      {src ? <img src={src} alt={image.name} /> : <span className="thumb-wait" />}
      <span className="tk-muted small">{image.name}</span>
      <Button surface="white" onClick={() => void act("images.image-remove", { image: image.id })}>
        Remove
      </Button>
    </div>
  );
}

export function TicketPage({ id }: { id: string }) {
  const { act, go } = useApp();
  const ticket = useRead<Ticket>("tickets.ticket-read", { ticket: id });
  const conversation = useRead<Conversation>("comments.conversation-read", { ticket: id });
  const images = useRead<Image[]>("images.image-list", { ticket: id });
  const requests = useRead<InputRequest[]>("input.input-list", { ticket: id, state: "awaiting" });
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
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
  const attach = () => {
    const picked = file.current?.files?.[0];
    if (!picked) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result).split(",")[1] ?? "";
      void act("images.image-add", { ticket: id, name: picked.name, type: picked.type, data });
      if (file.current) file.current.value = "";
    };
    reader.readAsDataURL(picked);
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
          {ticket.labels.length > 0 && (
            <div className="chips">
              {ticket.labels.map((l) => (
                <LabelChip key={l.id} label={l} />
              ))}
            </div>
          )}
          <p className={ticket.description ? "text" : "text tk-muted"}>
            {ticket.description || "No description."}
          </p>
          {ticket.featureName && <Fact label="Feature">{ticket.featureName}</Fact>}
        </Card>
      </Panel>

      <Panel
        id="place"
        title="Where it is"
        line="Its column, who it is assigned to, and whether it is blocked."
        {...(open ? { action: <EditLink to={`/t/${id}/place`} /> } : {})}
      >
        <Card className="facts">
          <Fact label="Column">
            {ticket.backlog ? (
              "In the backlog"
            ) : (
              <>
                {ticket.column.name} <KindChip kind={ticket.column.kind} />
              </>
            )}
          </Fact>
          <Fact label="Assigned to">{ticket.assigneeName || "Nobody"}</Fact>
          <Fact label="Blocked">
            {ticket.blocked ? <span className="blocked-note">{ticket.blocked}</span> : "No"}
          </Fact>
          {!open && <Fact label="State">{ticket.state}</Fact>}
        </Card>
        {!open && (
          <div className="buttons">
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
          </div>
        )}
      </Panel>

      {requests && requests.length > 0 && (
        <Panel id="questions" title="Questions for you" line="An agent is waiting for your answer.">
          <div className="stack">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        </Panel>
      )}

      <Panel id="images" title="Images" line="Screenshots and pictures, up to 2 MiB each.">
        {images && images.length > 0 && (
          <div className="thumbs">
            {images.map((i) => (
              <Thumb key={i.id} image={i} />
            ))}
          </div>
        )}
        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          aria-label="Add an image"
          onChange={attach}
        />
      </Panel>

      <Panel
        id="conversation"
        title="Conversation"
        line="Comments, and a line for each change to the ticket."
      >
        {(conversation?.entries ?? []).length > 0 && (
          <ListCard>
            {(conversation?.entries ?? []).map((entry) =>
              entry.type === "comment" ? (
                <ListRow key={entry.comment.id}>
                  <CommentView
                    comment={entry.comment}
                    replies={entry.comment.replies}
                    replyTo={replyTo}
                    onReply={setReplyTo}
                  />
                </ListRow>
              ) : (
                <ListRow
                  key={entry.change.id}
                  aside={
                    entry.change.undoable ? (
                      <Button
                        surface="white"
                        onClick={() => void act("history.change-undo", { change: entry.change.id })}
                      >
                        Undo
                      </Button>
                    ) : undefined
                  }
                >
                  <span className={entry.change.undoable ? "line" : "line undone"}>
                    {`${entry.change.actorName} ${entry.change.summary}`}
                  </span>
                </ListRow>
              ),
            )}
          </ListCard>
        )}
        <Composer
          placeholder={replying ? `Reply to ${replying.comment.authorName}` : "Write a comment"}
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
