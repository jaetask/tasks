// A project's Intake: its inbox items, and the steps that look at each new one.
import {
  Button,
  Card,
  Chip,
  EmptyCard,
  ListCard,
  ListRow,
  PageBody,
  PageLink,
  Panel,
  Tabs,
} from "@jaetask/toolkit";
import { useState } from "react";
import { type Item, type Project, type Run, type Step, when } from "./api.js";
import { actorName, useApp, useRead } from "./app.js";
import { Say } from "./local.js";
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
      surface="white"
      onClick={() => {
        const reason = window.prompt(`Why ${verb.toLowerCase()} it?`);
        if (reason?.trim()) void act(action, { item: item.id, reason: reason.trim() });
      }}
    >
      {verb}
    </Button>
  );
  return (
    <Card className="item">
      <div className="who">
        <b>{item.title}</b>
        <span className="tk-muted mono">{`${item.id} · from ${item.source} · ${when(item.at)}`}</span>
        {item.tags.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
        {item.category && <Chip>{item.category}</Chip>}
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
      <div className="buttons">
        {item.ticket && (
          <PageLink to={`/t/${item.ticket}`} surface="white">{`Open ${item.ticket}`}</PageLink>
        )}
        {live && item.state !== "accepted" && (
          <Button surface="white" onClick={() => void act("inbox.item-accept", { item: item.id })}>
            Accept
          </Button>
        )}
        {live && (
          <Button surface="white" onClick={() => void act("inbox.item-promote", { item: item.id })}>
            Add to the backlog
          </Button>
        )}
        {live && (
          <Button
            surface="white"
            onClick={() => void act("inbox.item-promote", { item: item.id, backlog: false })}
          >
            Put on the board
          </Button>
        )}
        {live && why("Reject", "inbox.item-reject")}
        {live && why("Dismiss", "inbox.item-dismiss")}
        {live && (
          <Button surface="white" onClick={() => void act("inbox.item-run", { item: item.id })}>
            Run the steps again
          </Button>
        )}
        <Button surface="white" aria-expanded={open} onClick={() => setOpen(!open)}>
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
  const { catalog, act } = useApp();
  const [state, setState] = useState<Item["state"]>("received");
  const items = useRead<Item[]>("inbox.inbox-read", { project: project.id, state });
  const steps = useRead<Step[]>("inbox.pipeline-read") ?? [];
  return (
    <PageBody
      title={projectTitle(project, "Intake")}
      line="New ideas and requests for this project, before they become tickets."
    >
      <Panel id="items" title="Inbox" line="Your steps look at each new item before it lands here.">
        <Say
          label="A new idea or request"
          button="Capture"
          onSubmit={(text) => act("inbox.item-capture", { project: project.id, text })}
        />
        <Tabs label="Which items" value={state} options={STATES} onChange={setState} />
        {items && items.length > 0 ? (
          <>
            {items.map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </>
        ) : (
          <EmptyCard text={`Nothing is ${state}.`} />
        )}
      </Panel>
      <Panel
        id="steps"
        title="Steps"
        line="Steps look at each new item, one after another. They are the same for every project; a step can be set to run on one project's items only."
        action={<PageLink to="/steps/new">Add a step</PageLink>}
      >
        {steps.length > 0 ? (
          <ListCard>
            {steps.map((s, i) => (
              <ListRow key={s.id} to={`/steps/${s.id}`} aside={<Chip>{s.on ? "on" : "off"}</Chip>}>
                <b>{`${i + 1}. ${s.name}`}</b>
                <span className="tk-muted">
                  {`${s.kind.replace("-", " ")} · as ${actorName(catalog, s.actor)} · may ${s.actions
                    .map((a) => a.replace("item-", ""))
                    .join(", ")} · runs on ${
                    s.condition
                      ? Object.entries(s.condition)
                          .map(([k, v]) => `${CONDITIONS[k]} ${v}`)
                          .join(", ")
                      : "every item"
                  }`}
                </span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <EmptyCard text="No steps yet. New items go straight to the inbox." />
        )}
      </Panel>
    </PageBody>
  );
}
