// A project's Intake: its inbox items, and the steps that look at each new one.
import { Link, PageLink, Panel, WorkPage } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Card } from "@jaetask/toolkit/ui/card";
import { useState } from "react";
import { type Item, type Project, type Run, type Step, when } from "./api.js";
import { useApp, useRead } from "./app.js";
import { Nothing, Pill, Say, TabBar } from "./local.js";
import { titleIcon } from "./board.js";
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

function ItemCard({ item }: { item: Item }) {
  const { act } = useApp();
  const [open, setOpen] = useState(false);
  const live = item.state === "received" || item.state === "accepted";
  const why = (verb: string, action: string) => (
    <Button
      variant="secondary"
      onClick={() => {
        const reason = window.prompt(`Why ${verb.toLowerCase()} it?`);
        if (reason?.trim()) void act(action, { item: item.id, reason: reason.trim() });
      }}
    >
      {verb}
    </Button>
  );
  return (
    <Card className="item grid gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <b>{item.title}</b>
        <span className="tk-muted mono">{`${item.id} · from ${item.source} · ${when(item.at)}`}</span>
        {item.tags.map((t) => (
          <Pill key={t}>{t}</Pill>
        ))}
        {item.category && <Pill>{item.category}</Pill>}
      </div>
      {item.text !== item.title && <p className="text">{item.text}</p>}
      {(item.original.title !== item.title || item.original.text !== item.text) && (
        <p className="tk-muted">{`As captured: ${item.original.text}`}</p>
      )}
      {Object.keys(item.fields).length > 0 && (
        <p className="tk-muted mono">
          {Object.entries(item.fields)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")}
        </p>
      )}
      {item.reason && <p className="tk-muted">{`Reason: ${item.reason}`}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {item.ticket && (
          <PageLink to={`/t/${item.ticket}`} surface="white">{`Open ${item.ticket}`}</PageLink>
        )}
        {live && item.state !== "accepted" && (
          <Button
            variant="secondary"
            onClick={() => void act("inbox.item-accept", { item: item.id })}
          >
            Accept
          </Button>
        )}
        {live && (
          <Button
            variant="secondary"
            onClick={() => void act("inbox.item-promote", { item: item.id })}
          >
            Add to the backlog
          </Button>
        )}
        {live && (
          <Button
            variant="secondary"
            onClick={() => void act("inbox.item-promote", { item: item.id, backlog: false })}
          >
            Put on the board
          </Button>
        )}
        {live && why("Reject", "inbox.item-reject")}
        {live && why("Dismiss", "inbox.item-dismiss")}
        {live && (
          <Button variant="secondary" onClick={() => void act("inbox.item-run", { item: item.id })}>
            Run the steps again
          </Button>
        )}
        <Button variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
          What the steps did
        </Button>
      </div>
      {open && <Runs item={item.id} />}
    </Card>
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

export function IntakePage({ project }: { project: Project }) {
  const { act } = useApp();
  const [state, setState] = useState<Item["state"]>("received");
  const items = useRead<Item[]>("inbox.inbox-read", { project: project.id, state });
  const steps = useRead<Step[]>("inbox.pipeline-read") ?? [];
  return (
    <WorkPage
      icon={titleIcon(project)}
      title={projectTitle(project, "Intake")}
      help="New ideas and requests for this project, before they become tickets."
    >
      <Panel id="items" title="Inbox" line="Your steps look at each new item before it lands here.">
        <Say
          label="A new idea or request"
          button="Capture"
          onSubmit={(text) => act("inbox.item-capture", { project: project.id, text })}
        />
        <TabBar label="Which items" value={state} options={STATES} onChange={setState} />
        {items && items.length > 0 ? (
          items.map((i) => <ItemCard key={i.id} item={i} />)
        ) : (
          <Nothing text={`Nothing is ${state}.`} />
        )}
      </Panel>
      <p className="m-0 text-xs text-muted-foreground">
        {steps.length === 0
          ? "No steps look at new items: they go straight to the inbox. "
          : `${steps.length} ${steps.length === 1 ? "step looks" : "steps look"} at each new item before it lands here. `}
        <Link href="/settings/steps" className="underline">
          Intake steps
        </Link>
      </p>
    </WorkPage>
  );
}
