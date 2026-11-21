# 13. Evidence on a ticket is recorded and not checked

## Context

A ticket can hold evidence: what was done and how it was checked, such as a pull request or a merge commit.

## Decision

Evidence is written by whoever did the work. Tasks checks none of it, and none is needed to move a ticket. The type is in `src/tickets/tickets.ts` and the form in `page/evidence.tsx`.

## Consequences

Evidence is a statement by its author. Do not read it as proof, and do not make a move between columns depend on it.
