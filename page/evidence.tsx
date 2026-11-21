// A ticket's evidence: what was done and how it was checked, written by whoever did the work.
// Tasks checks none of it, and none is needed to move a ticket.
import { Button } from "@jaetask/toolkit/ui/button";
import { PageSection } from "@jaetask/toolkit/suite";
import { Input } from "@jaetask/toolkit/ui/input";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import { useState } from "react";
import type { Ticket } from "./api.js";
import { useApp } from "./app.js";
import { Picker } from "./local.js";

const KINDS = [
  { id: "code", name: "Code change" },
  { id: "non-code", name: "Non-code result" },
];

export function EvidenceSection({ ticket, open }: { ticket: Ticket; open: boolean }) {
  const { act } = useApp();
  const had = ticket.evidence;
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<string>(had?.kind ?? "code");
  const [summary, setSummary] = useState(had?.summary ?? "");
  const [checks, setChecks] = useState(had?.checks ?? "");
  const [pullRequest, setPullRequest] = useState(had?.pullRequest ?? "");
  const [mergeCommit, setMergeCommit] = useState(had?.mergeCommit ?? "");
  if (!had && !open) return null;
  const save = async () => {
    const done = await act("tickets.ticket-evidence-set", {
      ticket: ticket.id,
      evidence: {
        kind,
        summary,
        checks,
        ...(kind === "code" && pullRequest.trim() ? { pullRequest } : {}),
        ...(kind === "code" && mergeCommit.trim() ? { mergeCommit } : {}),
      },
    });
    if (done) setEditing(false);
  };
  const label = "text-xs font-medium text-muted-foreground";
  return (
    <PageSection
      id="evidence"
      title="Evidence"
      count={had ? (had.kind === "code" ? "code change" : "non-code result") : ""}
      defaultOpen={false}
    >
      <div className="grid gap-3 pl-5 text-sm">
        {had && !editing ? (
          <>
            <div className="grid gap-1">
              <span className={label}>Result</span>
              <p className="m-0 whitespace-pre-wrap">{had.summary}</p>
            </div>
            <div className="grid gap-1">
              <span className={label}>Verification</span>
              <p className="m-0 whitespace-pre-wrap">{had.checks}</p>
            </div>
            {had.pullRequest && (
              <div className="grid gap-1">
                <span className={label}>Pull request</span>
                {/^https?:\/\//.test(had.pullRequest) ? (
                  <a
                    href={had.pullRequest}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline underline-offset-2"
                  >
                    {had.pullRequest}
                  </a>
                ) : (
                  <span className="break-all">{had.pullRequest}</span>
                )}
              </div>
            )}
            {had.mergeCommit && (
              <div className="grid gap-1">
                <span className={label}>Merge commit</span>
                <code className="break-all text-xs">{had.mergeCommit}</code>
              </div>
            )}
            <p className="m-0 text-xs text-muted-foreground">
              Recorded by its author. Tasks does not check it.
            </p>
            {open && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // The form starts from what is recorded now, which an agent may have changed.
                    setKind(had.kind);
                    setSummary(had.summary);
                    setChecks(had.checks);
                    setPullRequest(had.pullRequest ?? "");
                    setMergeCommit(had.mergeCommit ?? "");
                    setEditing(true);
                  }}
                >
                  Edit evidence
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void act("tickets.ticket-evidence-set", { ticket: ticket.id, evidence: null })
                  }
                >
                  Remove
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <Picker label="Work kind" value={kind} options={KINDS} onChange={setKind} />
            <Textarea
              aria-label="Result"
              placeholder="Result: what was done"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <Textarea
              aria-label="Verification"
              placeholder="Verification: what was checked, and what passed?"
              value={checks}
              onChange={(e) => setChecks(e.target.value)}
            />
            {kind === "code" && (
              <>
                <Input
                  aria-label="Pull request"
                  placeholder="Pull request address"
                  value={pullRequest}
                  onChange={(e) => setPullRequest(e.target.value)}
                />
                <Input
                  aria-label="Merge commit"
                  placeholder="Merge commit (optional)"
                  value={mergeCommit}
                  onChange={(e) => setMergeCommit(e.target.value)}
                />
              </>
            )}
            <p className="m-0 text-xs text-muted-foreground">
              Optional. Tasks does not check it, and none is needed to move the ticket.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!summary.trim() || !checks.trim()}
                onClick={() => void save()}
              >
                Save evidence
              </Button>
              {had && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </PageSection>
  );
}
