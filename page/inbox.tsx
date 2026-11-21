import { EmptyLine, Link, ListCard, TimeAgo, WorkPage } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@jaetask/toolkit/ui/dialog";
import { Input } from "@jaetask/toolkit/ui/input";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import { IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { type Item, type Project, type Run, type Step, when } from "./api.js";
import { useApp, useRead } from "./app.js";
import { Pill, TabBar } from "./local.js";
import { Display, Lane, Lanes, titleIcon, useFilters } from "./board.js";
import { projectTitle } from "./pages.js";

export const CONDITIONS: Record<string, string> = {
  "": "every item",
  project: "items for the project",
  tag: "items tagged",
  category: "items in the category",
  source: "items from",
  word: "items with the word",
};

function Runs({ item }: { item: string }) {
  const found = useRead<{ runs: Run[] }>("inbox.item-read", { item });
  return (
    <div className="runs">
      {(found?.runs ?? []).map((run) => (
        <div key={run.id}>
          <p className="tk-muted">{`${when(run.at)} · ${run.ended}`}</p>
          <ul>
            {run.steps.map((s, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a run's steps never reorder
              <li key={i}>
                <b>{s.name}</b> {s.ran ? "" : "did not run. "}
                {s.reason}
                {s.calls.length > 0 && (
                  <ul>
                    {s.calls.map((c, k) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a step's calls never reorder
                      <li key={k} className="mono">
                        {`${c.action} ${JSON.stringify(c.input)} → ${c.outcome}`}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const STATES: { id: Item["state"]; name: string }[] = [
  { id: "received", name: "Received" },
  { id: "accepted", name: "Accepted" },
  { id: "promoted", name: "Promoted" },
  { id: "linked", name: "Linked" },
  { id: "rejected", name: "Rejected" },
  { id: "dismissed", name: "Dismissed" },
];

function ItemDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const { act, go } = useApp();
  const [reason, setReason] = useState("");
  const [tag, setTag] = useState("");
  const [runs, setRuns] = useState(false);
  const why = useRef<HTMLInputElement>(null);
  const live = item.state === "received" || item.state === "accepted";
  const then = (done: unknown) => {
    if (done) onClose();
  };
  const refuse = (action: string) => {
    if (!reason.trim()) {
      why.current?.focus();
      return;
    }
    void act(action, { item: item.id, reason: reason.trim() }).then(then);
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-[min(44rem,95vw)] max-w-none content-start overflow-y-auto">
        <DialogTitle className="sr-only">{item.title}</DialogTitle>
        <DialogDescription className="sr-only">An intake item.</DialogDescription>
        <div className="grid min-w-0 gap-4 text-sm">
          <p className="m-0 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{item.id}</span>
            <span>{`from ${item.source}`}</span>
            <TimeAgo at={item.at} />
            <Pill>{item.state}</Pill>
            {item.ticket && (
              <Link href={`/t/${item.ticket}`} className="underline">{`Open ${item.ticket}`}</Link>
            )}
          </p>
          <Input
            key={`title ${item.title}`}
            aria-label="Item title"
            disabled={!live}
            className="-mx-3 h-auto w-[calc(100%+1.5rem)] border-transparent px-3 py-1.5 text-lg font-semibold shadow-none hover:border-input disabled:opacity-100 md:text-lg"
            defaultValue={item.title}
            maxLength={200}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            onBlur={(e) => {
              const wanted = e.currentTarget.value.trim();
              if (wanted && wanted !== item.title) {
                void act("inbox.item-edit", { item: item.id, title: wanted });
              }
            }}
          />
          <Textarea
            key={`text ${item.text}`}
            aria-label="Item text"
            disabled={!live}
            className="min-h-28 disabled:opacity-100"
            defaultValue={item.text}
            onBlur={(e) => {
              const wanted = e.currentTarget.value.trim();
              if (wanted && wanted !== item.text) {
                void act("inbox.item-edit", { item: item.id, text: wanted });
              }
            }}
          />
          {(item.original.title !== item.title || item.original.text !== item.text) && (
            <p className="m-0 text-xs text-muted-foreground">{`As captured: ${item.original.text}`}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {item.tags.map((t) => (
              <span
                key={t}
                className="pill flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2 text-xs"
              >
                {t}
                {live && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-4 text-muted-foreground"
                    aria-label={`Remove the tag ${t}`}
                    onClick={() => void act("inbox.item-untag", { item: item.id, tags: [t] })}
                  >
                    <IconX aria-hidden />
                  </Button>
                )}
              </span>
            ))}
            {item.category && <Pill>{item.category}</Pill>}
            {live && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const wanted = tag.trim();
                  if (!wanted) return;
                  setTag("");
                  void act("inbox.item-tag", { item: item.id, tags: [wanted] });
                }}
              >
                <Input
                  aria-label="Add a tag"
                  placeholder="Add a tag"
                  className="h-7 w-32 border-transparent text-xs shadow-none hover:border-input"
                  value={tag}
                  maxLength={40}
                  onChange={(e) => setTag(e.target.value)}
                />
              </form>
            )}
          </div>
          {Object.keys(item.fields).length > 0 && (
            <p className="m-0 text-xs text-muted-foreground">
              {Object.entries(item.fields)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            </p>
          )}
          {item.reason && <p className="m-0 text-muted-foreground">{`Reason: ${item.reason}`}</p>}
          {live && (
            <div className="grid gap-2 border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void act("inbox.item-promote", { item: item.id }).then(then)}
                >
                  Turn into a ticket
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void act<{ ticket: string | null }>("inbox.item-promote", {
                      item: item.id,
                      backlog: false,
                    }).then(then)
                  }
                >
                  Put on the board
                </Button>
                {item.state !== "accepted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void act("inbox.item-accept", { item: item.id }).then(then)}
                  >
                    Accept
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void act("inbox.item-run", { item: item.id })}
                >
                  Run the steps again
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  ref={why}
                  aria-label="Why it is rejected or dismissed"
                  placeholder="Why, to reject or dismiss it"
                  className="h-8 max-w-72"
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button size="sm" variant="outline" onClick={() => refuse("inbox.item-reject")}>
                  Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => refuse("inbox.item-dismiss")}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent"
              aria-expanded={runs}
              onClick={() => setRuns(!runs)}
            >
              What the steps did
            </Button>
            {runs && <Runs item={item.id} />}
          </div>
          {item.ticket && (
            <div>
              <Button size="sm" variant="outline" onClick={() => go(`/t/${item.ticket}`)}>
                {`Open ${item.ticket}`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IntakePage({ project }: { project: Project }) {
  const { act } = useApp();
  const [state, setState] = useState<Item["state"]>("received");
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [display, setDisplay] = useFilters(`tasks.intake.${project.id}`);
  const layout = display.layout || "list";
  const all = useRead<Item[]>("inbox.inbox-read", { project: project.id });
  const steps = useRead<Step[]>("inbox.pipeline-read") ?? [];
  const items = (all ?? []).filter((i) => i.state === state);
  const shown = (all ?? []).find((i) => i.id === open);
  const tabs = STATES.map((s) => ({
    ...s,
    count: (all ?? []).filter((i) => i.state === s.id).length,
  })).filter((s) => s.count > 0 || s.id === state);
  return (
    <WorkPage
      icon={titleIcon(project)}
      title={projectTitle(project, "Intake")}
      help="New ideas and requests for this project, before they become tickets. Your intake steps look at each new item before it lands here."
      action={<Display layout={layout} onLayout={(l) => setDisplay({ layout: l })} />}
    >
      <form
        className="flex items-center gap-2 rounded-xl border bg-card py-1.5 pr-2 pl-4"
        onSubmit={(e) => {
          e.preventDefault();
          const wanted = text.trim();
          if (!wanted) return;
          setText("");
          void act("inbox.item-capture", { project: project.id, text: wanted });
        }}
      >
        <Input
          aria-label="A new idea or request"
          placeholder="A new idea or request..."
          className="border-0 px-0 shadow-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" size="sm" variant="ghost" disabled={!text.trim()}>
          Capture
        </Button>
      </form>
      {layout === "board" ? (
        <Lanes label={`The intake of ${project.name}, by state`}>
          {STATES.map((tab) => {
            const inside = (all ?? []).filter((i) => i.state === tab.id);
            return (
              <Lane
                key={tab.id}
                id={`state-${tab.id}`}
                title={tab.name}
                count={inside.length}
                empty="Nothing here"
              >
                {inside.map((i) => (
                  <Button
                    key={i.id}
                    variant="ghost"
                    className="item h-auto w-full flex-col items-start gap-2 whitespace-normal rounded-xl border bg-card p-3 text-left font-normal shadow-sm hover:bg-card hover:shadow-md"
                    onClick={() => setOpen(i.id)}
                  >
                    <span className="font-medium">{i.title}</span>
                    {(i.tags.length > 0 || i.category) && (
                      <span className="flex flex-wrap gap-1">
                        {i.tags.map((t) => (
                          <Pill key={t}>{t}</Pill>
                        ))}
                        {i.category && <Pill>{i.category}</Pill>}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {`${i.ticket ? `${i.ticket} · ` : ""}${i.source} · `}
                      <TimeAgo at={i.at} />
                    </span>
                  </Button>
                ))}
              </Lane>
            );
          })}
        </Lanes>
      ) : (
        <>
          <TabBar
            label="Which items"
            value={state}
            options={tabs.map((s) => ({ id: s.id, name: `${s.name} ${s.count}` }))}
            onChange={setState}
          />
          {items.length > 0 ? (
            <ListCard>
              {items.map((i) => (
                <li key={i.id} className="item tk-list-row p-0!">
                  <Button
                    variant="ghost"
                    className="h-auto w-full min-w-0 justify-start gap-3 rounded-none px-5 py-2.5 text-left font-normal"
                    onClick={() => setOpen(i.id)}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{i.title}</span>
                    {i.tags.map((t) => (
                      <Pill key={t}>{t}</Pill>
                    ))}
                    {i.category && <Pill>{i.category}</Pill>}
                    {i.ticket && <span className="text-xs text-muted-foreground">{i.ticket}</span>}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {`${i.source} · `}
                      <TimeAgo at={i.at} />
                    </span>
                  </Button>
                </li>
              ))}
            </ListCard>
          ) : (
            <EmptyLine>{all ? `Nothing is ${state}.` : ""}</EmptyLine>
          )}
        </>
      )}
      <p className="m-0 text-xs text-muted-foreground">
        {steps.length === 0
          ? "No steps look at new items: they go straight to the inbox. "
          : `${steps.length} ${steps.length === 1 ? "step looks" : "steps look"} at each new item before it lands here. `}
        <Link href="/settings/steps" className="underline">
          Intake steps
        </Link>
      </p>
      {shown && <ItemDialog key={shown.id} item={shown} onClose={() => setOpen(null)} />}
    </WorkPage>
  );
}
